# SQL Assistant

> Query your database with plain Spanish. Powered by Claude Opus 4.

SQL Assistant is a full-stack AI application that transforms natural language questions into SQL queries and executes them against your e-commerce database. Built for teams with different technical skill levels — no SQL knowledge required.

---

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  SQL Assistant  / Productos                   [Buscar Ctrl+K]   │
├──────┬──────────┬───────────────────────────────────────────────┤
│Icons │ History  │           Main Content Area                   │
│      │ Panel    │                                               │
│  🏠  │          │  ¿Qué querés consultar?                      │
│  ⏱  │ Query 1  │                                               │
│  🗄  │ Query 2  │  [  Escribí tu pregunta aquí...          ] ↗ │
│  📦  │ Query 3  │                                               │
│  👥  │          │  💡 Más vendidos  📊 Por categoría           │
│  📋  │          │                                               │
│  ⚙  │          │                                               │
│  👤  │          │                                               │
└──────┴──────────┴───────────────────────────────────────────────┘
```

The app features:
- **Two-column sidebar**: Icon navigation (64px) + collapsible detail panel (288px)
- **Main content area**: Query interface, CRUD views, dashboard, reports
- **Light mode default** with full dark mode support (toggle in topbar or Settings)
- **Cyan accent** throughout (primary color)

---

## Features

### 🤖 AI-Powered SQL Queries
- Write questions in natural Spanish, get SQL results instantly
- Powered by **Claude Opus 4** via the Anthropic API
- Query history with row counts, error indicators, and SQL display
- Syntax-highlighted SQL output
- Quick suggestion buttons for common queries

### 🔐 Multi-Role Authentication
| Role | Access |
|------|--------|
| **Admin** | Full access: all views, queries, CRUD, reports, settings |
| **Vendedor** | Dashboard, orders, customers, reports |
| **Bodega** | Products, categories, low-stock alerts |

JWT-based auth with 8-hour token expiry.

### 📊 Dashboard & Reports
- Key metrics: total sales, monthly orders, customer count, low-stock count
- Area chart: sales trend for the last 6 months
- Top 5 products by units sold
- Recent orders table with status badges
- Detailed bar chart reports by week / month / year
- **Animated bar hover** — bars scale up on hover
- Export to **CSV** and **PDF**

### 🗂 CRUD Management
- **Products**: Full CRUD with stock movement tracking and movement history modal
- **Customers**: Full CRUD with country-colored badges
- **Orders**: Full CRUD with line items and status management
- **Categories**: Full CRUD
- **Low Stock**: Filter view with restock alerts
- Country badges use real flag colors (Spain, Mexico, USA, Argentina, 30+ countries)
- Category badges with distinctive colors (Electronics=blue, Food=green, Clothing=orange, etc.)

### ⌨️ Productivity
| Feature | Shortcut |
|---------|----------|
| Global Search | `Ctrl+K` |
| Focus Mode (hide sidebar) | `Ctrl+B` |
| New Query | `Ctrl+N` |
| Execute Query | `Ctrl+Enter` |
| Keyboard Shortcuts Reference | `?` |
| Close Modals | `ESC` |

### 🔔 Real-Time Notifications
- WebSocket-based notifications via Flask-SocketIO
- Toast notifications for new orders, low stock alerts, status changes
- Notification bell with unread count badge

### 👤 User Profile
- Query statistics: total, today, this session
- **GitHub-style contribution heatmap** (last 20 weeks)
- Top most-used queries
- Change password form
- Quick logout

### 📋 Activity Feed
- Sliding drawer from the right showing all session actions
- Tracks: creates, edits, deletes, queries, stock movements
- Relative timestamps ("hace 2 min"), user initials avatars
- Color-coded by action type

### 🎯 Onboarding Tour
- 5-step interactive guide shown on first login
- "Saltar tour" and "Siguiente" navigation
- Stored in localStorage — shows only once

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript 5 | Type safety |
| Vite 5 | Build tool & dev server |
| Tailwind CSS 3 | Utility-first styling |
| Framer Motion | Animations & transitions |
| Recharts | Charts & data visualization |
| next-themes | Light/dark theme management |
| Carbon Icons React | Primary icon library |
| Lucide React | Additional icons |
| Socket.IO Client | WebSocket notifications |

### Backend
| Technology | Purpose |
|------------|---------|
| Python 3.11+ | Runtime |
| Flask | Web framework |
| Flask-CORS | Cross-origin requests |
| Flask-SocketIO | WebSocket notifications |
| PyJWT | JWT authentication |
| Anthropic SDK | Claude AI integration |
| Werkzeug | Password hashing |
| SQLite | Database (ecommerce.db) |

---

## Installation

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/sql-assistant.git
cd sql-assistant
```

### 2. Backend Setup

```bash
# Install Python dependencies
pip install flask flask-cors flask-socketio pyjwt anthropic werkzeug

# Set up the SQLite database with sample e-commerce data
python setup_db.py

# Configure environment variables
export ANTHROPIC_API_KEY=sk-ant-your-key-here   # Required
export JWT_SECRET=your-secure-secret-key         # Optional
export SECRET_KEY=your-flask-secret              # Optional

# Start the Flask server
python app.py
# → Running on http://localhost:8000
```

### 3. Frontend Setup

```bash
# Navigate to the client directory
cd client

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
# → Running on http://localhost:5173
```

### 4. Open the App

Visit `http://localhost:5173` and log in with any of the default accounts below.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | — | Anthropic API key for Claude Opus 4 |
| `JWT_SECRET` | No | `sql-assistant-dev-secret-2024` | JWT signing secret (change in production!) |
| `SECRET_KEY` | No | `socketio-dev-secret` | Flask/SocketIO secret key |

> **Security Note**: Always set custom secrets in production. The defaults are for development only.

---

## Default User Accounts

The database is pre-seeded with three test accounts:

| Email | Password | Role | Access Level |
|-------|----------|------|-------------|
| `admin@sql.com` | `admin123` | **Admin** | Full access |
| `vendedor@sql.com` | `vendedor123` | **Vendedor** | Sales & customers |
| `bodega@sql.com` | `bodega123` | **Bodega** | Inventory only |

---

## Project Structure

```
sql-assistant/
├── app.py                          # Flask backend & API routes
├── assistant.py                    # AI query processing
├── setup_db.py                     # Database initialization script
├── ecommerce.db                    # SQLite database (auto-generated)
│
└── client/                         # React frontend
    ├── src/
    │   ├── App.tsx                  # Root app, routing, keyboard shortcuts
    │   ├── main.tsx                 # Entry point, providers
    │   ├── index.css                # Global styles & CSS variables
    │   │
    │   ├── components/
    │   │   ├── crud/
    │   │   │   ├── DashboardView.tsx
    │   │   │   ├── ProductsView.tsx
    │   │   │   ├── CustomersView.tsx
    │   │   │   ├── OrdersView.tsx
    │   │   │   ├── CategoriesView.tsx
    │   │   │   ├── LowStockView.tsx
    │   │   │   ├── ReportsView.tsx
    │   │   │   ├── SettingsView.tsx
    │   │   │   ├── ProfileView.tsx
    │   │   │   └── shared.tsx       # Shared UI primitives + color badges
    │   │   ├── ui/
    │   │   │   ├── animated-ai-chat.tsx  # Hero query interface
    │   │   │   └── sidebar-component.tsx # Two-column sidebar
    │   │   ├── ActivityFeed.tsx     # Right-side activity drawer
    │   │   ├── GlobalSearch.tsx     # Ctrl+K command palette
    │   │   ├── OnboardingTour.tsx   # First-run tour
    │   │   ├── ShortcutsPanel.tsx   # Keyboard shortcuts reference
    │   │   ├── QueryInput.tsx
    │   │   ├── ResultsTable.tsx
    │   │   ├── SqlDisplay.tsx
    │   │   └── StatusBar.tsx
    │   │
    │   ├── context/
    │   │   ├── AuthContext.tsx       # JWT auth state
    │   │   ├── ActivityContext.tsx   # Activity feed events
    │   │   └── NotificationContext.tsx # WebSocket notifications
    │   │
    │   └── lib/
    │       ├── api.ts               # API client with all endpoints
    │       ├── csv.ts               # CSV export utility
    │       └── pdf.ts               # PDF export utility
    │
    ├── tailwind.config.ts
    └── package.json
```

---

## Example Queries

Try these natural language questions in the query interface:

```
¿Cuáles son los 10 productos más vendidos?
Total de ventas por mes en 2024
Clientes con más de 3 órdenes
Productos con stock menor a 10
Órdenes pendientes de los últimos 7 días
Revenue total por categoría de producto
Los 5 clientes que más gastaron
```

---

## License

MIT © 2024
