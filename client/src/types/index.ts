export interface QueryResult {
  sql: string
  columns: string[]
  rows: unknown[][]
  rowCount: number
  error: string | null
}

export interface StatusMessage {
  type: 'error' | 'warning' | 'info'
  text: string
}

export interface Categoria {
  id: number
  nombre: string
  descripcion: string
}

export interface Producto {
  id: number
  nombre: string
  categoria_id: number
  categoria_nombre?: string
  precio: number
  costo: number
  stock: number
  stock_minimo: number
  descripcion: string
}

export interface Cliente {
  id: number
  nombre: string
  telefono: string
  email: string
  created_at: string
}

export type Canal = 'mostrador' | 'whatsapp' | 'mercado_libre' | 'reparto'
export type EstadoVenta = 'pendiente' | 'completada' | 'cancelada'

export interface Venta {
  id: number
  cliente_id: number | null
  cliente_nombre?: string
  canal: Canal
  estado: EstadoVenta
  total: number
  created_at: string
}

export interface VentaItem {
  id: number
  venta_id: number
  producto_id: number
  producto_nombre: string
  cantidad: number
  precio_unitario: number
}

export interface VentaDetail extends Venta {
  items: VentaItem[]
}

export interface NewVentaItem {
  producto_id: number
  producto_nombre: string
  cantidad: number
  precio_unitario: number
}

export interface Gasto {
  id: number
  categoria: string
  descripcion: string
  monto: number
  created_at: string
}

export interface MovimientoStock {
  id: number
  producto_id: number
  tipo: 'entrada' | 'salida'
  cantidad: number
  notas: string
  user_email: string
  created_at: string
}

export type AppView = 'agente' | 'dashboard' | 'ventas' | 'productos' | 'gastos' | 'clientes' | 'settings'

export type UserRole = 'dueno' | 'encargado' | 'demo'

export type NotificationType = 'nueva_venta' | 'stock_bajo' | 'cambio_estado' | 'agent_alert' | 'agent_report'

export interface AppNotification {
  id: number
  type: NotificationType
  title: string
  message: string
  data: Record<string, unknown>
  read: boolean
  created_at: string
}

export interface User {
  email: string
  name: string
  role: UserRole
}

export interface SalesPeriodData {
  period: string
  ventas: number
  revenue: number
}

export interface SalesReport {
  data: SalesPeriodData[]
  total_ventas: number
  total_revenue: number
}

export interface ProductReport {
  id: number
  nombre: string
  categoria: string | null
  unidades_vendidas: number
  revenue: number
  precio: number
  stock: number
}

export interface DashboardMetrics {
  ventas_hoy: { total: number; cantidad: number }
  ventas_semana: { total: number; cantidad: number }
  ventas_mes: { total: number; cantidad: number }
  gastos_mes: number
  margen_mes: number
  stock_critico_count: number
  total_clientes: number
  ventas_por_dia: { dia: string; total: number; ventas: number }[]
  top_productos: { nombre: string; unidades_vendidas: number; revenue: number }[]
  ventas_recientes: { id: number; cliente_nombre: string | null; canal: Canal; estado: EstadoVenta; total: number; created_at: string }[]
  productos_stock_critico: { id: number; nombre: string; stock: number; stock_minimo: number }[]
}

// ── Agente autónomo ─────────────────────────────────────────────────────────

export type AgentMessageRole = 'agent' | 'user'

export interface AgentMessage {
  id: number
  role: AgentMessageRole
  content: string
  related_notification_id: number | null
  created_at: string
}

export interface AgentReportSummary {
  id: number
  period_start: string
  period_end: string
  title: string
  created_at: string
}

export interface AgentReportDetail extends AgentReportSummary {
  summary_md: string
  kpis: Record<string, unknown>
}
