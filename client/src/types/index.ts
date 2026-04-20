export interface QueryResult {
  sql: string
  columns: string[]
  rows: unknown[][]
  rowCount: number
  error: string | null
}

export interface HistoryItem {
  id: number
  question: string
  sql: string | null
  columns: string[]
  rows: unknown[][]
  rowCount: number
  error: string | null
  timestamp: Date
}

export interface StatusMessage {
  type: 'error' | 'warning' | 'info'
  text: string
}

export interface Category {
  id: number
  name: string
  description: string
}

export interface Product {
  id: number
  name: string
  category_id: number
  category_name?: string
  price: number
  stock: number
  description: string
}

export interface Customer {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  city: string
  country: string
  created_at: string
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export interface Order {
  id: number
  customer_id: number
  customer_name?: string
  status: OrderStatus
  total: number
  created_at: string
}

export type AppView = 'query' | 'dashboard' | 'products' | 'customers' | 'orders' | 'categories' | 'lowstock' | 'reports' | 'settings' | 'profile'

export type UserRole = 'admin' | 'vendedor' | 'bodega'

export type NotificationType = 'new_order' | 'low_stock' | 'status_change'

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

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
}

export interface OrderDetail extends Order {
  items: OrderItem[]
}

export interface NewOrderItem {
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
}

export interface StockMovement {
  id: number
  product_id: number
  type: 'entrada' | 'salida'
  quantity: number
  notes: string
  user_email: string
  created_at: string
}

export interface SalesPeriodData {
  period: string
  orders: number
  revenue: number
}

export interface SalesReport {
  data: SalesPeriodData[]
  total_orders: number
  total_revenue: number
}

export interface ProductReport {
  id: number
  name: string
  category: string | null
  units_sold: number
  revenue: number
  price: number
  stock: number
}

export interface DashboardMetrics {
  total_sales: number
  monthly_orders: number
  low_stock_count: number
  total_customers: number
  sales_by_month: { month: string; total: number; orders: number }[]
  top_products: { name: string; units_sold: number; revenue: number }[]
  recent_orders: { id: number; customer_name: string; status: OrderStatus; total: number; created_at: string }[]
}
