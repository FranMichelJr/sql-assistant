"""
Agente autónomo de BI de ByMes.

Calcula KPIs del negocio, detecta desvíos con reglas determinísticas (no le
delega esa decisión a Claude — la fiabilidad importa más que la creatividad
acá), redacta alertas y reportes semanales en lenguaje natural, y sostiene un
chat donde el dueño puede preguntar libremente con acceso de solo lectura a
la base de datos vía tool-use. Corre en background con APScheduler dentro
del mismo proceso Flask.
"""
import os
import json
import datetime
from dataclasses import dataclass
from typing import Callable, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from flask import request, jsonify

MODEL = "claude-opus-4-7"
MONITOR_INTERVAL_MINUTES = int(os.environ.get("AGENT_MONITOR_MINUTES", "20"))
REPORT_INTERVAL_HOURS = int(os.environ.get("AGENT_REPORT_HOURS", "168"))  # semanal


@dataclass
class Deps:
    get_db_connection: Callable
    db_all: Callable
    db_run: Callable
    push_notification: Callable
    get_anthropic_client: Callable
    require_auth: Callable
    execute_query: Callable
    db_path: str
    db_schema: str = ""


_deps: Optional[Deps] = None
_socketio = None
_scheduler: Optional[BackgroundScheduler] = None


# ── Helpers de lectura ──────────────────────────────────────────────────────

def _scalar(sql: str, params: tuple = ()):
    conn = _deps.get_db_connection()
    try:
        row = conn.execute(sql, params).fetchone()
        return row[0] if row else None
    finally:
        conn.close()


def _row(sql: str, params: tuple = ()) -> dict:
    conn = _deps.get_db_connection()
    try:
        cur = conn.execute(sql, params)
        cols = [d[0] for d in cur.description]
        r = cur.fetchone()
        return dict(zip(cols, r)) if r else {}
    finally:
        conn.close()


# ── KPIs y detección de anomalías ──────────────────────────────────────────

def compute_kpis() -> dict:
    ventas_semana_total = _scalar(
        "SELECT COALESCE(SUM(total),0) FROM ventas "
        "WHERE estado != 'cancelada' AND created_at >= date('now','-7 days')"
    ) or 0
    ventas_4sem_prev_total = _scalar(
        "SELECT COALESCE(SUM(total),0) FROM ventas WHERE estado != 'cancelada' "
        "AND created_at >= date('now','-35 days') AND created_at < date('now','-7 days')"
    ) or 0
    semana_anterior_avg = ventas_4sem_prev_total / 4.0

    gastos_mes_por_categoria = _deps.db_all(
        "SELECT categoria, SUM(monto) AS total FROM gastos "
        "WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') GROUP BY categoria"
    )
    gastos_prev_por_categoria = _deps.db_all(
        "SELECT categoria, AVG(monto_mensual) AS promedio FROM ("
        "  SELECT categoria, strftime('%Y-%m', created_at) AS mes, SUM(monto) AS monto_mensual"
        "  FROM gastos"
        "  WHERE strftime('%Y-%m', created_at) != strftime('%Y-%m', 'now')"
        "    AND created_at >= date('now', '-4 months')"
        "  GROUP BY categoria, mes"
        ") GROUP BY categoria"
    )
    productos_stock_critico = _deps.db_all(
        "SELECT id, nombre, stock, stock_minimo FROM productos "
        "WHERE stock <= stock_minimo ORDER BY stock ASC"
    )

    return {
        "ventas_semana_total": ventas_semana_total,
        "semana_anterior_avg": semana_anterior_avg,
        "gastos_mes_por_categoria": gastos_mes_por_categoria,
        "gastos_prev_por_categoria": gastos_prev_por_categoria,
        "productos_stock_critico": productos_stock_critico,
    }


def detect_anomalies(kpis: dict) -> list[dict]:
    anomalies: list[dict] = []

    semana_actual = kpis["ventas_semana_total"]
    semana_base = kpis["semana_anterior_avg"]
    if semana_base > 0 and semana_actual < 0.7 * semana_base:
        caida_pct = round((1 - semana_actual / semana_base) * 100, 1)
        anomalies.append({
            "type": "caida_ventas",
            "severity": "critical" if caida_pct >= 40 else "warning",
            "ventas_semana_actual": round(semana_actual, 2),
            "promedio_semanal_previo": round(semana_base, 2),
            "caida_pct": caida_pct,
        })

    for p in kpis["productos_stock_critico"]:
        anomalies.append({
            "type": "stock_critico",
            "severity": "critical" if p["stock"] == 0 else "warning",
            "producto": p["nombre"],
            "stock": p["stock"],
            "stock_minimo": p["stock_minimo"],
        })

    prev_by_cat = {g["categoria"]: (g["promedio"] or 0) for g in kpis["gastos_prev_por_categoria"]}
    for g in kpis["gastos_mes_por_categoria"]:
        prev = prev_by_cat.get(g["categoria"], 0)
        if prev > 0 and g["total"] > 1.4 * prev:
            anomalies.append({
                "type": "gasto_elevado",
                "severity": "warning",
                "categoria": g["categoria"],
                "monto_actual": round(g["total"], 2),
                "promedio_anterior": round(prev, 2),
            })

    return anomalies


# ── Redacción con Claude (con fallback determinístico si falla la API) ────

ALERT_SYSTEM_PROMPT = """Sos el agente de BI de ByMes. Le hablás directamente al dueño de una PyME
argentina en español rioplatense, tono cercano, directo, sin relleno. Te acaban de pasar una lista de
desvíos que detectaste automáticamente en el negocio (formato JSON). Redactá UN solo mensaje breve
(3 a 6 líneas) que:
- mencione los números concretos de cada desvío,
- proponga una hipótesis o causa probable si es razonable,
- termine con una pregunta o sugerencia accionable.
No uses markdown ni bullets — es un mensaje de chat en texto plano."""

REPORT_SYSTEM_PROMPT = """Sos el agente de BI de ByMes. Escribís el reporte semanal para el dueño de
una PyME argentina, en español rioplatense, tono cercano y profesional. Te paso los KPIs de la semana
en JSON. Devolvé markdown breve con esta estructura exacta:

## Resumen ejecutivo
(2-3 líneas)

### Lo que mejoró

### Lo que empeoró

### Recomendaciones
(2-3 puntos accionables)

Usá los números concretos que te paso. No inventes datos que no estén en el JSON."""

CHAT_SYSTEM_PROMPT = """Sos el agente de BI de ByMes, un asistente que ayuda al dueño de una PyME
argentina (almacén/distribuidora) a entender su negocio. Hablás en español rioplatense, tono cercano
y profesional, sin rodeos. Tenés acceso de solo lectura a la base de datos del negocio a través de la
herramienta run_sql — usala cuando necesites datos concretos para responder (no inventes números).

{schema}

Reglas:
- Solo podés ejecutar SELECT. Nunca INSERT/UPDATE/DELETE ni DDL.
- Si la pregunta no requiere datos, respondé directamente sin usar la herramienta.
- Sé breve: respuestas de pocas líneas, con números concretos cuando corresponda.
- Si detectás algo preocupante en los datos que consultaste, mencionalo aunque no te lo hayan preguntado.
"""

TOOLS = [{
    "name": "run_sql",
    "description": "Ejecuta una consulta SELECT de solo lectura sobre la base de datos del negocio "
                    "(SQLite) y devuelve columnas y filas.",
    "input_schema": {
        "type": "object",
        "properties": {
            "sql": {"type": "string", "description": "Consulta SQL SELECT válida en SQLite"},
        },
        "required": ["sql"],
    },
}]


def _fallback_alert_message(anomalies: list[dict]) -> str:
    partes = []
    for a in anomalies:
        if a["type"] == "caida_ventas":
            partes.append(
                f"Las ventas de esta semana (${a['ventas_semana_actual']:,.0f}) cayeron "
                f"{a['caida_pct']}% vs el promedio de las últimas semanas "
                f"(${a['promedio_semanal_previo']:,.0f})."
            )
        elif a["type"] == "stock_critico":
            partes.append(
                f"'{a['producto']}' tiene stock crítico: {a['stock']} unidades "
                f"(mínimo {a['stock_minimo']})."
            )
        elif a["type"] == "gasto_elevado":
            partes.append(
                f"El gasto en {a['categoria']} este mes (${a['monto_actual']:,.0f}) está "
                f"muy por encima del promedio (${a['promedio_anterior']:,.0f})."
            )
    return " ".join(partes) or "Encontré algunos desvíos en el negocio que quiero comentarte."


def _draft_alert_message(anomalies: list[dict]) -> str:
    try:
        client = _deps.get_anthropic_client()
    except RuntimeError:
        return _fallback_alert_message(anomalies)
    try:
        payload = json.dumps({"desvios": anomalies}, default=str, ensure_ascii=False)
        resp = client.messages.create(
            model=MODEL, max_tokens=500, system=ALERT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": payload}],
        )
        text = "".join(b.text for b in resp.content if b.type == "text").strip()
        return text or _fallback_alert_message(anomalies)
    except Exception:
        return _fallback_alert_message(anomalies)


def _fallback_report_md(ctx: dict) -> str:
    return (
        "## Resumen ejecutivo\n\n"
        f"Esta semana el negocio facturó ${ctx['ventas_semana_total']:,.0f} en "
        f"{ctx['ventas_semana_count']} ventas, contra ${ctx['ventas_prev_total']:,.0f} "
        f"({ctx['ventas_prev_count']} ventas) la semana anterior. Los gastos fueron "
        f"${ctx['gastos_semana']:,.0f} y el margen bruto estimado ${ctx['margen_semana']:,.0f}.\n\n"
        "### Lo que mejoró\n\n"
        f"Producto más vendido: {ctx['top_producto']}.\n\n"
        "### Lo que empeoró\n\n"
        f"Stock crítico en: {ctx['stock_critico_resumen']}.\n\n"
        "### Recomendaciones\n\n"
        "- Revisar reposición de los productos con stock crítico.\n"
        "- Comparar el gasto por categoría contra el mes anterior.\n"
    )


def _draft_report_md(ctx: dict) -> str:
    try:
        client = _deps.get_anthropic_client()
    except RuntimeError:
        return _fallback_report_md(ctx)
    try:
        payload = json.dumps(ctx, default=str, ensure_ascii=False)
        resp = client.messages.create(
            model=MODEL, max_tokens=1200, system=REPORT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": payload}],
        )
        text = "".join(b.text for b in resp.content if b.type == "text").strip()
        return text or _fallback_report_md(ctx)
    except Exception:
        return _fallback_report_md(ctx)


def _run_sql_tool(sql: str) -> dict:
    sql_stripped = (sql or "").strip().rstrip(";")
    if not sql_stripped.lower().startswith("select"):
        return {"error": "Solo se permiten consultas SELECT"}
    try:
        rows, columns = _deps.execute_query(sql_stripped)
        return {"columns": columns, "rows": rows[:50]}
    except Exception as e:
        return {"error": str(e)}


def _recent_chat_history(limit: int = 12) -> list[dict]:
    rows = _deps.db_all(
        "SELECT role, content FROM agent_messages ORDER BY created_at DESC LIMIT ?", (limit,)
    )
    rows.reverse()
    return [{"role": ("assistant" if r["role"] == "agent" else "user"), "content": r["content"]} for r in rows]


def _chat_completion(history: list[dict]) -> str:
    client = _deps.get_anthropic_client()
    system = CHAT_SYSTEM_PROMPT.format(schema=_deps.db_schema)
    messages = list(history)
    for _ in range(4):
        resp = client.messages.create(
            model=MODEL, max_tokens=1024, system=system, tools=TOOLS, messages=messages,
        )
        if resp.stop_reason != "tool_use":
            return "".join(b.text for b in resp.content if b.type == "text").strip()
        messages.append({"role": "assistant", "content": resp.content})
        tool_results = []
        for block in resp.content:
            if block.type == "tool_use" and block.name == "run_sql":
                result = _run_sql_tool(block.input.get("sql", ""))
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result, default=str, ensure_ascii=False),
                })
        messages.append({"role": "user", "content": tool_results})
    return "No pude terminar de investigar los datos. Probá reformular la pregunta."


# ── Ciclos autónomos ────────────────────────────────────────────────────────

def run_monitor_cycle() -> dict:
    kpis = compute_kpis()
    anomalies = detect_anomalies(kpis)
    if not anomalies:
        return {"anomalies": 0}

    message_text = _draft_alert_message(anomalies)
    severity = "critical" if any(a["severity"] == "critical" for a in anomalies) else "warning"
    title = "Alerta del agente" if severity == "critical" else "El agente encontró algo"

    notif_id = _deps.push_notification(
        "agent_alert", title, message_text[:180], {"severity": severity, "anomalies": anomalies},
    )
    now = datetime.datetime.utcnow().isoformat()
    msg_id = _deps.db_run(
        "INSERT INTO agent_messages (role, content, related_notification_id, created_at) "
        "VALUES ('agent', ?, ?, ?)",
        (message_text, notif_id, now),
    )
    if _socketio is not None:
        _socketio.emit("agent_message", {
            "id": msg_id, "role": "agent", "content": message_text,
            "related_notification_id": notif_id, "created_at": now,
        })
    return {"anomalies": len(anomalies), "message": message_text}


def generate_weekly_report() -> dict:
    period_end = datetime.datetime.now()
    period_start = period_end - datetime.timedelta(days=7)
    prev_start = period_start - datetime.timedelta(days=7)
    p_start_s = period_start.strftime("%Y-%m-%d")
    p_end_s = period_end.strftime("%Y-%m-%d")
    prev_start_s = prev_start.strftime("%Y-%m-%d")

    ventas_semana = _row(
        "SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS cantidad FROM ventas "
        "WHERE estado != 'cancelada' AND created_at >= ?", (p_start_s,),
    )
    ventas_prev = _row(
        "SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS cantidad FROM ventas "
        "WHERE estado != 'cancelada' AND created_at >= ? AND created_at < ?",
        (prev_start_s, p_start_s),
    )
    gastos_semana = _scalar("SELECT COALESCE(SUM(monto),0) FROM gastos WHERE created_at >= ?", (p_start_s,)) or 0
    margen_semana = _scalar(
        "SELECT COALESCE(SUM((vi.precio_unitario - p.costo) * vi.cantidad), 0) "
        "FROM venta_items vi JOIN productos p ON vi.producto_id = p.id "
        "JOIN ventas v ON vi.venta_id = v.id "
        "WHERE v.estado != 'cancelada' AND v.created_at >= ?", (p_start_s,),
    ) or 0
    top_productos = _deps.db_all(
        "SELECT p.nombre, SUM(vi.cantidad) AS unidades, SUM(vi.cantidad * vi.precio_unitario) AS revenue "
        "FROM venta_items vi JOIN productos p ON vi.producto_id = p.id "
        "JOIN ventas v ON vi.venta_id = v.id "
        "WHERE v.estado != 'cancelada' AND v.created_at >= ? "
        "GROUP BY p.id, p.nombre ORDER BY revenue DESC LIMIT 5",
        (p_start_s,),
    )
    stock_critico = _deps.db_all(
        "SELECT nombre, stock, stock_minimo FROM productos WHERE stock <= stock_minimo ORDER BY stock ASC"
    )
    gastos_por_categoria = _deps.db_all(
        "SELECT categoria, SUM(monto) AS total FROM gastos WHERE created_at >= ? GROUP BY categoria",
        (p_start_s,),
    )

    ctx = {
        "ventas_semana_total": ventas_semana.get("total", 0),
        "ventas_semana_count": ventas_semana.get("cantidad", 0),
        "ventas_prev_total": ventas_prev.get("total", 0),
        "ventas_prev_count": ventas_prev.get("cantidad", 0),
        "gastos_semana": gastos_semana,
        "margen_semana": margen_semana,
        "top_productos": top_productos,
        "stock_critico": stock_critico,
        "gastos_por_categoria": gastos_por_categoria,
        "top_producto": top_productos[0]["nombre"] if top_productos else "sin datos",
        "stock_critico_resumen": ", ".join(p["nombre"] for p in stock_critico) or "ninguno",
    }

    summary_md = _draft_report_md(ctx)
    title = f"Reporte semanal · {period_start.strftime('%d/%m')} al {period_end.strftime('%d/%m')}"
    now = datetime.datetime.utcnow().isoformat()
    report_id = _deps.db_run(
        "INSERT INTO agent_reports (period_start, period_end, title, summary_md, kpis_json, created_at) "
        "VALUES (?,?,?,?,?,?)",
        (p_start_s, p_end_s, title, summary_md, json.dumps(ctx, default=str, ensure_ascii=False), now),
    )
    notif_id = _deps.push_notification(
        "agent_report", "Nuevo reporte semanal", f"{title} ya está disponible.", {"report_id": report_id},
    )
    anuncio = (
        f"Terminé el {title.lower()}. Lo dejé en la sección de reportes — "
        f"{ctx['ventas_semana_count']} ventas por ${ctx['ventas_semana_total']:,.0f}."
    )
    msg_id = _deps.db_run(
        "INSERT INTO agent_messages (role, content, related_notification_id, created_at) "
        "VALUES ('agent', ?, ?, ?)",
        (anuncio, notif_id, now),
    )
    if _socketio is not None:
        _socketio.emit("agent_message", {
            "id": msg_id, "role": "agent", "content": anuncio,
            "related_notification_id": notif_id, "created_at": now,
        })
        _socketio.emit("agent_report", {"id": report_id, "title": title})

    return {"report_id": report_id, "title": title}


# ── Registro de rutas + scheduler ──────────────────────────────────────────

def register(app, socketio, deps: Deps) -> None:
    global _deps, _socketio, _scheduler
    _deps = deps
    _socketio = socketio

    @app.route("/api/agent/reports", methods=["GET"])
    @deps.require_auth(roles=["dueno", "encargado", "demo"])
    def list_agent_reports():
        return jsonify(deps.db_all(
            "SELECT id, period_start, period_end, title, created_at FROM agent_reports "
            "ORDER BY created_at DESC LIMIT 20"
        ))

    @app.route("/api/agent/reports/<int:rid>", methods=["GET"])
    @deps.require_auth(roles=["dueno", "encargado", "demo"])
    def get_agent_report(rid: int):
        rows = deps.db_all("SELECT * FROM agent_reports WHERE id = ?", (rid,))
        if not rows:
            return jsonify({"error": "Reporte no encontrado"}), 404
        report = rows[0]
        try:
            report["kpis"] = json.loads(report.pop("kpis_json") or "{}")
        except Exception:
            report["kpis"] = {}
        return jsonify(report)

    @app.route("/api/agent/messages", methods=["GET"])
    @deps.require_auth(roles=["dueno", "encargado", "demo"])
    def list_agent_messages():
        return jsonify(deps.db_all("SELECT * FROM agent_messages ORDER BY created_at ASC LIMIT 100"))

    @app.route("/api/agent/chat", methods=["POST"])
    @deps.require_auth(roles=["dueno", "encargado"])
    def agent_chat():
        d = request.get_json(silent=True) or {}
        user_message = (d.get("message") or "").strip()
        if not user_message:
            return jsonify({"error": "message requerido"}), 400

        now = datetime.datetime.utcnow().isoformat()
        deps.db_run(
            "INSERT INTO agent_messages (role, content, created_at) VALUES ('user', ?, ?)",
            (user_message, now),
        )
        history = _recent_chat_history()
        try:
            reply = _chat_completion(history)
        except RuntimeError:
            reply = "Necesito que configures ANTHROPIC_API_KEY para poder responder."
        except Exception:
            reply = "Tuve un problema para consultar los datos. Probá de nuevo en un momento."

        now2 = datetime.datetime.utcnow().isoformat()
        reply_id = deps.db_run(
            "INSERT INTO agent_messages (role, content, created_at) VALUES ('agent', ?, ?)",
            (reply, now2),
        )
        payload = {"id": reply_id, "role": "agent", "content": reply, "created_at": now2}
        socketio.emit("agent_message", payload)
        return jsonify(payload)

    @app.route("/api/agent/run-now", methods=["POST"])
    @deps.require_auth(roles=["dueno", "encargado"])
    def agent_run_now():
        return jsonify(run_monitor_cycle())

    @app.route("/api/agent/generate-report", methods=["POST"])
    @deps.require_auth(roles=["dueno", "encargado"])
    def agent_generate_report():
        return jsonify(generate_weekly_report())

    if os.environ.get("AGENT_SCHEDULER_ENABLED", "true").lower() != "false" and _scheduler is None:
        _scheduler = BackgroundScheduler(daemon=True)
        _scheduler.add_job(run_monitor_cycle, "interval", minutes=MONITOR_INTERVAL_MINUTES,
                            id="agent_monitor", max_instances=1, coalesce=True)
        _scheduler.add_job(generate_weekly_report, "interval", hours=REPORT_INTERVAL_HOURS,
                            id="agent_weekly_report", max_instances=1, coalesce=True)
        _scheduler.start()
