import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import OrderDetails from '@carbon/icons-react/es/OrderDetails'
import { Eye, Plus, X, Search, Trash2 } from 'lucide-react'
import type { Order, OrderStatus, OrderDetail, Customer, Product, NewOrderItem } from '@/types'
import { api } from '@/lib/api'
import { exportToCsv } from '@/lib/csv'
import {
  ConfirmDialog, CrudHeader, CrudTableWrap,
  Th, Td, TableSkeleton, ErrorBanner,
  FilterSelect, ExportButton, ViewToolbar, inputCls, selectCls, FormField, Modal,
} from './shared'

const STATUS_CFG: Record<OrderStatus, { label: string; cls: string }> = {
  pending:    { label: 'Pendiente',   cls: 'text-yellow-500  bg-yellow-500/10  border-yellow-500/20'  },
  processing: { label: 'Procesando',  cls: 'text-blue-400    bg-blue-400/10    border-blue-400/20'    },
  shipped:    { label: 'Enviado',     cls: 'text-blue-400    bg-blue-400/10    border-blue-400/20'    },
  delivered:  { label: 'Entregado',   cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  cancelled:  { label: 'Cancelado',   cls: 'text-red-400     bg-red-400/10     border-red-400/20'     },
}
const ALL_STATUSES: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

// ── Order Detail Modal ────────────────────────────────────────────────────

function OrderDetailModal({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.orders.detail(orderId)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orderId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            Detalle de Orden {detail ? `#${detail.id}` : ''}
          </h2>
          <button type="button" onClick={onClose}
            className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-muted/40 rounded animate-pulse" style={{ width: `${50 + i * 15}%` }} />
            ))}
          </div>
        ) : !detail ? (
          <p className="p-6 text-sm text-muted-foreground">No se pudo cargar</p>
        ) : (
          <div className="overflow-y-auto max-h-[70vh]">
            {/* Order meta */}
            <div className="px-6 py-4 grid grid-cols-2 gap-3 text-sm border-b border-border">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Cliente</span>
                <p className="font-medium mt-0.5">{detail.customer_name ?? `#${detail.customer_id}`}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Fecha</span>
                <p className="font-mono mt-0.5">{detail.created_at ? new Date(detail.created_at).toLocaleDateString('es-AR') : '—'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Estado</span>
                <p className="mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${STATUS_CFG[detail.status].cls}`}>
                    {STATUS_CFG[detail.status].label}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Total</span>
                <p className="font-mono font-semibold text-primary mt-0.5">${detail.total.toFixed(2)}</p>
              </div>
            </div>

            {/* Items */}
            <div className="px-6 py-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Productos</h3>
              {detail.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin items</p>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Producto</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cant.</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">P. Unit.</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map(item => (
                        <tr key={item.id} className="border-b border-border/50 last:border-0">
                          <td className="px-4 py-3 text-sm">{item.product_name}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">${item.unit_price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-sm">
                            ${(item.quantity * item.unit_price).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/20">
                        <td colSpan={3} className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                          ${detail.total.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ── New Order Modal ───────────────────────────────────────────────────────

function NewOrderModal({
  customers,
  products,
  onClose,
  onCreated,
}: {
  customers: Customer[]
  products: Product[]
  onClose: () => void
  onCreated: (order: Order) => void
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? 0)
  const [items, setItems] = useState<NewOrderItem[]>([])
  const [search, setSearch] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const [saving, setSaving] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() =>
    products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8),
    [products, search]
  )

  const addProduct = (p: Product) => {
    setItems(prev => {
      const ex = prev.find(i => i.product_id === p.id)
      if (ex) return prev.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product_id: p.id, product_name: p.name, quantity: 1, unit_price: p.price }]
    })
    setSearch(''); setShowDrop(false)
  }

  const updateItem = (pid: number, field: 'quantity' | 'unit_price', val: number) => {
    setItems(prev => prev.map(i => i.product_id === pid ? { ...i, [field]: val } : i))
  }

  const removeItem = (pid: number) => setItems(prev => prev.filter(i => i.product_id !== pid))

  const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSubmit = async () => {
    if (!customerId || items.length === 0) return
    setSaving(true)
    try {
      const order = await api.orders.create({ customer_id: customerId, items })
      onCreated(order)
      onClose()
    } catch (e) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Nueva Orden</h2>
          <button type="button" onClick={onClose}
            className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
          {/* Customer */}
          <FormField label="Cliente">
            <select className={selectCls} value={customerId}
              onChange={e => setCustomerId(parseInt(e.target.value))}>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </FormField>

          {/* Product search */}
          <FormField label="Agregar producto">
            <div className="relative" ref={searchRef}>
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                className={`${inputCls} pl-8`}
                placeholder="Buscar producto..."
                value={search}
                onChange={e => { setSearch(e.target.value); setShowDrop(true) }}
                onFocus={() => setShowDrop(true)}
              />
              {showDrop && search && filtered.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                  {filtered.map(p => (
                    <button key={p.id} type="button"
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors text-left"
                      onClick={() => addProduct(p)}
                    >
                      <span className="text-sm text-foreground truncate">{p.name}</span>
                      <span className="text-xs font-mono text-muted-foreground ml-2 shrink-0">
                        ${p.price.toFixed(2)} · stock {p.stock}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormField>

          {/* Items list */}
          {items.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Producto</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-20">Cant.</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-24">P. Unit.</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-24">Sub.</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.product_id} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2 text-sm truncate max-w-[150px]">{item.product_name}</td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" min={1} value={item.quantity}
                          onChange={e => updateItem(item.product_id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 bg-muted/30 border border-border rounded px-2 py-1 text-xs text-right font-mono outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" min={0} step={0.01} value={item.unit_price}
                          onChange={e => updateItem(item.product_id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-20 bg-muted/30 border border-border rounded px-2 py-1 text-xs text-right font-mono outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs font-semibold">
                        ${(item.quantity * item.unit_price).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => removeItem(item.product_id)}
                          className="size-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/20">
                    <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-primary text-sm">${total.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-5">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit}
            disabled={saving || items.length === 0 || !customerId}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? 'Creando…' : `Crear Orden · $${total.toFixed(2)}`}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main View ─────────────────────────────────────────────────────────────

export function OrdersView() {
  const [items, setItems] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [statusDraft, setStatusDraft] = useState<OrderStatus>('pending')
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [detailId, setDetailId] = useState<number | null>(null)
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [orders, custs, prods] = await Promise.all([
        api.orders.list(),
        api.customers.list(),
        api.products.list(),
      ])
      setItems(orders); setCustomers(custs); setProducts(prods)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() =>
    statusFilter === 'all' ? items : items.filter(o => o.status === statusFilter),
    [items, statusFilter]
  )

  const startEdit = (o: Order) => { setEditingId(o.id); setStatusDraft(o.status) }
  const cancelEdit = () => setEditingId(null)

  const saveStatus = async (id: number) => {
    setSaving(true)
    try {
      await api.orders.update(id, { status: statusDraft })
      setItems(prev => prev.map(o => o.id === id ? { ...o, status: statusDraft } : o))
      setEditingId(null)
    } catch (e) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (deleteId === null) return
    setDeleting(true)
    try {
      await api.orders.remove(deleteId)
      setItems(prev => prev.filter(o => o.id !== deleteId))
      setDeleteId(null)
    } catch (e) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setDeleting(false) }
  }

  const handleExport = () => {
    exportToCsv(filtered.map(o => ({
      id: o.id,
      cliente: o.customer_name ?? '',
      estado: STATUS_CFG[o.status].label,
      total: o.total,
      fecha: o.created_at,
    })), 'ordenes.csv')
  }

  return (
    <motion.div
      key="orders"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
      className="p-6 flex flex-col gap-4"
    >
      <CrudHeader
        icon={<OrderDetails size={18} />}
        title="Órdenes"
        count={filtered.length}
        onAdd={() => setNewOrderOpen(true)}
        addLabel="Nueva Orden"
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <ViewToolbar>
        <FilterSelect value={statusFilter} onChange={setStatusFilter}>
          <option value="all">Todos los estados</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_CFG[s].label}</option>
          ))}
        </FilterSelect>
        <ExportButton onClick={handleExport} />
      </ViewToolbar>

      <CrudTableWrap>
        <thead>
          <tr>
            <Th className="w-16"># Orden</Th>
            <Th>Cliente</Th>
            <Th>Estado</Th>
            <Th className="text-right">Total</Th>
            <Th>Fecha</Th>
            <Th className="w-32 text-right">Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? <TableSkeleton cols={6} /> : filtered.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">Sin órdenes</td></tr>
          ) : filtered.map(o => {
            const cfg = STATUS_CFG[o.status]
            const isEditing = editingId === o.id
            return (
              <tr key={o.id} className="hover:bg-muted/20 transition-colors duration-200">
                <Td className="font-mono text-xs text-muted-foreground">#{o.id}</Td>
                <Td className="font-medium whitespace-nowrap">{o.customer_name ?? `Cliente #${o.customer_id}`}</Td>
                <Td>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="bg-muted/30 border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        value={statusDraft}
                        onChange={e => setStatusDraft(e.target.value as OrderStatus)}
                      >
                        {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                      </select>
                      <button type="button" onClick={() => saveStatus(o.id)} disabled={saving}
                        className="px-2 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                        {saving ? '…' : 'OK'}
                      </button>
                      <button type="button" onClick={cancelEdit}
                        className="px-2 py-1 text-xs rounded-md hover:bg-muted/60 text-muted-foreground">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  )}
                </Td>
                <Td className="text-right font-mono font-semibold">${o.total.toFixed(2)}</Td>
                <Td className="text-muted-foreground text-xs font-mono whitespace-nowrap">
                  {o.created_at ? new Date(o.created_at).toLocaleDateString('es-AR') : '—'}
                </Td>
                <Td>
                  <div className="flex items-center gap-1 justify-end">
                    <button type="button" onClick={() => setDetailId(o.id)}
                      className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                      title="Ver detalle">
                      <Eye size={14} />
                    </button>
                    <button type="button" onClick={() => startEdit(o)}
                      className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                      title="Cambiar estado">
                      <span className="text-xs font-mono">⇄</span>
                    </button>
                    <button type="button" onClick={() => setDeleteId(o.id)}
                      className="size-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </tr>
            )
          })}
        </tbody>
      </CrudTableWrap>

      <AnimatePresence>
        {detailId !== null && (
          <OrderDetailModal key="detail" orderId={detailId} onClose={() => setDetailId(null)} />
        )}
        {newOrderOpen && (
          <NewOrderModal
            key="new-order"
            customers={customers}
            products={products}
            onClose={() => setNewOrderOpen(false)}
            onCreated={order => setItems(prev => [order, ...prev])}
          />
        )}
        {deleteId !== null && (
          <ConfirmDialog
            message="¿Eliminar esta orden permanentemente? Esta acción no se puede deshacer."
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
