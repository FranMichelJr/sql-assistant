"""
Backend Flask de ByMes — agente de BI conversacional para PyMEs argentinas.
Autenticación JWT, notificaciones en tiempo real vía Socket.IO, CRUD del
negocio (ventas, productos, clientes, gastos) y el agente autónomo (agent.py).
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

import agent

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

DB_PATH = "bymes.db"
JWT_SECRET = os.environ.get("JWT_SECRET", "bymes-dev-secret-2026")
JWT_EXPIRY_HOURS = 8

# ── Usuarios hardcodeados ──────────────────────────────────────────────────

USERS = {
    "franmicheljr@gmail.com": {"hash": generate_password_hash("Junior22"),     "role": "dueno", "name": "Francisco"},
    "demo@bymes.ar":          {"hash": generate_password_hash("ByMesDemo26!"), "role": "demo",  "name": "Demo"},
}

DB_SCHEMA = """
Esquema de la base de datos de una PyME argentina (almacén/distribuidora):

TABLE categorias:
  id INTEGER PK, nombre TEXT, descripcion TEXT

TABLE productos:
  id INTEGER PK, nombre TEXT, categoria_id INTEGER FK->categorias.id,
  precio REAL, costo REAL, stock INTEGER, stock_minimo INTEGER, descripcion TEXT

TABLE clientes:
  id INTEGER PK, nombre TEXT, telefono TEXT, email TEXT, created_at TEXT (ISO datetime)

TABLE ventas:
  id INTEGER PK, cliente_id INTEGER FK->clientes.id,
  canal TEXT (mostrador|whatsapp|mercado_libre|reparto),
  estado TEXT (completada|pendiente|cancelada),
  total REAL, created_at TEXT (ISO datetime)

TABLE venta_items:
  id INTEGER PK, venta_id INTEGER FK->ventas.id,
  producto_id INTEGER FK->productos.id,
  cantidad INTEGER, precio_unitario REAL

TABLE gastos:
  id INTEGER PK, categoria TEXT (Alquiler|Sueldos|Servicios|Impuestos|Insumos|Otros),
  descripcion TEXT, monto REAL, created_at TEXT (ISO datetime)

Relaciones clave:
- Un cliente puede tener muchas ventas
- Una venta puede tener muchos venta_items
- Cada venta_item pertenece a un producto
- Cada producto pertenece a una categoria
- El margen de una venta es SUM((precio_unitario - productos.costo) * cantidad)
"""

SYSTEM_PROMPT = f"""Eres un experto en SQL que convierte preguntas en lenguaje natural
a consultas SQLite válidas y eficientes.

{DB_SCHEMA}

Reglas ESTRICTAS:
1. Responde ÚNICAMENTE con la consulta SQL, sin explicaciones, sin markdown, sin bloques de código.
2. Usa SQLite syntax (no MySQL ni PostgreSQL).
3. Para fechas usa: strftime('%Y-%m-%d', created_at)
4. Limita resultados a 50 filas por defecto con LIMIT 50 si no se especifica.
5. Si la pregunta es ambigua, infiere la consulta más razonable.
6. Solo genera SELECT statements. Nunca INSERT, UPDATE, DELETE ni DDL.
7. Si no puedes generar un SQL válido, devuelve exactamente: ERROR: <motivo>
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
    """Crea tablas que pueden faltar en una base de datos existente (idempotente)."""
    if not os.path.exists(DB_PATH):
        return
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS movimientos_stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            producto_id INTEGER NOT NULL,
            tipo TEXT NOT NULL,
            cantidad INTEGER NOT NULL,
            notas TEXT DEFAULT '',
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
    conn.execute("""
        CREATE TABLE IF NOT EXISTS agent_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            period_start TEXT NOT NULL,
            period_end TEXT NOT NULL,
            title TEXT NOT NULL,
            summary_md TEXT NOT NULL,
            kpis_json TEXT DEFAULT '{}',
            created_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS agent_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            related_notification_id INTEGER,
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

def push_notification(notif_type: str, title: str, message: str, data: dict | None = None) -> int | None:
    if not os.path.exists(DB_PATH):
        return None
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
        return notif_id
    except Exception:
        return None


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
@require_auth(roles=["dueno"])
def get_schema():
    return jsonify({"schema": DB_SCHEMA})


@app.route("/api/query", methods=["POST"])
@require_auth(roles=["dueno"])
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


# ── Categorías ─────────────────────────────────────────────────────────────

@app.route("/api/categorias", methods=["GET"])
@require_auth(roles=["dueno", "encargado", "demo"])
def list_categorias():
    return jsonify(db_all("SELECT * FROM categorias ORDER BY nombre"))


@app.route("/api/categorias", methods=["POST"])
@require_auth(roles=["dueno", "encargado"])
def create_categoria():
    d = request.get_json(silent=True) or {}
    nombre = (d.get("nombre") or "").strip()
    if not nombre:
        return jsonify({"error": "nombre requerido"}), 400
    desc = (d.get("descripcion") or "").strip()
    row_id = db_run("INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)", (nombre, desc))
    return jsonify({"id": row_id, "nombre": nombre, "descripcion": desc}), 201


@app.route("/api/categorias/<int:cid>", methods=["PUT"])
@require_auth(roles=["dueno", "encargado"])
def update_categoria(cid: int):
    d = request.get_json(silent=True) or {}
    db_run("UPDATE categorias SET nombre=?, descripcion=? WHERE id=?",
           ((d.get("nombre") or "").strip(), (d.get("descripcion") or "").strip(), cid))
    return jsonify({"ok": True})


@app.route("/api/categorias/<int:cid>", methods=["DELETE"])
@require_auth(roles=["dueno"])
def delete_categoria(cid: int):
    db_run("DELETE FROM categorias WHERE id=?", (cid,))
    return jsonify({"ok": True})


# ── Productos ──────────────────────────────────────────────────────────────

@app.route("/api/productos", methods=["GET"])
@require_auth(roles=["dueno", "encargado", "demo"])
def list_productos():
    rows = db_all("""
        SELECT p.*, c.nombre AS categoria_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        ORDER BY p.nombre
    """)
    return jsonify(rows)


@app.route("/api/productos", methods=["POST"])
@require_auth(roles=["dueno", "encargado"])
def create_producto():
    d = request.get_json(silent=True) or {}
    nombre = (d.get("nombre") or "").strip()
    if not nombre:
        return jsonify({"error": "nombre requerido"}), 400
    row_id = db_run(
        "INSERT INTO productos (nombre, categoria_id, precio, costo, stock, stock_minimo, descripcion) VALUES (?,?,?,?,?,?,?)",
        (nombre, d.get("categoria_id") or None, float(d.get("precio") or 0), float(d.get("costo") or 0),
         int(d.get("stock") or 0), int(d.get("stock_minimo") or 5), (d.get("descripcion") or "").strip()),
    )
    return jsonify({"id": row_id, **{k: d.get(k) for k in
                    ("nombre", "categoria_id", "precio", "costo", "stock", "stock_minimo", "descripcion")}}), 201


@app.route("/api/productos/<int:pid>", methods=["PUT"])
@require_auth(roles=["dueno", "encargado"])
def update_producto(pid: int):
    d = request.get_json(silent=True) or {}
    db_run(
        "UPDATE productos SET nombre=?, categoria_id=?, precio=?, costo=?, stock=?, stock_minimo=?, descripcion=? WHERE id=?",
        ((d.get("nombre") or "").strip(), d.get("categoria_id") or None,
         float(d.get("precio") or 0), float(d.get("costo") or 0), int(d.get("stock") or 0),
         int(d.get("stock_minimo") or 5), (d.get("descripcion") or "").strip(), pid),
    )
    return jsonify({"ok": True})


@app.route("/api/productos/<int:pid>", methods=["DELETE"])
@require_auth(roles=["dueno"])
def delete_producto(pid: int):
    db_run("DELETE FROM productos WHERE id=?", (pid,))
    return jsonify({"ok": True})


# ── Clientes ───────────────────────────────────────────────────────────────

@app.route("/api/clientes", methods=["GET"])
@require_auth(roles=["dueno", "encargado", "demo"])
def list_clientes():
    return jsonify(db_all("SELECT * FROM clientes ORDER BY nombre"))


@app.route("/api/clientes", methods=["POST"])
@require_auth(roles=["dueno", "encargado"])
def create_cliente():
    d = request.get_json(silent=True) or {}
    nombre = (d.get("nombre") or "").strip()
    if not nombre:
        return jsonify({"error": "nombre requerido"}), 400
    now = datetime.datetime.utcnow().isoformat()
    row_id = db_run(
        "INSERT INTO clientes (nombre, telefono, email, created_at) VALUES (?,?,?,?)",
        (nombre, (d.get("telefono") or "").strip(), (d.get("email") or "").strip(), now),
    )
    return jsonify({"id": row_id, "nombre": nombre, "telefono": d.get("telefono", ""),
                    "email": d.get("email", ""), "created_at": now}), 201


@app.route("/api/clientes/<int:cid>", methods=["PUT"])
@require_auth(roles=["dueno", "encargado"])
def update_cliente(cid: int):
    d = request.get_json(silent=True) or {}
    db_run(
        "UPDATE clientes SET nombre=?, telefono=?, email=? WHERE id=?",
        ((d.get("nombre") or "").strip(), (d.get("telefono") or "").strip(),
         (d.get("email") or "").strip(), cid),
    )
    return jsonify({"ok": True})


@app.route("/api/clientes/<int:cid>", methods=["DELETE"])
@require_auth(roles=["dueno"])
def delete_cliente(cid: int):
    db_run("DELETE FROM clientes WHERE id=?", (cid,))
    return jsonify({"ok": True})


# ── Ventas ─────────────────────────────────────────────────────────────────

@app.route("/api/ventas", methods=["GET"])
@require_auth(roles=["dueno", "encargado", "demo"])
def list_ventas():
    rows = db_all("""
        SELECT v.*, c.nombre AS cliente_nombre
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        ORDER BY v.created_at DESC
        LIMIT 200
    """)
    return jsonify(rows)


@app.route("/api/ventas", methods=["POST"])
@require_auth(roles=["dueno", "encargado"])
def create_venta():
    d = request.get_json(silent=True) or {}
    items = d.get("items", [])
    if not items:
        return jsonify({"error": "items requeridos"}), 400

    result = None
    venta_id = None
    cliente_nombre = ""
    low_stock_warnings: list[tuple[str, int, int]] = []

    conn = get_db_connection()
    try:
        total = sum(float(i.get("precio_unitario", 0)) * int(i.get("cantidad", 0)) for i in items)
        now = datetime.datetime.utcnow().isoformat()
        cur = conn.execute(
            "INSERT INTO ventas (cliente_id, canal, estado, total, created_at) VALUES (?, ?, 'completada', ?, ?)",
            (d.get("cliente_id"), d.get("canal", "mostrador"), total, now),
        )
        venta_id = cur.lastrowid
        for item in items:
            conn.execute(
                "INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
                (venta_id, item["producto_id"], int(item["cantidad"]), float(item["precio_unitario"])),
            )
            conn.execute(
                "UPDATE productos SET stock = MAX(0, stock - ?) WHERE id = ?",
                (int(item["cantidad"]), item["producto_id"]),
            )
        conn.commit()
        row = rows_to_dicts(conn.execute(
            "SELECT v.*, c.nombre AS cliente_nombre FROM ventas v "
            "LEFT JOIN clientes c ON v.cliente_id = c.id WHERE v.id = ?",
            (venta_id,),
        ))
        result = row[0]
        cliente_nombre = result.get("cliente_nombre") or "Consumidor final"
        for item in items:
            r = conn.execute("SELECT nombre, stock, stock_minimo FROM productos WHERE id = ?",
                             (item["producto_id"],)).fetchone()
            if r and r[1] <= r[2]:
                low_stock_warnings.append((r[0], r[1], item["producto_id"]))
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

    push_notification("nueva_venta", "Nueva Venta",
                      f"Venta #{venta_id} · {cliente_nombre} · ${total:,.2f}",
                      {"venta_id": venta_id})
    for nombre, stock, pid in low_stock_warnings:
        push_notification("stock_bajo", "Stock Bajo",
                          f"'{nombre}' tiene solo {stock} unidades",
                          {"producto_id": pid})

    return jsonify(result), 201


@app.route("/api/ventas/<int:vid>", methods=["GET"])
@require_auth(roles=["dueno", "encargado", "demo"])
def get_venta(vid: int):
    conn = get_db_connection()
    try:
        ventas = rows_to_dicts(conn.execute(
            "SELECT v.*, c.nombre AS cliente_nombre FROM ventas v "
            "LEFT JOIN clientes c ON v.cliente_id = c.id WHERE v.id = ?",
            (vid,),
        ))
        if not ventas:
            return jsonify({"error": "Venta no encontrada"}), 404
        venta = ventas[0]
        venta["items"] = rows_to_dicts(conn.execute(
            "SELECT vi.*, p.nombre AS producto_nombre "
            "FROM venta_items vi JOIN productos p ON vi.producto_id = p.id WHERE vi.venta_id = ?",
            (vid,),
        ))
        return jsonify(venta)
    finally:
        conn.close()


@app.route("/api/ventas/<int:vid>", methods=["PUT"])
@require_auth(roles=["dueno", "encargado"])
def update_venta(vid: int):
    d = request.get_json(silent=True) or {}
    allowed = {"estado", "total"}
    fields = {k: v for k, v in d.items() if k in allowed}
    if not fields:
        return jsonify({"error": "Sin campos válidos"}), 400
    set_clause = ", ".join(f"{k}=?" for k in fields)
    db_run(f"UPDATE ventas SET {set_clause} WHERE id=?", (*fields.values(), vid))

    if "estado" in fields:
        labels = {"pendiente": "Pendiente", "completada": "Completada", "cancelada": "Cancelada"}
        label = labels.get(fields["estado"], fields["estado"])
        push_notification(
            "cambio_estado", "Cambio de Estado",
            f"Venta #{vid} cambió a {label}",
            {"venta_id": vid, "estado": fields["estado"]},
        )
    return jsonify({"ok": True})


@app.route("/api/ventas/<int:vid>", methods=["DELETE"])
@require_auth(roles=["dueno"])
def delete_venta(vid: int):
    db_run("DELETE FROM ventas WHERE id=?", (vid,))
    return jsonify({"ok": True})


# ── Gastos ─────────────────────────────────────────────────────────────────

@app.route("/api/gastos", methods=["GET"])
@require_auth(roles=["dueno"])
def list_gastos():
    return jsonify(db_all("SELECT * FROM gastos ORDER BY created_at DESC LIMIT 200"))


@app.route("/api/gastos", methods=["POST"])
@require_auth(roles=["dueno"])
def create_gasto():
    d = request.get_json(silent=True) or {}
    categoria = (d.get("categoria") or "").strip()
    descripcion = (d.get("descripcion") or "").strip()
    if not categoria or not descripcion:
        return jsonify({"error": "categoria y descripcion requeridos"}), 400
    now = datetime.datetime.utcnow().isoformat()
    row_id = db_run(
        "INSERT INTO gastos (categoria, descripcion, monto, created_at) VALUES (?,?,?,?)",
        (categoria, descripcion, float(d.get("monto") or 0), now),
    )
    return jsonify({"id": row_id, "categoria": categoria, "descripcion": descripcion,
                    "monto": d.get("monto", 0), "created_at": now}), 201


@app.route("/api/gastos/<int:gid>", methods=["PUT"])
@require_auth(roles=["dueno"])
def update_gasto(gid: int):
    d = request.get_json(silent=True) or {}
    db_run(
        "UPDATE gastos SET categoria=?, descripcion=?, monto=? WHERE id=?",
        ((d.get("categoria") or "").strip(), (d.get("descripcion") or "").strip(),
         float(d.get("monto") or 0), gid),
    )
    return jsonify({"ok": True})


@app.route("/api/gastos/<int:gid>", methods=["DELETE"])
@require_auth(roles=["dueno"])
def delete_gasto(gid: int):
    db_run("DELETE FROM gastos WHERE id=?", (gid,))
    return jsonify({"ok": True})


# ── Movimientos de stock ───────────────────────────────────────────────────

@app.route("/api/productos/<int:pid>/movimientos", methods=["GET"])
@require_auth(roles=["dueno", "encargado"])
def get_movimientos_stock(pid: int):
    return jsonify(db_all(
        "SELECT * FROM movimientos_stock WHERE producto_id = ? ORDER BY created_at DESC LIMIT 100",
        (pid,),
    ))


@app.route("/api/productos/<int:pid>/movimientos", methods=["POST"])
@require_auth(roles=["dueno", "encargado"])
def add_movimiento_stock(pid: int):
    d = request.get_json(silent=True) or {}
    tipo = d.get("tipo", "")
    qty = int(d.get("cantidad", 0))
    notas = (d.get("notas") or "").strip()
    user_email = request.current_user.get("email", "")

    if tipo not in ("entrada", "salida"):
        return jsonify({"error": "tipo debe ser 'entrada' o 'salida'"}), 400
    if qty <= 0:
        return jsonify({"error": "cantidad debe ser mayor a 0"}), 400

    new_stock = None
    stock_minimo = None
    nombre = ""

    conn = get_db_connection()
    try:
        now = datetime.datetime.utcnow().isoformat()
        if tipo == "entrada":
            conn.execute("UPDATE productos SET stock = stock + ? WHERE id = ?", (qty, pid))
        else:
            conn.execute("UPDATE productos SET stock = MAX(0, stock - ?) WHERE id = ?", (qty, pid))
        cur = conn.execute(
            "INSERT INTO movimientos_stock (producto_id, tipo, cantidad, notas, user_email, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (pid, tipo, qty, notas, user_email, now),
        )
        conn.commit()
        row = conn.execute("SELECT nombre, stock, stock_minimo FROM productos WHERE id = ?", (pid,)).fetchone()
        if row:
            nombre, new_stock, stock_minimo = row[0], row[1], row[2]
        mov_id = cur.lastrowid
    finally:
        conn.close()

    if new_stock is not None and stock_minimo is not None and new_stock <= stock_minimo:
        push_notification(
            "stock_bajo", "Stock Bajo",
            f"'{nombre}' tiene solo {new_stock} unidades",
            {"producto_id": pid},
        )

    return jsonify({"id": mov_id, "new_stock": new_stock}), 201


# ── Reportes ───────────────────────────────────────────────────────────────

@app.route("/api/reports/ventas", methods=["GET"])
@require_auth(roles=["dueno", "encargado", "demo"])
def report_ventas():
    period = request.args.get("period", "month")
    if period == "week":
        group_fmt, date_filter = "%Y-%m-%d", "AND created_at >= date('now', '-8 days')"
    elif period == "year":
        group_fmt, date_filter = "%Y-%m", "AND created_at >= date('now', '-2 years')"
    else:
        group_fmt, date_filter = "%Y-%m-%d", "AND created_at >= date('now', '-30 days')"

    conn = get_db_connection()
    try:
        ventas = rows_to_dicts(conn.execute(
            f"SELECT strftime('{group_fmt}', created_at) AS period, "
            "COUNT(*) AS ventas, SUM(total) AS revenue "
            f"FROM ventas WHERE estado != 'cancelada' {date_filter} "
            "GROUP BY period ORDER BY period"
        ))
        for row in ventas:
            row["revenue"] = float(row["revenue"] or 0)
        summary = conn.execute(
            "SELECT COUNT(*), COALESCE(SUM(total), 0) FROM ventas WHERE estado != 'cancelada'"
        ).fetchone()
        return jsonify({"data": ventas, "total_ventas": summary[0], "total_revenue": float(summary[1])})
    finally:
        conn.close()


@app.route("/api/reports/productos", methods=["GET"])
@require_auth(roles=["dueno", "encargado", "demo"])
def report_productos():
    conn = get_db_connection()
    try:
        data = rows_to_dicts(conn.execute("""
            SELECT p.id, p.nombre AS nombre, c.nombre AS categoria,
                   COALESCE(SUM(vi.cantidad), 0) AS unidades_vendidas,
                   COALESCE(SUM(vi.cantidad * vi.precio_unitario), 0) AS revenue,
                   p.precio, p.stock
            FROM productos p
            LEFT JOIN venta_items vi ON p.id = vi.producto_id
            LEFT JOIN ventas v ON vi.venta_id = v.id AND v.estado != 'cancelada'
            LEFT JOIN categorias c ON p.categoria_id = c.id
            GROUP BY p.id, p.nombre, p.precio, p.stock, c.nombre
            ORDER BY revenue DESC
            LIMIT 50
        """))
        for row in data:
            row["revenue"] = float(row["revenue"] or 0)
            row["precio"] = float(row["precio"] or 0)
        return jsonify(data)
    finally:
        conn.close()


# ── Notifications ──────────────────────────────────────────────────────────

@app.route("/api/notifications", methods=["GET"])
@require_auth()
def get_notifications():
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
@require_auth(roles=["dueno", "encargado", "demo"])
def dashboard():
    conn = get_db_connection()
    try:
        ventas_hoy = conn.execute(
            "SELECT COALESCE(SUM(total), 0), COUNT(*) FROM ventas "
            "WHERE estado != 'cancelada' AND date(created_at) = date('now')"
        ).fetchone()
        ventas_semana = conn.execute(
            "SELECT COALESCE(SUM(total), 0), COUNT(*) FROM ventas "
            "WHERE estado != 'cancelada' AND created_at >= date('now', '-7 days')"
        ).fetchone()
        ventas_mes = conn.execute(
            "SELECT COALESCE(SUM(total), 0), COUNT(*) FROM ventas "
            "WHERE estado != 'cancelada' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
        ).fetchone()
        gastos_mes = conn.execute(
            "SELECT COALESCE(SUM(monto), 0) FROM gastos "
            "WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
        ).fetchone()[0]
        margen_mes = conn.execute(
            "SELECT COALESCE(SUM((vi.precio_unitario - p.costo) * vi.cantidad), 0) "
            "FROM venta_items vi JOIN productos p ON vi.producto_id = p.id "
            "JOIN ventas v ON vi.venta_id = v.id "
            "WHERE v.estado != 'cancelada' AND strftime('%Y-%m', v.created_at) = strftime('%Y-%m', 'now')"
        ).fetchone()[0]
        stock_critico = conn.execute(
            "SELECT COUNT(*) FROM productos WHERE stock <= stock_minimo"
        ).fetchone()[0]
        total_clientes = conn.execute("SELECT COUNT(*) FROM clientes").fetchone()[0]
        ventas_por_dia = rows_to_dicts(conn.execute("""
            SELECT date(created_at) AS dia, SUM(total) AS total, COUNT(*) AS ventas
            FROM ventas
            WHERE estado != 'cancelada' AND created_at >= date('now', '-30 days')
            GROUP BY dia ORDER BY dia
        """))
        for row in ventas_por_dia:
            row["total"] = float(row["total"] or 0)
        top_productos = rows_to_dicts(conn.execute("""
            SELECT p.nombre, SUM(vi.cantidad) AS unidades_vendidas,
                   SUM(vi.cantidad * vi.precio_unitario) AS revenue
            FROM venta_items vi
            JOIN productos p ON vi.producto_id = p.id
            JOIN ventas v ON vi.venta_id = v.id
            WHERE v.estado != 'cancelada'
            GROUP BY p.id, p.nombre ORDER BY unidades_vendidas DESC LIMIT 5
        """))
        ventas_recientes = rows_to_dicts(conn.execute("""
            SELECT v.id, c.nombre AS cliente_nombre, v.canal, v.estado, v.total, v.created_at
            FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id
            ORDER BY v.created_at DESC LIMIT 10
        """))
        productos_stock_critico = rows_to_dicts(conn.execute("""
            SELECT id, nombre, stock, stock_minimo FROM productos
            WHERE stock <= stock_minimo ORDER BY stock ASC LIMIT 10
        """))
        return jsonify({
            "ventas_hoy": {"total": float(ventas_hoy[0]), "cantidad": int(ventas_hoy[1])},
            "ventas_semana": {"total": float(ventas_semana[0]), "cantidad": int(ventas_semana[1])},
            "ventas_mes": {"total": float(ventas_mes[0]), "cantidad": int(ventas_mes[1])},
            "gastos_mes": float(gastos_mes),
            "margen_mes": float(margen_mes),
            "stock_critico_count": int(stock_critico),
            "total_clientes": int(total_clientes),
            "ventas_por_dia": ventas_por_dia,
            "top_productos": top_productos,
            "ventas_recientes": ventas_recientes,
            "productos_stock_critico": productos_stock_critico,
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


# ── Agente autónomo (agent.py) ────────────────────────────────────────────

agent.register(app, socketio, agent.Deps(
    get_db_connection=get_db_connection,
    db_all=db_all,
    db_run=db_run,
    push_notification=push_notification,
    get_anthropic_client=get_anthropic_client,
    require_auth=require_auth,
    execute_query=execute_query,
    db_path=DB_PATH,
    db_schema=DB_SCHEMA,
))


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    socketio.run(app, host='0.0.0.0', port=port, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)
