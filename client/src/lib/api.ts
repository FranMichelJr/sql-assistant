import type {
  Category, Product, Customer, Order, OrderDetail, DashboardMetrics,
  StockMovement, SalesReport, ProductReport, NewOrderItem,
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
  categories: {
    list: () => req<Category[]>('/api/categories'),
    create: (d: Omit<Category, 'id'>) =>
      req<Category>('/api/categories', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: number, d: Partial<Category>) =>
      req<{ ok: boolean }>(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id: number) =>
      req<{ ok: boolean }>(`/api/categories/${id}`, { method: 'DELETE' }),
  },
  products: {
    list: () => req<Product[]>('/api/products'),
    create: (d: Omit<Product, 'id' | 'category_name'>) =>
      req<Product>('/api/products', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: number, d: Partial<Omit<Product, 'category_name'>>) =>
      req<{ ok: boolean }>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id: number) =>
      req<{ ok: boolean }>(`/api/products/${id}`, { method: 'DELETE' }),
    movements: (id: number) =>
      req<StockMovement[]>(`/api/products/${id}/movements`),
    addMovement: (id: number, d: { type: string; quantity: number; notes: string }) =>
      req<{ id: number; new_stock: number }>(`/api/products/${id}/movements`, {
        method: 'POST', body: JSON.stringify(d),
      }),
  },
  customers: {
    list: () => req<Customer[]>('/api/customers'),
    create: (d: Omit<Customer, 'id' | 'created_at'>) =>
      req<Customer>('/api/customers', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: number, d: Partial<Customer>) =>
      req<{ ok: boolean }>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id: number) =>
      req<{ ok: boolean }>(`/api/customers/${id}`, { method: 'DELETE' }),
  },
  orders: {
    list: () => req<Order[]>('/api/orders'),
    detail: (id: number) => req<OrderDetail>(`/api/orders/${id}`),
    create: (d: { customer_id: number; items: NewOrderItem[] }) =>
      req<Order>('/api/orders', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: number, d: Partial<Order>) =>
      req<{ ok: boolean }>(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id: number) =>
      req<{ ok: boolean }>(`/api/orders/${id}`, { method: 'DELETE' }),
  },
  auth: {
    changePassword: (current_password: string, new_password: string) =>
      req<{ ok: boolean }>('/api/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password, new_password }),
      }),
  },
  dashboard: {
    get: () => req<DashboardMetrics>('/api/dashboard'),
  },
  reports: {
    sales: (period: string) => req<SalesReport>(`/api/reports/sales?period=${period}`),
    products: () => req<ProductReport[]>('/api/reports/products'),
  },
}
