import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Box from '@carbon/icons-react/es/Box'
import { TrendingUp, TrendingDown, History, X } from 'lucide-react'
import type { Product, Category, StockMovement } from '@/types'
import { api } from '@/lib/api'
import { exportToCsv } from '@/lib/csv'
import { useActivity } from '@/context/ActivityContext'
import { useAuth } from '@/context/AuthContext'
import {
  Modal, ConfirmDialog, CrudHeader, CrudTableWrap,
  Th, Td, RowActions, TableSkeleton, ErrorBanner,
  FormField, inputCls, selectCls,
  SearchInput, FilterSelect, ExportButton, ViewToolbar, CategoryBadge,
} from './shared'

type ProductForm = Omit<Product, 'id' | 'category_name'>
const EMPTY: ProductForm = { name: '', category_id: 0, price: 0, stock: 0, description: '' }

// ── Stock Movement Modal ──────────────────────────────────────────────────

function StockMovementModal({
  product,
  onClose,
  onDone,
}: {
  product: Product
  onClose: () => void
  onDone: (newStock: number) => void
}) {
  const [movType, setMovType] = useState<'entrada' | 'salida'>('entrada')
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (qty <= 0) return
    setSaving(true)
    try {
      const res = await api.products.addMovement(product.id, { type: movType, quantity: qty, notes })
      onDone(res.new_stock)
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
        className="relative bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Movimiento de Stock</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">{product.name}</p>
          </div>
          <button type="button" onClick={onClose}
            className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Stock actual */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/20 border border-border">
            <span className="text-xs text-muted-foreground">Stock actual</span>
            <span className={`font-mono font-semibold text-sm ${product.stock < 10 ? 'text-yellow-500' : 'text-foreground'}`}>
              {product.stock} u.
            </span>
          </div>

          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            {(['entrada', 'salida'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => setMovType(t)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  movType === t
                    ? t === 'entrada'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-red-500/15 border-red-500/40 text-red-400'
                    : 'border-border text-muted-foreground hover:bg-muted/40'
                }`}>
                {t === 'entrada' ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                {t === 'entrada' ? 'Entrada' : 'Salida'}
              </button>
            ))}
          </div>

          <FormField label="Cantidad">
            <input type="number" min={1} value={qty} className={inputCls}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
          </FormField>

          <FormField label="Notas (opcional)">
            <input className={inputCls} value={notes} placeholder="Ej: reposición de proveedor..."
              onChange={e => setNotes(e.target.value)} />
          </FormField>

          {/* Preview */}
          {qty > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/10 border border-border/50 text-xs font-mono">
              <span className="text-muted-foreground">Stock resultante</span>
              <span className="font-semibold text-primary">
                {movType === 'entrada' ? product.stock + qty : Math.max(0, product.stock - qty)} u.
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-5">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving || qty <= 0}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? 'Guardando…' : 'Registrar'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Movement History Modal ────────────────────────────────────────────────

function MovementHistoryModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.products.movements(product.id)
      .then(setMovements)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [product.id])

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
          <div>
            <h2 className="text-base font-semibold text-foreground">Historial de Stock</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">{product.name}</p>
          </div>
          <button type="button" onClick={onClose}
            className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[65vh]">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : movements.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              Sin movimientos registrados
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {movements.map(m => (
                <div key={m.id} className="flex items-center gap-4 px-6 py-3">
                  <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                    m.type === 'entrada' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {m.type === 'entrada' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${m.type === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {m.type === 'entrada' ? '+' : '-'}{m.quantity}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">{m.type}</span>
                    </div>
                    {m.notes && <p className="text-xs text-muted-foreground truncate">{m.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString('es-AR')}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 truncate max-w-[100px]">{m.user_email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Main View ─────────────────────────────────────────────────────────────

export function ProductsView() {
  const { addActivity } = useActivity()
  const { user } = useAuth()
  const isReadonly = user?.role === 'espectador'
  const [items, setItems] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY)
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [movProduct, setMovProduct] = useState<Product | null>(null)
  const [histProduct, setHistProduct] = useState<Product | null>(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('0')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [prods, cats] = await Promise.all([api.products.list(), api.categories.list()])
      setItems(prods); setCategories(cats)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let list = items
    if (categoryFilter !== '0') list = list.filter(p => p.category_id === parseInt(categoryFilter))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || (p.category_name ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [items, search, categoryFilter])

  const openAdd = () => {
    setEditing(null); setForm({ ...EMPTY, category_id: categories[0]?.id ?? 0 }); setModalOpen(true)
  }
  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ name: p.name, category_id: p.category_id, price: p.price, stock: p.stock, description: p.description })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await api.products.update(editing.id, form)
        const cat = categories.find(c => c.id === form.category_id)
        setItems(prev => prev.map(p => p.id === editing.id ? { ...p, ...form, category_name: cat?.name } : p))
        addActivity({ type: 'update', entity: 'product', entityName: form.name, userName: user?.name ?? 'Usuario' })
      } else {
        const created = await api.products.create(form)
        const cat = categories.find(c => c.id === form.category_id)
        setItems(prev => [...prev, { ...created, category_name: cat?.name }])
        addActivity({ type: 'create', entity: 'product', entityName: form.name, userName: user?.name ?? 'Usuario' })
      }
      setModalOpen(false)
    } catch (e) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (deleteId === null) return
    setDeleting(true)
    try {
      await api.products.remove(deleteId)
      setItems(prev => prev.filter(p => p.id !== deleteId))
      setDeleteId(null)
    } catch (e) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setDeleting(false) }
  }

  const handleExport = () => {
    exportToCsv(filtered.map(p => ({
      id: p.id, nombre: p.name, categoría: p.category_name ?? '',
      precio: p.price, stock: p.stock, descripción: p.description,
    })), 'productos.csv')
  }

  return (
    <motion.div
      key="products"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
      className="p-6 flex flex-col gap-4"
    >
      <CrudHeader
        icon={<Box size={18} />}
        title="Productos"
        count={filtered.length}
        onAdd={isReadonly ? undefined : openAdd}
        addLabel="Nuevo producto"
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <ViewToolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o categoría..." />
        <FilterSelect value={categoryFilter} onChange={setCategoryFilter}>
          <option value="0">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </FilterSelect>
        <ExportButton onClick={handleExport} />
      </ViewToolbar>

      <CrudTableWrap>
        <thead>
          <tr>
            <Th className="w-12">#</Th>
            <Th>Nombre</Th>
            <Th>Categoría</Th>
            <Th className="text-right">Precio</Th>
            <Th className="text-right">Stock</Th>
            <Th className="w-36 text-right">Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeleton cols={6} />
          ) : filtered.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">Sin resultados</td></tr>
          ) : (
            filtered.map(p => (
              <tr key={p.id} className="hover:bg-muted/20 transition-colors duration-200">
                <Td className="text-muted-foreground font-mono text-xs">{p.id}</Td>
                <Td className="font-medium max-w-[200px] truncate">{p.name}</Td>
                <Td><CategoryBadge category={p.category_name} /></Td>
                <Td className="text-right font-mono">${p.price.toFixed(2)}</Td>
                <Td className={`text-right font-mono ${p.stock < 10 ? 'text-yellow-500' : ''}`}>{p.stock}</Td>
                <Td>
                  <div className="flex items-center gap-1 justify-end">
                    <button type="button" onClick={() => setMovProduct(p)}
                      className="size-7 flex items-center justify-center rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-colors"
                      title="Registrar movimiento de stock">
                      <TrendingUp size={14} />
                    </button>
                    <button type="button" onClick={() => setHistProduct(p)}
                      className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                      title="Ver historial de stock">
                      <History size={14} />
                    </button>
                    {!isReadonly && <RowActions onEdit={() => openEdit(p)} onDelete={() => setDeleteId(p.id)} />}
                  </div>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </CrudTableWrap>

      <AnimatePresence>
        {movProduct && (
          <StockMovementModal
            key="mov"
            product={movProduct}
            onClose={() => setMovProduct(null)}
            onDone={newStock => {
              setItems(prev => prev.map(p => p.id === movProduct.id ? { ...p, stock: newStock } : p))
              setMovProduct(null)
            }}
          />
        )}
        {histProduct && (
          <MovementHistoryModal key="hist" product={histProduct} onClose={() => setHistProduct(null)} />
        )}
        {modalOpen && (
          <Modal
            title={editing ? 'Editar producto' : 'Nuevo producto'}
            onClose={() => setModalOpen(false)}
            onSubmit={handleSave}
            loading={saving}
          >
            <FormField label="Nombre">
              <input className={inputCls} value={form.name} placeholder="Nombre del producto"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Precio">
                <input type="number" min={0} step={0.01} className={inputCls} value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
              </FormField>
              <FormField label="Stock">
                <input type="number" min={0} className={inputCls} value={form.stock}
                  onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} />
              </FormField>
            </div>
            <FormField label="Categoría">
              <select className={selectCls} value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: parseInt(e.target.value) }))}>
                <option value={0}>Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Descripción">
              <textarea className={inputCls + ' resize-none'} rows={2} value={form.description}
                placeholder="Descripción opcional"
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </FormField>
          </Modal>
        )}
        {deleteId !== null && (
          <ConfirmDialog
            message="¿Eliminar este producto permanentemente?"
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
