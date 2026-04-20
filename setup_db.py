"""
Crea y puebla la base de datos SQLite de e-commerce con datos realistas.
"""
import sqlite3
import random
from datetime import datetime, timedelta

DB_PATH = "ecommerce.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    city TEXT,
    country TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending','processing','shipped','delivered','cancelled')),
    total REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
"""

CATEGORIES = [
    ("Electrónica", "Dispositivos electrónicos y gadgets"),
    ("Ropa y Moda", "Prendas de vestir y accesorios"),
    ("Hogar y Jardín", "Productos para el hogar y jardín"),
    ("Deportes", "Equipos y ropa deportiva"),
    ("Libros", "Libros físicos y digitales"),
    ("Juguetes", "Juguetes y juegos para niños"),
    ("Belleza", "Cosméticos y cuidado personal"),
    ("Alimentación", "Productos alimenticios y bebidas"),
    ("Automóvil", "Accesorios y repuestos para vehículos"),
    ("Música", "Instrumentos y equipos de audio"),
]

PRODUCTS_BY_CATEGORY = {
    "Electrónica": [
        ("iPhone 15 Pro", 1199.99, 45),
        ("Samsung Galaxy S24", 999.99, 60),
        ("MacBook Air M3", 1299.99, 30),
        ("iPad Pro 12.9", 1099.99, 25),
        ("Sony WH-1000XM5", 349.99, 80),
        ("Dell XPS 15", 1599.99, 20),
        ("Apple Watch Series 9", 399.99, 55),
        ("AirPods Pro 2", 249.99, 90),
        ("LG OLED 65\"", 1799.99, 15),
        ("Kindle Paperwhite", 139.99, 100),
        ("GoPro Hero 12", 399.99, 40),
        ("Nintendo Switch OLED", 349.99, 70),
    ],
    "Ropa y Moda": [
        ("Chaqueta North Face", 299.99, 50),
        ("Jeans Levi's 501", 89.99, 120),
        ("Zapatillas Nike Air Max", 149.99, 95),
        ("Vestido Zara Floral", 59.99, 75),
        ("Camisa Ralph Lauren", 99.99, 60),
        ("Bolso Louis Vuitton Neverfull", 1450.00, 10),
        ("Gafas Ray-Ban Aviator", 179.99, 65),
        ("Reloj Casio G-Shock", 129.99, 80),
        ("Sudadera Adidas", 69.99, 110),
        ("Traje Hugo Boss", 599.99, 20),
    ],
    "Hogar y Jardín": [
        ("Aspiradora Dyson V15", 699.99, 35),
        ("Cafetera Nespresso", 199.99, 55),
        ("Robot Cocina Thermomix", 1299.99, 12),
        ("Colchón Tempur-Pedic", 1899.99, 8),
        ("Lámpara IKEA RANARP", 49.99, 200),
        ("Silla Ergonómica Herman Miller", 1299.99, 15),
        ("Planta Monstera Deliciosa", 29.99, 80),
        ("Set Cuchillos Zwilling", 249.99, 40),
        ("Freidora de Aire Philips", 129.99, 75),
        ("Manta Eléctrica Beurer", 69.99, 60),
    ],
    "Deportes": [
        ("Bicicleta Trek Marlin 5", 799.99, 18),
        ("Pesas Kettlebell 16kg", 49.99, 85),
        ("Esterilla Yoga Manduka", 129.99, 95),
        ("Tenis Wilson Pro Staff", 299.99, 30),
        ("Mochila Osprey 65L", 219.99, 45),
        ("Zapatillas Trail Salomon", 189.99, 60),
        ("Casco Ciclismo Giro", 149.99, 40),
        ("Guantes Boxeo Everlast", 49.99, 70),
        ("Pelota Fútbol Adidas", 39.99, 150),
        ("Tabla Surf 7'6\"", 649.99, 12),
    ],
    "Libros": [
        ("El Quijote - Cervantes", 14.99, 200),
        ("Cien Años de Soledad", 12.99, 180),
        ("Sapiens - Yuval Harari", 16.99, 150),
        ("El Arte de la Guerra", 9.99, 220),
        ("Atomic Habits", 15.99, 160),
        ("Clean Code - Robert Martin", 44.99, 90),
        ("El Principito", 8.99, 300),
        ("1984 - George Orwell", 11.99, 175),
        ("Dune - Frank Herbert", 13.99, 140),
        ("Harry Potter Box Set", 89.99, 60),
    ],
    "Juguetes": [
        ("LEGO Star Wars Millennium Falcon", 849.99, 20),
        ("Barbie Dreamhouse", 199.99, 35),
        ("Hot Wheels Track Builder", 49.99, 80),
        ("Playmobil City Life", 79.99, 55),
        ("Monopoly Edición Clásica", 29.99, 100),
        ("Funko Pop Colección", 14.99, 200),
        ("Puzzle 1000 Piezas Van Gogh", 19.99, 120),
        ("Nerf Ultra One", 49.99, 65),
        ("Play-Doh Set Creativo", 24.99, 90),
        ("Globo Terráqueo Interactivo", 69.99, 40),
    ],
    "Belleza": [
        ("Perfume Chanel N°5", 129.99, 45),
        ("Serum Vitamina C SkinCeuticals", 169.99, 55),
        ("Mascarilla Clarins", 49.99, 80),
        ("Plancha GHD Gold", 229.99, 35),
        ("Base L'Oréal True Match", 24.99, 150),
        ("Crema Hidratante Clinique", 39.99, 100),
        ("Paleta Sombras Urban Decay", 54.99, 70),
        ("Sérum Acné La Roche-Posay", 34.99, 90),
        ("Labial Mac Ruby Woo", 22.99, 180),
        ("Aceite Argán Moroccanoil", 44.99, 65),
    ],
    "Alimentación": [
        ("Café Arabica Premium 1kg", 24.99, 200),
        ("Aceite Oliva Virgen Extra", 18.99, 150),
        ("Chocolate Godiva 500g", 34.99, 120),
        ("Jamón Ibérico Bellota 5J", 299.99, 25),
        ("Miel Manuka KFactor 16", 59.99, 60),
        ("Vino Rioja Reserva 2018", 29.99, 90),
        ("Té Matcha Ceremonial", 39.99, 75),
        ("Queso Parmesano DOP", 22.99, 100),
        ("Salmón Ahumado Premium", 19.99, 80),
        ("Kit Especias Gourmet", 44.99, 55),
    ],
    "Automóvil": [
        ("Dashcam Garmin 67W", 249.99, 40),
        ("Portabicicletas Thule", 349.99, 25),
        ("Compresor Portátil Air 12V", 59.99, 85),
        ("Navegador TomTom GO 6200", 199.99, 30),
        ("Aspiradora Coche Black+Decker", 49.99, 70),
        ("Organizador Maletero", 29.99, 100),
        ("Cargador Inalámbrico Auto", 39.99, 120),
        ("Parasol Parabrisas XL", 19.99, 150),
        ("Cable Arranque 400A", 34.99, 80),
        ("Ambientador Premium Creed", 24.99, 200),
    ],
    "Música": [
        ("Guitarra Fender Stratocaster", 849.99, 15),
        ("Piano Digital Roland FP-30X", 699.99, 10),
        ("Batería Yamaha DTX452K", 999.99, 8),
        ("Ukelele Kala KA-15S", 69.99, 60),
        ("Interface Audio Focusrite", 119.99, 45),
        ("Micrófono Shure SM58", 99.99, 55),
        ("Auriculares Audio-Technica M50X", 149.99, 70),
        ("Violín 4/4 Stentor", 199.99, 25),
        ("Amplificador Marshall DSL40CR", 649.99, 12),
        ("Teclado MIDI Arturia", 199.99, 35),
    ],
}

FIRST_NAMES = [
    "Carlos", "María", "José", "Ana", "Luis", "Laura", "Miguel", "Carmen",
    "David", "Isabel", "Antonio", "Sofía", "Manuel", "Elena", "Francisco",
    "Marta", "Pedro", "Patricia", "Alejandro", "Lucía", "Daniel", "Sara",
    "Pablo", "Natalia", "Javier", "Cristina", "Adrián", "Mónica", "Rafael",
    "Andrea", "Sergio", "Raquel", "Jorge", "Silvia", "Marcos", "Beatriz",
    "Víctor", "Sandra", "Roberto", "Alicia", "Fernando", "Pilar", "Diego",
    "Nuria", "Rubén", "Claudia", "Álvaro", "Verónica", "Hugo", "Irene",
    "John", "Emily", "James", "Emma", "William", "Olivia", "Noah", "Ava",
    "Liam", "Isabella", "Oliver", "Sophia",
]

LAST_NAMES = [
    "García", "Martínez", "López", "Sánchez", "González", "Rodríguez",
    "Fernández", "Pérez", "Álvarez", "Jiménez", "Ruiz", "Hernández",
    "Díaz", "Moreno", "Muñoz", "Alonso", "Gutiérrez", "Romero", "Navarro",
    "Torres", "Domínguez", "Ramos", "Gil", "Serrano", "Blanco", "Molina",
    "Morales", "Suárez", "Ortega", "Delgado", "Castro", "Ortiz", "Rubio",
    "Marín", "Sanz", "Núñez", "Iglesias", "Medina", "Garrido", "Santos",
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Davis", "Miller",
    "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White",
]

CITIES = [
    ("Madrid", "España"), ("Barcelona", "España"), ("Valencia", "España"),
    ("Sevilla", "España"), ("Bilbao", "España"), ("Málaga", "España"),
    ("Zaragoza", "España"), ("Murcia", "España"), ("Palma", "España"),
    ("Las Palmas", "España"), ("Ciudad de México", "México"),
    ("Buenos Aires", "Argentina"), ("Bogotá", "Colombia"),
    ("Lima", "Perú"), ("Santiago", "Chile"), ("Miami", "USA"),
    ("New York", "USA"), ("Los Angeles", "USA"), ("London", "UK"),
    ("Paris", "Francia"), ("Berlin", "Alemania"), ("Roma", "Italia"),
]

STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"]
STATUS_WEIGHTS = [0.10, 0.15, 0.20, 0.45, 0.10]


def random_date(days_back=730):
    delta = timedelta(days=random.randint(0, days_back))
    return (datetime.now() - delta).strftime("%Y-%m-%d %H:%M:%S")


def seed_database(force: bool = False):
    import os
    if os.path.exists(DB_PATH) and not force:
        print(f"[INFO] '{DB_PATH}' ya existe. Usa force=True o elimina el archivo para recrear.")
        return

    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.executescript(SCHEMA)

    # Categories
    cur.executemany(
        "INSERT INTO categories (name, description) VALUES (?, ?)",
        CATEGORIES,
    )
    conn.commit()

    # Products
    cur.execute("SELECT id, name FROM categories")
    cat_map = {name: cid for cid, name in cur.fetchall()}

    for cat_name, items in PRODUCTS_BY_CATEGORY.items():
        cat_id = cat_map[cat_name]
        for name, price, stock in items:
            desc = f"Producto de alta calidad en la categoría {cat_name}."
            cur.execute(
                "INSERT INTO products (name, category_id, price, stock, description) VALUES (?,?,?,?,?)",
                (name, cat_id, price, stock, desc),
            )
    conn.commit()

    # Customers (60 registros)
    used_emails = set()
    customers = []
    while len(customers) < 60:
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        email = f"{fn.lower()}.{ln.lower()}{random.randint(1,99)}@{'gmail' if random.random()>0.5 else 'hotmail'}.com"
        if email in used_emails:
            continue
        used_emails.add(email)
        phone = f"+34 {random.randint(600,799)} {random.randint(100,999)} {random.randint(100,999)}"
        city, country = random.choice(CITIES)
        created = random_date(1000)
        customers.append((fn, ln, email, phone, city, country, created))

    cur.executemany(
        "INSERT INTO customers (first_name, last_name, email, phone, city, country, created_at) VALUES (?,?,?,?,?,?,?)",
        customers,
    )
    conn.commit()

    # Products list
    cur.execute("SELECT id, price FROM products")
    products = cur.fetchall()

    # Customers list
    cur.execute("SELECT id FROM customers")
    customer_ids = [r[0] for r in cur.fetchall()]

    # Orders (120 registros)
    for _ in range(120):
        cid = random.choice(customer_ids)
        status = random.choices(STATUSES, STATUS_WEIGHTS)[0]
        created = random_date(720)
        # order_items
        n_items = random.randint(1, 5)
        selected = random.sample(products, min(n_items, len(products)))
        total = 0.0
        items_data = []
        for pid, unit_price in selected:
            qty = random.randint(1, 4)
            total += qty * unit_price
            items_data.append((pid, qty, round(unit_price, 2)))
        total = round(total, 2)

        cur.execute(
            "INSERT INTO orders (customer_id, status, total, created_at) VALUES (?,?,?,?)",
            (cid, status, total, created),
        )
        order_id = cur.lastrowid
        for pid, qty, price in items_data:
            cur.execute(
                "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?,?,?,?)",
                (order_id, pid, qty, price),
            )

    conn.commit()
    conn.close()

    print(f"[OK] Base de datos creada: {DB_PATH}")
    print(f"   - {len(CATEGORIES)} categorias")
    print(f"   - {sum(len(v) for v in PRODUCTS_BY_CATEGORY.values())} productos")
    print(f"   - {len(customers)} clientes")
    print(f"   - 120 ordenes")


if __name__ == "__main__":
    seed_database(force=True)
