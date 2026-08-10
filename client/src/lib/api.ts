import type {
  Categoria, Producto, Cliente, Venta, VentaDetail, DashboardMetrics,
  MovimientoStock, SalesReport, ProductReport, NewVentaItem, Gasto,
  AgentMessage, AgentReportSummary, AgentReportDetail,
} from '@/types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (res.status === 401) {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    window.location.reload()
    throw new Error('Sesión expirada')
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { const b = await res.json(); msg = b.error ?? msg } catch {}
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

export const api = {
  categorias: {
    list: () => req<Categoria[]>('/api/categorias'),
    create: (d: Omit<Categoria, 'id'>) =>
      req<Categoria>('/api/categorias', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: number, d: Partial<Categoria>) =>
      req<{ ok: boolean }>(`/api/categorias/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id: number) =>
      req<{ ok: boolean }>(`/api/categorias/${id}`, { method: 'DELETE' }),
  },
  productos: {
    list: () => req<Producto[]>('/api/productos'),
    create: (d: Omit<Producto, 'id' | 'categoria_nombre'>) =>
      req<Producto>('/api/productos', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: number, d: Partial<Omit<Producto, 'categoria_nombre'>>) =>
      req<{ ok: boolean }>(`/api/productos/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id: number) =>
      req<{ ok: boolean }>(`/api/productos/${id}`, { method: 'DELETE' }),
    movimientos: (id: number) =>
      req<MovimientoStock[]>(`/api/productos/${id}/movimientos`),
    addMovimiento: (id: number, d: { tipo: string; cantidad: number; notas: string }) =>
      req<{ id: number; new_stock: number }>(`/api/productos/${id}/movimientos`, {
        method: 'POST', body: JSON.stringify(d),
      }),
  },
  clientes: {
    list: () => req<Cliente[]>('/api/clientes'),
    create: (d: Omit<Cliente, 'id' | 'created_at'>) =>
      req<Cliente>('/api/clientes', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: number, d: Partial<Cliente>) =>
      req<{ ok: boolean }>(`/api/clientes/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id: number) =>
      req<{ ok: boolean }>(`/api/clientes/${id}`, { method: 'DELETE' }),
  },
  ventas: {
    list: () => req<Venta[]>('/api/ventas'),
    detail: (id: number) => req<VentaDetail>(`/api/ventas/${id}`),
    create: (d: { cliente_id: number | null; canal: string; items: NewVentaItem[] }) =>
      req<Venta>('/api/ventas', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: number, d: Partial<Venta>) =>
      req<{ ok: boolean }>(`/api/ventas/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id: number) =>
      req<{ ok: boolean }>(`/api/ventas/${id}`, { method: 'DELETE' }),
  },
  gastos: {
    list: () => req<Gasto[]>('/api/gastos'),
    create: (d: { categoria: string; descripcion: string; monto: number }) =>
      req<Gasto>('/api/gastos', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: number, d: Partial<{ categoria: string; descripcion: string; monto: number }>) =>
      req<{ ok: boolean }>(`/api/gastos/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id: number) =>
      req<{ ok: boolean }>(`/api/gastos/${id}`, { method: 'DELETE' }),
  },
  dashboard: {
    get: () => req<DashboardMetrics>('/api/dashboard'),
  },
  reports: {
    ventas: (period: string) => req<SalesReport>(`/api/reports/ventas?period=${period}`),
    productos: () => req<ProductReport[]>('/api/reports/productos'),
  },
  query: (question: string) =>
    req<{ success: boolean; sql: string | null; columns?: string[]; rows?: unknown[][]; row_count?: number; error?: string }>(
      '/api/query', { method: 'POST', body: JSON.stringify({ question }) },
    ),
  agent: {
    messages: () => req<AgentMessage[]>('/api/agent/messages'),
    chat: (message: string) =>
      req<AgentMessage>('/api/agent/chat', { method: 'POST', body: JSON.stringify({ message }) }),
    reports: () => req<AgentReportSummary[]>('/api/agent/reports'),
    report: (id: number) => req<AgentReportDetail>(`/api/agent/reports/${id}`),
    runNow: () => req<{ anomalies: number; message?: string }>('/api/agent/run-now', { method: 'POST' }),
    generateReport: () => req<{ report_id: number; title: string }>('/api/agent/generate-report', { method: 'POST' }),
  },
}
