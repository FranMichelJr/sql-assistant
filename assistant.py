"""
SQL Assistant — CLI interactivo que convierte preguntas en lenguaje natural a SQL
usando la API de Anthropic y ejecuta las consultas en la base de datos SQLite.
"""
import os
import sqlite3
import sys

import anthropic
from tabulate import tabulate

DB_PATH = "ecommerce.db"

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


def get_db_connection() -> sqlite3.Connection:
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Base de datos '{DB_PATH}' no encontrada.")
        print("   Ejecuta primero: python setup_db.py")
        sys.exit(1)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def execute_query(sql: str) -> tuple[list[dict], list[str]]:
    conn = get_db_connection()
    try:
        cur = conn.execute(sql)
        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description] if cur.description else []
        return [dict(r) for r in rows], columns
    finally:
        conn.close()


def natural_to_sql(client: anthropic.Anthropic, question: str) -> str:
    """Llama a Claude y retorna la SQL generada usando streaming."""
    sql_parts = []
    print("Generando SQL", end="", flush=True)

    with client.messages.stream(
        model="claude-opus-4-7",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": question}],
        thinking={"type": "adaptive"},
    ) as stream:
        for event in stream:
            if event.type == "content_block_delta":
                if hasattr(event.delta, "text"):
                    sql_parts.append(event.delta.text)
                    print(".", end="", flush=True)

    print()  # newline después de los puntos
    return "".join(sql_parts).strip()


def display_results(rows: list[dict], columns: list[str], question: str) -> None:
    if not rows:
        print("\n[INFO] La consulta no retorno resultados.\n")
        return

    # Truncar valores muy largos para que la tabla sea legible
    display_rows = []
    for row in rows:
        display_row = {}
        for col in columns:
            val = row[col]
            if isinstance(val, str) and len(val) > 60:
                val = val[:57] + "..."
            display_row[col] = val if val is not None else "NULL"
        display_rows.append(display_row)

    table = tabulate(
        [[r[c] for c in columns] for r in display_rows],
        headers=columns,
        tablefmt="rounded_outline",
        numalign="right",
        stralign="left",
    )

    print(f"\n[RESULTADOS] {len(rows)} fila(s):\n")
    print(table)
    print()


def run_cli() -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("[ERROR] Variable de entorno ANTHROPIC_API_KEY no configurada.")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    print("=" * 60)
    print("  SQL Assistant -- E-Commerce Database")
    print("=" * 60)
    print("  Escribe una pregunta en lenguaje natural sobre la")
    print("  base de datos de e-commerce.")
    print("  Comandos: 'salir'/'exit' para terminar, 'schema' para el esquema.")
    print("=" * 60)
    print()

    while True:
        try:
            question = input(">> Tu pregunta: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n\nHasta luego!")
            break

        if not question:
            continue

        if question.lower() in ("salir", "exit", "quit", "q"):
            print("\nHasta luego!")
            break

        if question.lower() == "schema":
            print(DB_SCHEMA)
            continue

        # Generar SQL
        try:
            sql = natural_to_sql(client, question)
        except anthropic.APIError as e:
            print(f"\n[ERROR] API: {e}\n")
            continue

        if sql.startswith("ERROR:"):
            print(f"\n[AVISO] No pude generar SQL: {sql[6:].strip()}\n")
            continue

        # Mostrar SQL generado
        print(f"\n[SQL]\n   {sql}\n")

        # Ejecutar consulta
        try:
            rows, columns = execute_query(sql)
            display_results(rows, columns, question)
        except sqlite3.Error as e:
            print(f"\n[ERROR] Al ejecutar SQL: {e}\n")
            print("   Intenta reformular tu pregunta.\n")


if __name__ == "__main__":
    run_cli()
