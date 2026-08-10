# ByMes

> El agente de BI conversacional que vigila tu PyME. Powered by Claude Opus 4.

ByMes es un agente autónomo de Business Intelligence para PyMEs argentinas: se conecta
a los datos del negocio (ventas, gastos, stock), monitorea KPIs solo, detecta desvíos
con reglas determinísticas, manda alertas en tiempo real y escribe reportes semanales
en lenguaje natural. También podés preguntarle lo que quieras sobre el negocio — tiene
acceso de solo lectura a la base de datos vía tool-use.

---

## Qué hace

### 🤖 Agente autónomo
- Corre en background (APScheduler) monitoreando KPIs cada N minutos y generando un
  reporte semanal automáticamente.
- Detecta desvíos con reglas determinísticas: caída de ventas semanales vs. el
  promedio histórico, productos bajo stock mínimo, gastos por categoría muy por
  encima del promedio mensual.
- Redacta las alertas y reportes en español rioplatense usando Claude — con
  fallback determinístico si la API no está disponible, para que la demo nunca
  se rompa.
- Chat libre: preguntale al agente lo que quieras sobre el negocio; investiga con
  SQL de solo lectura (tool-use) antes de responder.

### 📊 Dashboard
- KPIs clave: ventas hoy/semana/mes, gastos del mes, margen, stock crítico.
- Gráfico de tendencia de ventas de 30 días con marcador de anomalía.
- Top productos y ventas recientes.

### 🗂 Gestión del negocio
- CRUD de Ventas, Productos (con stock y stock mínimo), Gastos y Clientes.
- Notificaciones en tiempo real vía Socket.IO (nuevas ventas, stock bajo, alertas
  del agente, reportes nuevos).

### 🔐 Roles
| Rol | Acceso |
|-----|--------|
| **Dueño/a** | Acceso total: agente, dashboard, ventas, productos, gastos, clientes, config |
| **Encargado/a** | Agente, dashboard, ventas, productos, clientes (sin gastos) |
| **Demo** | Acceso de portfolio, igual al dueño, pensado para mostrar el producto |

---

## Tech Stack

### Frontend
| Tecnología | Uso |
|------------|-----|
| React 18 + TypeScript 5 | UI |
| Vite 5 | Build tool, code-splitting por ruta (`React.lazy`) |
| Tailwind CSS 3 | Estilos — tema "command-center" oscuro por defecto |
| Framer Motion | Animaciones |
| Recharts | Gráfico de tendencia de ventas |
| Socket.IO Client | Notificaciones y mensajes del agente en tiempo real |

### Backend
| Tecnología | Uso |
|------------|-----|
| Python 3.11+ / Flask | API |
| Flask-SocketIO | WebSockets |
| APScheduler | Ciclos autónomos del agente (monitoreo + reporte semanal) |
| Anthropic SDK | Claude Opus 4 — NL→SQL, alertas, reportes, chat con tool-use |
| PyJWT / Werkzeug | Auth |
| SQLite | Base de datos (`bymes.db`) |

---

## Instalación

### Requisitos
- Python 3.11+
- Node.js 18+
- Una [API key de Anthropic](https://console.anthropic.com/)

### 1. Backend

```bash
pip install -r requirements.txt

# Crea y puebla la base de datos (ventas, gastos, stock, clientes)
python setup_db.py

export ANTHROPIC_API_KEY=sk-ant-your-key-here   # Requerido para el agente y NL→SQL
export JWT_SECRET=your-secure-secret-key         # Opcional
export SECRET_KEY=your-flask-secret              # Opcional

python app.py
# → http://localhost:8000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

Sin `ANTHROPIC_API_KEY` la app sigue funcionando (CRUD, dashboard, detección de
anomalías): el agente usa mensajes de fallback determinísticos en vez de redactar
con Claude, y `/api/query` devuelve un error claro.

---

## Variables de entorno

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Recomendada | — | Habilita Claude para NL→SQL, alertas y reportes |
| `JWT_SECRET` | No | `bymes-dev-secret-2026` | Firma de JWT (cambiar en producción) |
| `SECRET_KEY` | No | `socketio-dev-secret` | Secret de Flask/SocketIO |
| `AGENT_MONITOR_MINUTES` | No | `20` | Frecuencia del ciclo de monitoreo del agente |
| `AGENT_REPORT_HOURS` | No | `168` | Frecuencia del reporte automático (semanal) |
| `AGENT_SCHEDULER_ENABLED` | No | `true` | Poner en `false` para desactivar los jobs en background |

---

## Cuentas de prueba

Solo la cuenta demo es pública (solo lectura, sin acceso al agente ni a gastos —
ver [Roles](#-roles)). La cuenta admin/dueño se configura por separado y no se
publica acá.

| Email | Password | Rol |
|-------|----------|-----|
| `demo@bymes.ar` | `ByMesDemo26!` | Demo |

---

## Estructura del proyecto

```
sql-assistant/
├── app.py              # Backend Flask: auth, CRUD, dashboard, notificaciones
├── agent.py             # Agente autónomo: KPIs, anomalías, reportes, chat
├── setup_db.py           # Seed de la base (ventas, gastos, stock, clientes)
├── bymes.db              # SQLite (auto-generado)
│
└── client/
    └── src/
        ├── App.tsx                    # Shell, rutas lazy-loaded, guards por rol
        ├── components/
        │   ├── AgentView.tsx          # Chat + alertas + reportes del agente
        │   ├── LoginPage.tsx          # Pantalla de login
        │   ├── Nav.tsx                # Navegación lateral
        │   └── crud/                  # Dashboard, Ventas, Productos, Gastos, Clientes
        ├── context/                   # Auth + Notifications
        └── lib/api.ts                 # Cliente de la API
```

---

## Probar el agente

Con la base recién sembrada ya hay una anomalía real para detectar (caída de
ventas en la última semana + un par de productos con quiebre de stock). Desde
la vista **Agente**:

- **"Ejecutar chequeo ahora"** corre el ciclo de monitoreo al instante.
- **"Generar reporte ahora"** arma el reporte semanal con los datos actuales.
- El cuadro de texto deja preguntarle cualquier cosa al agente sobre el negocio.

---

## License

MIT © 2026
