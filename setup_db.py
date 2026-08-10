"""
Crea y puebla la base de datos SQLite de ByMes con datos realistas de una
PyME argentina tipo almacén/distribuidora (ventas, gastos, stock, caja).

Siembra ~90 días de historial con estacionalidad semanal y una anomalía
deliberada (caída de ventas en los últimos 7 días + un par de productos con
quiebre de stock) para que el agente de BI tenga algo real que detectar
apenas arranca la demo.
"""
import os
import random
import sqlite3
from datetime import datetime, timedelta

DB_PATH = "bymes.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    categoria_id INTEGER NOT NULL,
    precio REAL NOT NULL,
    costo REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 5,
    descripcion TEXT,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    canal TEXT NOT NULL CHECK(canal IN ('mostrador','whatsapp','mercado_libre','reparto')),
    estado TEXT NOT NULL CHECK(estado IN ('completada','pendiente','cancelada')),
    total REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS venta_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    monto REAL NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS movimientos_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    notas TEXT DEFAULT '',
    user_email TEXT DEFAULT '',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT DEFAULT '{}',
    read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    title TEXT NOT NULL,
    summary_md TEXT NOT NULL,
    kpis_json TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL CHECK(role IN ('agent','user')),
    content TEXT NOT NULL,
    related_notification_id INTEGER,
    created_at TEXT NOT NULL
);
"""

CATEGORIAS = [
    ("Almacén", "Comestibles y productos de despensa"),
    ("Bebidas", "Gaseosas, cervezas, vinos y aguas"),
    ("Limpieza", "Artículos de limpieza para el hogar"),
    ("Kiosco", "Golosinas, snacks y chicles"),
    ("Electro", "Pequeños electrodomésticos"),
    ("Indumentaria", "Ropa y calzado básico"),
]

PRODUCTOS_POR_CATEGORIA = {
    "Almacén": [
        ("Yerba Mate Rosamonte 1kg", 3200, 0.62, 8, 15),
        ("Dulce de Leche La Serenísima 400g", 1900, 0.60, 40, 10),
        ("Fideos Matarazzo 500g", 900, 0.58, 90, 20),
        ("Arroz Gallo Oro 1kg", 1400, 0.60, 70, 15),
        ("Aceite Natura 900ml", 2600, 0.65, 55, 12),
        ("Harina Pureza 1kg", 850, 0.55, 100, 20),
        ("Azúcar Ledesma 1kg", 1100, 0.58, 85, 15),
        ("Puré de Tomate Arcor 520g", 950, 0.55, 75, 15),
        ("Galletitas Oreo", 1600, 0.62, 60, 12),
        ("Café La Virginia 250g", 3400, 0.60, 35, 10),
        ("Polenta Pergamino 500g", 780, 0.55, 65, 12),
        ("Lentejas Secas 500g", 1050, 0.55, 50, 10),
    ],
    "Bebidas": [
        ("Coca-Cola 2.25L", 2800, 0.65, 70, 15),
        ("Fernet Branca 750ml", 12500, 0.68, 25, 8),
        ("Cerveza Quilmes 1L", 2100, 0.62, 90, 20),
        ("Vino Malbec Trapiche", 6800, 0.60, 40, 10),
        ("Agua Mineral Villavicencio 2L", 1300, 0.55, 100, 20),
        ("Gaseosa Sprite 2.25L", 2700, 0.65, 65, 15),
        ("Jugo Cepita 1L", 2200, 0.60, 45, 10),
        ("Cerveza Stella Artois pack x6", 7200, 0.63, 30, 8),
        ("Soda Sifón", 1500, 0.55, 40, 10),
        ("Gatorade 500ml", 1800, 0.60, 55, 12),
    ],
    "Limpieza": [
        ("Detergente Magistral 750ml", 1700, 0.58, 60, 12),
        ("Lavandina Ayudín 1L", 1200, 0.55, 80, 15),
        ("Jabón en Polvo Skip 800g", 3100, 0.60, 45, 10),
        ("Papel Higiénico Elite x4", 2600, 0.58, 70, 15),
        ("Esponja Scotch Brite", 900, 0.50, 100, 20),
        ("Suavizante Comfort 900ml", 2400, 0.58, 50, 10),
        ("Limpiador Cif 500ml", 1900, 0.58, 55, 10),
        ("Trapo de Piso", 1300, 0.52, 65, 12),
        ("Desodorante de Ambiente Glade", 2100, 0.60, 40, 10),
    ],
    "Kiosco": [
        ("Alfajor Jorgito", 700, 0.55, 150, 30),
        ("Chocolate Águila", 1200, 0.58, 90, 20),
        ("Chicles Beldent", 500, 0.50, 200, 40),
        ("Caramelos Sugus", 450, 0.48, 180, 35),
        ("Papas Fritas Lays", 1500, 0.58, 100, 20),
        ("Turrón Arcor", 650, 0.52, 120, 25),
        ("Alfajor Guaymallén Triple", 900, 0.55, 100, 20),
        ("Palitos Salados 9 de Oro", 1100, 0.55, 70, 15),
        ("Chupetín Pico Dulce", 350, 0.45, 200, 40),
    ],
    "Electro": [
        ("Ventilador de Pie Liliana", 45000, 0.68, 12, 4),
        ("Pava Eléctrica Peabody", 28000, 0.65, 18, 5),
        ("Microondas BGH 20L", 165000, 0.70, 8, 3),
        ("Plancha Philips", 38000, 0.65, 15, 4),
        ("Licuadora Oster", 62000, 0.66, 10, 3),
        ("Cafetera Express Ariete", 95000, 0.68, 7, 3),
        ("Aire Acondicionado Split 3000f", 420000, 0.72, 6, 4),
        ("Termotanque Rheem", 310000, 0.70, 5, 2),
        ("Batidora Philco", 33000, 0.64, 14, 4),
    ],
    "Indumentaria": [
        ("Remera Básica Algodón", 9500, 0.55, 60, 12),
        ("Zapatillas Topper", 42000, 0.60, 25, 6),
        ("Buzo Canguro", 22000, 0.58, 35, 8),
        ("Jean Recto", 28000, 0.58, 30, 8),
        ("Campera Rompeviento", 39000, 0.60, 20, 6),
        ("Medias Pack x3", 4800, 0.50, 80, 15),
        ("Gorra Visera", 8200, 0.55, 45, 10),
        ("Ojotas Havaianas", 15000, 0.58, 40, 10),
    ],
}

# Productos con quiebre de stock deliberado (anomalía para el agente)
PRODUCTOS_QUIEBRE_STOCK = {
    "Aire Acondicionado Split 3000f": 1,   # muy pedido, casi sin stock
    "Yerba Mate Rosamonte 1kg": 3,
}

NOMBRES = [
    "Facundo", "Rocío", "Matías", "Camila", "Nicolás", "Agustina", "Franco",
    "Valentina", "Tomás", "Micaela", "Bruno", "Julieta", "Santiago", "Martina",
    "Lautaro", "Sofía", "Joaquín", "Catalina", "Ignacio", "Delfina", "Gonzalo",
    "Milagros", "Ezequiel", "Abril", "Ramiro", "Zoe", "Emiliano", "Pilar",
    "Federico", "Guadalupe", "Maximiliano", "Ludmila", "Agustín", "Antonella",
    "Cristian", "Ayelén", "Leandro", "Morena", "Damián", "Priscila",
]

APELLIDOS = [
    "González", "Rodríguez", "Fernández", "López", "Díaz", "Martínez",
    "Pérez", "Gómez", "Sánchez", "Romero", "Sosa", "Torres", "Álvarez",
    "Ruiz", "Ramírez", "Flores", "Acosta", "Benítez", "Medina", "Herrera",
    "Suárez", "Rojas", "Molina", "Aguirre", "Vega", "Ibáñez", "Godoy",
    "Cabrera", "Ojeda", "Peralta",
]

CIUDADES = [
    "Buenos Aires", "Córdoba", "Rosario", "Mendoza", "La Plata",
    "Mar del Plata", "Salta", "San Miguel de Tucumán", "Santa Fe",
    "San Juan", "Neuquén", "Bahía Blanca",
]

CANALES = ["mostrador", "whatsapp", "mercado_libre", "reparto"]
CANAL_WEIGHTS = [0.55, 0.25, 0.10, 0.10]
ESTADOS = ["completada", "pendiente", "cancelada"]
ESTADO_WEIGHTS = [0.85, 0.10, 0.05]

DIAS_HISTORIAL = 90
DIAS_ANOMALIA = 7          # últimos N días con caída de ventas
FACTOR_CAIDA = 0.45        # las ventas de esos días caen a ~45% de lo normal


def base_ventas_del_dia(fecha: datetime) -> int:
    """Cantidad esperada de ventas para un día, según día de la semana."""
    weekday = fecha.weekday()  # 0=lunes ... 6=domingo
    if weekday in (4, 5):      # viernes y sábado: pico de ventas
        base = 22
    elif weekday == 6:         # domingo: más tranquilo
        base = 12
    else:
        base = 16
    return base


def seed_database(force: bool = False):
    if os.path.exists(DB_PATH) and not force:
        print(f"[INFO] '{DB_PATH}' ya existe. Usa force=True o elimina el archivo para recrear.")
        return

    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.executescript(SCHEMA)

    # Categorías
    cur.executemany(
        "INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)", CATEGORIAS
    )
    conn.commit()

    cur.execute("SELECT id, nombre FROM categorias")
    cat_map = {nombre: cid for cid, nombre in cur.fetchall()}

    # Productos
    producto_ids_por_nombre = {}
    for cat_nombre, items in PRODUCTOS_POR_CATEGORIA.items():
        cat_id = cat_map[cat_nombre]
        for nombre, precio, costo_ratio, stock, stock_minimo in items:
            costo = round(precio * costo_ratio, 2)
            stock_final = PRODUCTOS_QUIEBRE_STOCK.get(nombre, stock)
            desc = f"{nombre} — categoría {cat_nombre}."
            cur.execute(
                "INSERT INTO productos (nombre, categoria_id, precio, costo, stock, stock_minimo, descripcion) "
                "VALUES (?,?,?,?,?,?,?)",
                (nombre, cat_id, precio, costo, stock_final, stock_minimo, desc),
            )
            producto_ids_por_nombre[nombre] = cur.lastrowid
    conn.commit()

    # Movimientos de stock: reponer stock inicial + un ajuste que explica el quiebre
    now_iso = datetime.now().isoformat()
    for nombre, pid in producto_ids_por_nombre.items():
        cur.execute(
            "INSERT INTO movimientos_stock (producto_id, tipo, cantidad, notas, user_email, created_at) "
            "VALUES (?, 'compra', ?, 'Stock inicial', 'sistema@bymes.ar', ?)",
            (pid, cur.execute("SELECT stock FROM productos WHERE id=?", (pid,)).fetchone()[0], now_iso),
        )
    for nombre in PRODUCTOS_QUIEBRE_STOCK:
        pid = producto_ids_por_nombre[nombre]
        cur.execute(
            "INSERT INTO movimientos_stock (producto_id, tipo, cantidad, notas, user_email, created_at) "
            "VALUES (?, 'venta', ?, 'Alta demanda reciente', 'sistema@bymes.ar', ?)",
            (pid, 8, now_iso),
        )
    conn.commit()

    # Clientes (70 registros)
    clientes = []
    used = set()
    while len(clientes) < 70:
        nombre = f"{random.choice(NOMBRES)} {random.choice(APELLIDOS)}"
        if nombre in used:
            continue
        used.add(nombre)
        telefono = f"+54 9 11 {random.randint(4000,7999)}-{random.randint(1000,9999)}"
        email = f"{nombre.lower().replace(' ', '.')}@gmail.com"
        created = (datetime.now() - timedelta(days=random.randint(30, 700))).strftime("%Y-%m-%d %H:%M:%S")
        clientes.append((nombre, telefono, email, created))
    cur.executemany(
        "INSERT INTO clientes (nombre, telefono, email, created_at) VALUES (?,?,?,?)",
        clientes,
    )
    conn.commit()

    cur.execute("SELECT id FROM clientes")
    cliente_ids = [r[0] for r in cur.fetchall()]

    cur.execute("SELECT id, precio FROM productos")
    productos = cur.fetchall()

    # Ventas: recorre los últimos DIAS_HISTORIAL días, día por día
    hoy = datetime.now()
    total_ventas = 0
    for dias_atras in range(DIAS_HISTORIAL - 1, -1, -1):
        fecha = hoy - timedelta(days=dias_atras)
        cantidad_ventas = base_ventas_del_dia(fecha)
        cantidad_ventas = max(1, round(cantidad_ventas * random.uniform(0.85, 1.15)))

        # Anomalía deliberada: caída de ventas en los últimos DIAS_ANOMALIA días
        if dias_atras < DIAS_ANOMALIA:
            cantidad_ventas = max(1, round(cantidad_ventas * FACTOR_CAIDA))

        for _ in range(cantidad_ventas):
            cliente_id = random.choice(cliente_ids) if random.random() > 0.05 else None
            canal = random.choices(CANALES, CANAL_WEIGHTS)[0]
            estado = random.choices(ESTADOS, ESTADO_WEIGHTS)[0]
            hora = fecha.replace(
                hour=random.randint(9, 21), minute=random.randint(0, 59), second=0
            )
            n_items = random.randint(1, 4)
            seleccion = random.sample(productos, min(n_items, len(productos)))
            total = 0.0
            items_data = []
            for pid, precio in seleccion:
                cantidad = random.randint(1, 3)
                total += cantidad * precio
                items_data.append((pid, cantidad, round(precio, 2)))
            total = round(total, 2)

            cur.execute(
                "INSERT INTO ventas (cliente_id, canal, estado, total, created_at) VALUES (?,?,?,?,?)",
                (cliente_id, canal, estado, total, hora.strftime("%Y-%m-%d %H:%M:%S")),
            )
            venta_id = cur.lastrowid
            for pid, cantidad, precio in items_data:
                cur.execute(
                    "INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario) VALUES (?,?,?,?)",
                    (venta_id, pid, cantidad, precio),
                )
            total_ventas += 1
    conn.commit()

    # Gastos: últimos 3 meses, categorías recurrentes + una suba de Servicios este mes
    gastos = []
    for mes_atras in range(2, -1, -1):
        fecha_mes = hoy - timedelta(days=30 * mes_atras + random.randint(0, 3))
        fecha_str = fecha_mes.strftime("%Y-%m-%d %H:%M:%S")
        gastos.append(("Alquiler", "Alquiler del local", 380000, fecha_str))
        gastos.append(("Sueldos", "Sueldos del personal (2 empleados)", 950000, fecha_str))
        gastos.append(("Impuestos", "Monotributo + Ingresos Brutos", 145000, fecha_str))

        servicios_monto = 68000 if mes_atras > 0 else 132000  # este mes: suba por AC
        gastos.append(("Servicios", "Luz, gas e internet", servicios_monto, fecha_str))

        for _ in range(random.randint(3, 6)):
            monto = random.randint(8000, 55000)
            dia = hoy - timedelta(days=30 * mes_atras + random.randint(0, 28))
            gastos.append(("Insumos", "Bolsas, embalaje y librería", monto, dia.strftime("%Y-%m-%d %H:%M:%S")))

        if random.random() > 0.4:
            dia = hoy - timedelta(days=30 * mes_atras + random.randint(0, 28))
            gastos.append(("Otros", "Mantenimiento y reparaciones", random.randint(15000, 60000), dia.strftime("%Y-%m-%d %H:%M:%S")))

    cur.executemany(
        "INSERT INTO gastos (categoria, descripcion, monto, created_at) VALUES (?,?,?,?)",
        gastos,
    )
    conn.commit()
    conn.close()

    print(f"[OK] Base de datos creada: {DB_PATH}")
    print(f"   - {len(CATEGORIAS)} categorías")
    print(f"   - {sum(len(v) for v in PRODUCTOS_POR_CATEGORIA.values())} productos")
    print(f"   - {len(clientes)} clientes")
    print(f"   - {total_ventas} ventas")
    print(f"   - {len(gastos)} gastos")
    print(f"   - Anomalía sembrada: caída de ventas últimos {DIAS_ANOMALIA} días "
          f"(factor {FACTOR_CAIDA}) + quiebre de stock en {len(PRODUCTOS_QUIEBRE_STOCK)} productos")


if __name__ == "__main__":
    seed_database(force=True)
