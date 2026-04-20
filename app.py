"""
Flask backend para SQL Assistant con autenticación JWT y notificaciones en tiempo real.
"""
import os
import json
import sqlite3
import datetime
from functools import wraps

import jwt
import anthropic
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "socketio-dev-secret")
CORS(app, origins="*")
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
    logger=False,
    engineio_logger=False,
)

DB_PATH = "ecommerce.db"
JWT_SECRET = os.environ.get("JWT_SECRET", "sql-assistant-dev-secret-2024")
JWT_EXPIRY_HOURS = 8

# ── Usuarios hardcodeados ──────────────────────────────────────────────────

USERS = {
    "admin@sql.com":    {"hash": generate_password_hash("admin123"),    "role": "admin",       "name": "Admin"},
    "vendedor@sql.com": {"hash": generate_password_hash("vendedor123"), "role": "vendedor",    "name": "Vendedor"},
    "bodega@sql.com":   {"hash": generate_password_hash("bodega123"),   "role": "bodega",      "name": "Bodega"},
    "demo@sql.com":     {"hash": generate_password_hash("demo123"),     "role": "espectador",  "name": "Demo"},
}

ROLE_ROUTES = {
    "admin":      {"dashboard", "query", "products", "customers", "orders", "categories", "lowstock"},
    "vendedor":   {"dashboard", "orders", "customers"},
    "bodega":     {"products", "categories", "lowstock"},
    "espectador": {"dashboard", "query", "products", "customers", "orders"},
}

DB_SCHEMA = """
Esquema de la base de datos de e-commerce:

TABLE categories:
  id INTEGER PK, name TEXT, description TEXT

TABLE customers:
  id INTEGER PK, first_name TEXT, last_name TEXT, email TEXT UNIQUE,
  phone TEXT, city TEXT, country TEXT, created_at TEXT (ISO datetime)

TABLE products:
  id INTEGER PK, name TEXT, category_id INTEGER FK->categories.id,
  price REAL, stock INTEGER, description TEXT

TABLE orders:
  id INTEGER PK, customer_id INTEGER FK->customers.id,
  status TEXT (pending|processing|shipped|delivered|cancelled),
  total REAL, created_at TEXT (ISO datetime)

TABLE order_items:
  id INTEGER PK, order_id INTEGER FK->orders.id,
  product_id INTEGER FK->products.id,
  quantity INTEGER, unit_price REAL

Relaciones clave:
- Un customer puede tener muchos orders
- Un order puede tener muchos order_items
- Cada order_item pertenece a un product
- Cada product pertenece a una category
"""

SYSTEM_PROMPT = f"""Eres un experto en SQL que convierte preguntas en lenguaje natural
a consultas SQLite válidas y eficientes.

{DB_SCHEMA}

Reglas ESTRICTAS:
1. Responde ÚNICAMENTE con la consulta SQL, sin explicaciones, sin markdown, sin bloques de código.
2. Usa SQLite syntax (no MySQL ni PostgreSQL).
3. Concatena nombres con: first_name || ' ' || last_name
4. Para fechas usa: strftime('%Y-%m-%d', created_at)
5. Limita resultados a 50 filas por defecto con LIMIT 50 si no se especifica.
6. Si la pregunta es ambigua, infiere la consulta más razonable.
7. Solo genera SELECT statements. Nunca INSERT, UPDATE, DELETE ni DDL.
8. Si no puedes generar un SQL válido, devuelve exactamente: ERROR: <motivo>
"""

_anthropic_client = None


def get_anthropic_client() -> anthropic.Anthropic:
    global _anthropic_client
    if _anthropic_client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY no configurada")
        _anthropic_client = anthropic.Anthropic(api_key=api_key)
    return _anthropic_client


def get_db_connection() -> sqlite3.Connection:
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Base de datos '{DB_PATH}' no encontrada. Ejecuta setup_db.py primero.")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def natural_to_sql(question: str) -> str:
    client = get_anthropic_client()
    sql_parts = []
    with client.messages.stream(
        model="claude-opus-4-7",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": question}],
        thinking={"type": "adaptive"},
    ) as stream:
        for event in stream:
            if event.type == "content_block_delta" and hasattr(event.delta, "text"):
                sql_parts.append(event.delta.text)
    return "".join(sql_parts).strip()


def ensure_tables():
    if not os.path.exists(DB_PATH):
        return
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS stock_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            notes TEXT DEFAULT '',
            user_email TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            data TEXT DEFAULT '{}',
            read INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

ensure_tables()


def execute_query(sql: str) -> tuple[list[list], list[str]]:
    conn = get_db_connection()
    try:
        cur = conn.execute(sql)
        columns = [desc[0] for desc in cur.description] if cur.description else []
        rows = []
        for row in cur.fetchall():
            rows.append([row[col] for col in columns])
        return rows, columns
    finally:
        conn.close()


# ── Notifications helper ───────────────────────────────────────────────────

def push_notification(notif_type: str, title: str, message: str, data: dict | None = None) -> None:
    if not os.path.exists(DB_PATH):
        return
    try:
        conn = sqlite3.connect(DB_PATH)
        now = datetime.datetime.utcnow().isoformat()
        cur = conn.execute(
            "INSERT INTO notifications (type, title, message, data, read, created_at) VALUES (?, ?, ?, ?, 0, ?)",
            (notif_type, title, message, json.dumps(data or {}), now),
        )
        conn.commit()
        notif_id = cur.lastrowid
        conn.close()
        notif = {
            "id": notif_id,
            "type": notif_type,
            "title": title,
            "message": message,
            "data": data or {},
            "read": False,
            "created_at": now,
        }
        socketio.emit("notification", notif)
    except Exception:
        pass


# ── JWT helpers ────────────────────────────────────────────────────────────

def make_token(email: str, user: dict) -> str:
    payload = {
        "email": email,
        "name": user["name"],
        "role": user["role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def require_auth(roles: list[str] | None = None):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"error": "Token requerido"}), 401
            token = auth_header[7:]
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token expirado"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Token inválido"}), 401
            if roles and payload.get("role") not in roles:
                return jsonify({"error": "Sin permisos para este recurso"}), 403
            request.current_user = payload
            return f(*args, **kwargs)
        return decorated
    return decorator


# ── Auth endpoint ──────────────────────────────────────────────────────────

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = USERS.get(email)
    if not user or not check_password_hash(user["hash"], password):
        return jsonify({"error": "Credenciales incorrectas"}), 401

    token = make_token(email, user)
    return jsonify({
        "token": token,
        "user": {"email": email, "name": user["name"], "role": user["role"]},
    })


@app.route("/api/change-password", methods=["POST"])
@require_auth()
def change_password():
    data = request.get_json(silent=True) or {}
    current = data.get("current_password") or ""
    new_pw  = data.get("new_password") or ""
    email   = request.current_user.get("email", "")
    user    = USERS.get(email)
    if not user or not check_password_hash(user["hash"], current):
        return jsonify({"error": "Contraseña actual incorrecta"}), 400
    if len(new_pw) < 6:
        return jsonify({"error": "La nueva contraseña debe tener al menos 6 caracteres"}), 400
    USERS[email]["hash"] = generate_password_hash(new_pw)
    return jsonify({"ok": True})


# ── Endpoints ──────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return {'status': 'ok'}, 200

@app.route("/api/health", methods=["GET"])
def health():
    db_ok = os.path.exists(DB_PATH)
    api_ok = bool(os.environ.get("ANTHROPIC_API_KEY"))
    return jsonify({
        "status": "ok" if (db_ok and api_ok) else "degraded",
        "db": db_ok,
        "api_key": api_ok,
    })


@app.route("/api/schema", methods=["GET"])
@require_auth(roles=["admin"])
def get_schema():
    return jsonify({"schema": DB_SCHEMA})


@app.route("/api/query", methods=["POST"])
@require_auth(roles=["admin", "espectador"])
def query():
    data = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()

    if not question:
        return jsonify({"success": False, "error": "La pregunta no puede estar vacía."}), 400

    try:
        sql = natural_to_sql(question)
    except RuntimeError as e:
        return jsonify({"success": False, "sql": None, "error": str(e)}), 500
    except anthropic.APIError as e:
        return jsonify({"success": False, "sql": None, "error": f"Error de API Anthropic: {e}"}), 502

    if sql.startswith("ERROR:"):
        return jsonify({"success": False, "sql": None, "error": sql[6:].strip()})

    try:
        rows, columns = execute_query(sql)
        return jsonify({
            "success": True, "sql": sql,
            "columns": columns, "rows": rows, "row_count": len(rows),
        })
    except FileNotFoundError as e:
        return jsonify({"success": False, "sql": sql, "error": str(e)}), 500
    except sqlite3.Error as e:
        return jsonify({"success": False, "sql": sql, "error": f"Error SQL: {e}"})


# ── CRUD helpers ───────────────────────────────────────────────────────────

def rows_to_dicts(cur: sqlite3.Cursor) -> list[dict]:
    cols = [d[0] for d in cur.description] if cur.description else []
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def db_all(sql: str, params: tuple = ()) -> list[dict]:
    conn = get_db_connection()
    try:
        return rows_to_dicts(conn.execute(sql, params))
    finally:
        conn.close()


def db_run(sql: str, params: tuple = ()) -> int:
    conn = get_db_connection()
    try:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid or cur.rowcount
    finally:
        conn.close()


# ── Categories ─────────────────────────────────────────────────────────────

@app.route("/api/categories", methods=["GET"])
@require_auth(roles=["admin", "bodega", "espectador"])
def list_categories():
    return jsonify(db_all("SELECT * FROM categories ORDER BY name"))


@app.route("/api/categories", methods=["POST"])
@require_auth(roles=["admin", "bodega"])
def create_category():
    d = request.get_json(silent=True) or {}
    name = (d.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name requerido"}), 400
    desc = (d.get("description") or "").strip()
    row_id = db_run("INSERT INTO categories (name, description) VALUES (?, ?)", (name, desc))
    return jsonify({"id": row_id, "name": name, "description": desc}), 201


@app.route("/api/categories/<int:cid>", methods=["PUT"])
@require_auth(roles=["admin", "bodega"])
def update_category(cid: int):
    d = request.get_json(silent=True) or {}
    db_run("UPDATE categories SET name=?, description=? WHERE id=?",
           ((d.get("name") or "").strip(), (d.get("description") or "").strip(), cid))
    return jsonify({"ok": True})


@app.route("/api/categories/<int:cid>", methods=["DELETE"])
@require_auth(roles=["admin"])
def delete_category(cid: int):
    db_run("DELETE FROM categories WHERE id=?", (cid,))
    return jsonify({"ok": True})


# ── Products ───────────────────────────────────────────────────────────────

@app.route("/api/products", methods=["GET"])
@require_auth(roles=["admin", "bodega", "espectador"])
def list_products():
    rows = db_all("""
        SELECT p.*, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.name
    """)
    return jsonify(rows)


@app.route("/api/products", methods=["POST"])
@require_auth(roles=["admin", "bodega"])
def create_product():
    d = request.get_json(silent=True) or {}
    name = (d.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name requerido"}), 400
    row_id = db_run(
        "INSERT INTO products (name, category_id, price, stock, description) VALUES (?,?,?,?,?)",
        (name, d.get("category_id") or None, float(d.get("price") or 0),
         int(d.get("stock") or 0), (d.get("description") or "").strip()),
    )
    return jsonify({"id": row_id, **{k: d.get(k) for k in ("name","category_id","price","stock","description")}}), 201


@app.route("/api/products/<int:pid>", methods=["PUT"])
@require_auth(roles=["admin", "bodega"])
def update_product(pid: int):
    d = request.get_json(silent=True) or {}
    db_run(
        "UPDATE products SET name=?, category_id=?, price=?, stock=?, description=? WHERE id=?",
        ((d.get("name") or "").strip(), d.get("category_id") or None,
         float(d.get("price") or 0), int(d.get("stock") or 0),
         (d.get("description") or "").strip(), pid),
    )
    return jsonify({"ok": True})


@app.route("/api/products/<int:pid>", methods=["DELETE"])
@require_auth(roles=["admin", "bodega"])
def delete_product(pid: int):
    db_run("DELETE FROM products WHERE id=?", (pid,))
    return jsonify({"ok": True})


# ── Customers ──────────────────────────────────────────────────────────────

@app.route("/api/customers", methods=["GET"])
@require_auth(roles=["admin", "vendedor", "espectador"])
def list_customers():
    return jsonify(db_all("SELECT * FROM customers ORDER BY first_name, last_name"))


@app.route("/api/customers", methods=["POST"])
@require_auth(roles=["admin", "vendedor"])
def create_customer():
    d = request.get_json(silent=True) or {}
    first = (d.get("first_name") or "").strip()
    if not first:
        return jsonify({"error": "first_name requerido"}), 400
    now = datetime.datetime.utcnow().isoformat()
    row_id = db_run(
        "INSERT INTO customers (first_name, last_name, email, phone, city, country, created_at) VALUES (?,?,?,?,?,?,?)",
        (first, (d.get("last_name") or "").strip(), (d.get("email") or "").strip(),
         (d.get("phone") or "").strip(), (d.get("city") or "").strip(),
         (d.get("country") or "").strip(), now),
    )
    return jsonify({"id": row_id, **{k: d.get(k, "") for k in
                    ("first_name","last_name","email","phone","city","country")},
                    "created_at": now}), 201


@app.route("/api/customers/<int:cid>", methods=["PUT"])
@require_auth(roles=["admin", "vendedor"])
def update_customer(cid: int):
    d = request.get_json(silent=True) or {}
    db_run(
        "UPDATE customers SET first_name=?, last_name=?, email=?, phone=?, city=?, country=? WHERE id=?",
        ((d.get("first_name") or "").strip(), (d.get("last_name") or "").strip(),
         (d.get("email") or "").strip(), (d.get("phone") or "").strip(),
         (d.get("city") or "").strip(), (d.get("country") or "").strip(), cid),
    )
    return jsonify({"ok": True})


@app.route("/api/customers/<int:cid>", methods=["DELETE"])
@require_auth(roles=["admin"])
def delete_customer(cid: int):
    db_run("DELETE FROM customers WHERE id=?", (cid,))
    return jsonify({"ok": True})


# ── Orders ─────────────────────────────────────────────────────────────────

@app.route("/api/orders", methods=["GET"])
@require_auth(roles=["admin", "vendedor", "espectador"])
def list_orders():
    rows = db_all("""
        SELECT o.*, c.first_name || ' ' || c.last_name AS customer_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        ORDER BY o.created_at DESC
    """)
    return jsonify(rows)


@app.route("/api/orders", methods=["POST"])
@require_auth(roles=["admin", "vendedor"])
def create_order():
    d = request.get_json(silent=True) or {}
    customer_id = d.get("customer_id")
    items = d.get("items", [])
    if not customer_id or not items:
        return jsonify({"error": "customer_id e items requeridos"}), 400

    result = None
    order_id = None
    customer_name = ""
    low_stock_warnings: list[tuple[str, int, int]] = []

    conn = get_db_connection()
    try:
        total = sum(float(i.get("unit_price", 0)) * int(i.get("quantity", 0)) for i in items)
        now = datetime.datetime.utcnow().isoformat()
        cur = conn.execute(
            "INSERT INTO orders (customer_id, status, total, created_at) VALUES (?, 'pending', ?, ?)",
            (customer_id, total, now),
        )
        order_id = cur.lastrowid
        for item in items:
            conn.execute(
                "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
                (order_id, item["product_id"], int(item["quantity"]), float(item["unit_price"])),
            )
            conn.execute(
                "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?",
                (int(item["quantity"]), item["product_id"]),
            )
        conn.commit()
        row = rows_to_dicts(conn.execute(
            "SELECT o.*, c.first_name || ' ' || c.last_name AS customer_name "
            "FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = ?",
            (order_id,),
        ))
        result = row[0]
        customer_name = result.get("customer_name") or f"Cliente #{customer_id}"
        # Check low stock while connection is open
        for item in items:
            r = conn.execute("SELECT name, stock FROM products WHERE id = ?",
                             (item["product_id"],)).fetchone()
            if r and r[1] < 10:
                low_stock_warnings.append((r[0], r[1], item["product_id"]))
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

    # Emit after DB closed
    push_notification("new_order", "Nueva Orden",
                      f"Orden #{order_id} creada · {customer_name} · ${total:.2f}",
                      {"order_id": order_id})
    for name, stock, pid in low_stock_warnings:
        push_notification("low_stock", "Stock Bajo",
                          f"'{name}' tiene solo {stock} unidades",
                          {"product_id": pid})

    return jsonify(result), 201


@app.route("/api/orders/<int:oid>", methods=["GET"])
@require_auth(roles=["admin", "vendedor", "espectador"])
def get_order(oid: int):
    conn = get_db_connection()
    try:
        orders = rows_to_dicts(conn.execute(
            "SELECT o.*, c.first_name || ' ' || c.last_name AS customer_name "
            "FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = ?",
            (oid,),
        ))
        if not orders:
            return jsonify({"error": "Orden no encontrada"}), 404
        order = orders[0]
        order["items"] = rows_to_dicts(conn.execute(
            "SELECT oi.*, p.name AS product_name "
            "FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?",
            (oid,),
        ))
        return jsonify(order)
    finally:
        conn.close()


@app.route("/api/orders/<int:oid>", methods=["PUT"])
@require_auth(roles=["admin", "vendedor"])
def update_order(oid: int):
    d = request.get_json(silent=True) or {}
    allowed = {"status", "total"}
    fields = {k: v for k, v in d.items() if k in allowed}
    if not fields:
        return jsonify({"error": "Sin campos válidos"}), 400
    set_clause = ", ".join(f"{k}=?" for k in fields)
    db_run(f"UPDATE orders SET {set_clause} WHERE id=?", (*fields.values(), oid))

    if "status" in fields:
        status_labels = {
            "pending": "Pendiente", "processing": "Procesando",
            "shipped": "Enviado", "delivered": "Entregado", "cancelled": "Cancelado",
        }
        label = status_labels.get(fields["status"], fields["status"])
        push_notification(
            "status_change", "Cambio de Estado",
            f"Orden #{oid} cambió a {label}",
            {"order_id": oid, "status": fields["status"]},
        )
    return jsonify({"ok": True})


@app.route("/api/orders/<int:oid>", methods=["DELETE"])
@require_auth(roles=["admin"])
def delete_order(oid: int):
    db_run("DELETE FROM orders WHERE id=?", (oid,))
    return jsonify({"ok": True})


# ── Stock movements ────────────────────────────────────────────────────────

@app.route("/api/products/<int:pid>/movements", methods=["GET"])
@require_auth(roles=["admin", "bodega"])
def get_stock_movements(pid: int):
    ensure_tables()
    return jsonify(db_all(
        "SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC LIMIT 100",
        (pid,),
    ))


@app.route("/api/products/<int:pid>/movements", methods=["POST"])
@require_auth(roles=["admin", "bodega"])
def add_stock_movement(pid: int):
    ensure_tables()
    d = request.get_json(silent=True) or {}
    mov_type = d.get("type", "")
    qty = int(d.get("quantity", 0))
    notes = (d.get("notes") or "").strip()
    user_email = request.current_user.get("email", "")

    if mov_type not in ("entrada", "salida"):
        return jsonify({"error": "type debe ser 'entrada' o 'salida'"}), 400
    if qty <= 0:
        return jsonify({"error": "quantity debe ser mayor a 0"}), 400

    new_stock = None
    product_name = ""

    conn = get_db_connection()
    try:
        now = datetime.datetime.utcnow().isoformat()
        if mov_type == "entrada":
            conn.execute("UPDATE products SET stock = stock + ? WHERE id = ?", (qty, pid))
        else:
            conn.execute("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?", (qty, pid))
        cur = conn.execute(
            "INSERT INTO stock_movements (product_id, type, quantity, notes, user_email, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (pid, mov_type, qty, notes, user_email, now),
        )
        conn.commit()
        row = conn.execute("SELECT name, stock FROM products WHERE id = ?", (pid,)).fetchone()
        if row:
            product_name, new_stock = row[0], row[1]
        mov_id = cur.lastrowid
    finally:
        conn.close()

    if new_stock is not None and new_stock < 10:
        push_notification(
            "low_stock", "Stock Bajo",
            f"'{product_name}' tiene solo {new_stock} unidades",
            {"product_id": pid},
        )

    return jsonify({"id": mov_id, "new_stock": new_stock}), 201


# ── Reports ────────────────────────────────────────────────────────────────

@app.route("/api/reports/sales", methods=["GET"])
@require_auth(roles=["admin", "vendedor", "espectador"])
def report_sales():
    period = request.args.get("period", "month")
    if period == "week":
        group_fmt, date_filter = "%Y-%W", "AND created_at >= date('now', '-8 weeks')"
    elif period == "year":
        group_fmt, date_filter = "%Y-%m", "AND created_at >= date('now', '-2 years')"
    else:
        group_fmt, date_filter = "%Y-%m-%d", "AND created_at >= date('now', '-30 days')"

    conn = get_db_connection()
    try:
        sales = rows_to_dicts(conn.execute(
            f"SELECT strftime('{group_fmt}', created_at) AS period, "
            "COUNT(*) AS orders, SUM(total) AS revenue "
            f"FROM orders WHERE status != 'cancelled' {date_filter} "
            "GROUP BY period ORDER BY period"
        ))
        for row in sales:
            row["revenue"] = float(row["revenue"] or 0)
        summary = conn.execute(
            "SELECT COUNT(*), COALESCE(SUM(total), 0) FROM orders WHERE status != 'cancelled'"
        ).fetchone()
        return jsonify({"data": sales, "total_orders": summary[0], "total_revenue": float(summary[1])})
    finally:
        conn.close()


@app.route("/api/reports/products", methods=["GET"])
@require_auth(roles=["admin", "vendedor", "espectador"])
def report_products():
    conn = get_db_connection()
    try:
        data = rows_to_dicts(conn.execute("""
            SELECT p.id, p.name, c.name AS category,
                   COALESCE(SUM(oi.quantity), 0) AS units_sold,
                   COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue,
                   p.price, p.stock
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
            LEFT JOIN categories c ON p.category_id = c.id
            GROUP BY p.id, p.name, c.name, p.price, p.stock
            ORDER BY revenue DESC
            LIMIT 50
        """))
        for row in data:
            row["revenue"] = float(row["revenue"] or 0)
            row["price"] = float(row["price"] or 0)
        return jsonify(data)
    finally:
        conn.close()


# ── Notifications ──────────────────────────────────────────────────────────

@app.route("/api/notifications", methods=["GET"])
@require_auth()
def get_notifications():
    ensure_tables()
    rows = db_all("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50")
    for r in rows:
        r["read"] = bool(r["read"])
        try:
            r["data"] = json.loads(r["data"])
        except Exception:
            r["data"] = {}
    return jsonify(rows)


@app.route("/api/notifications/<int:nid>/read", methods=["PUT"])
@require_auth()
def mark_notification_read(nid: int):
    db_run("UPDATE notifications SET read = 1 WHERE id = ?", (nid,))
    return jsonify({"ok": True})


@app.route("/api/notifications/read-all", methods=["PUT"])
@require_auth()
def mark_all_notifications_read():
    db_run("UPDATE notifications SET read = 1")
    return jsonify({"ok": True})


# ── Dashboard ──────────────────────────────────────────────────────────────

@app.route("/api/dashboard", methods=["GET"])
@require_auth(roles=["admin", "vendedor", "espectador"])
def dashboard():
    conn = get_db_connection()
    try:
        total_sales = conn.execute(
            "SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'cancelled'"
        ).fetchone()[0]
        monthly_orders = conn.execute(
            "SELECT COUNT(*) FROM orders WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
        ).fetchone()[0]
        low_stock_count = conn.execute(
            "SELECT COUNT(*) FROM products WHERE stock < 10"
        ).fetchone()[0]
        total_customers = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
        sales_by_month = rows_to_dicts(conn.execute("""
            SELECT strftime('%Y-%m', created_at) AS month,
                   SUM(total) AS total, COUNT(*) AS orders
            FROM orders
            WHERE status != 'cancelled' AND created_at >= date('now', '-6 months')
            GROUP BY month ORDER BY month
        """))
        top_products = rows_to_dicts(conn.execute("""
            SELECT p.name, SUM(oi.quantity) AS units_sold,
                   SUM(oi.quantity * oi.unit_price) AS revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status != 'cancelled'
            GROUP BY p.id, p.name ORDER BY units_sold DESC LIMIT 5
        """))
        recent_orders = rows_to_dicts(conn.execute("""
            SELECT o.id, c.first_name || ' ' || c.last_name AS customer_name,
                   o.status, o.total, o.created_at
            FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
            ORDER BY o.created_at DESC LIMIT 10
        """))
        return jsonify({
            "total_sales": float(total_sales),
            "monthly_orders": int(monthly_orders),
            "low_stock_count": int(low_stock_count),
            "total_customers": int(total_customers),
            "sales_by_month": sales_by_month,
            "top_products": top_products,
            "recent_orders": recent_orders,
        })
    finally:
        conn.close()


# ── SocketIO events ────────────────────────────────────────────────────────

@socketio.on("connect")
def on_connect():
    pass


@socketio.on("disconnect")
def on_disconnect():
    pass


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    socketio.run(app, host='0.0.0.0', port=port, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)
