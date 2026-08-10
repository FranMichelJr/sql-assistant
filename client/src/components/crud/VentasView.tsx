import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ShoppingCart from '@carbon/icons-react/es/ShoppingCart'
import { TrashCan as TrashIcon } from './shared'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { Venta, Cliente, Producto, NewVentaItem, Canal, EstadoVenta } from '@/types'
import {
  CrudHeader, CrudTableWrap, Th, Td, TableSkeleton, ErrorBanner,
  Modal, FormField, SearchInput, FilterSelect, ViewToolbar, CategoryBadge,
  inputCls, selectCls, CANAL_LABEL,
} from './shared'

const ESTADO_LABEL: Record<EstadoVenta, string> = {
  pendiente: 'Pendiente', completada: 'Completada', cancelada: 'Cancelada',
}
const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export function VentasView() {
  const { user } = useAuth()
  const canWrite = user?.role === 'dueno' || user?.role === 'encargado'
  const canDelete = user?.role === 'dueno'

  const [ventas, setVentas] = useState<Venta[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [clienteId, setClienteId] = useState<number | ''>('')
  const [canal, setCanal] = useState<Canal>('mostrador')
  const [items, setItems] = useState<NewVentaItem[]>([])
  const [pickProducto, setPickProducto] = useState<number | ''>('')
  const [pickCantidad, setPickCantidad] = useState(1)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true); setError(null)
    Promise.all([api.ventas.list(), api.clientes.list(), api.productos.list()])
      .then(([v, c, p]) => { setVentas(v); setClientes(c); setProductos(p) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = useMemo(() => ventas.filter(v =>
    (v.cliente_nombre ?? 'consumidor final').toLowerCase().includes(search.toLowerCase()) &&
    (!estadoFilter || v.estado === estadoFilter)
  ), [ventas, search, estadoFilter])

  const total = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)

  const addItem = () => {
    if (!pickProducto) return
    const p = productos.find(p => p.id === pickProducto)
    if (!p) return
    setItems(prev => [...prev, { producto_id: p.id, producto_nombre: p.nombre, cantidad: pickCantidad, precio_unitario: p.precio }])
    setPickProducto(''); setPickCantidad(1)
  }

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  const openCreate = () => { setClienteId(''); setCanal('mostrador'); setItems([]); setModalOpen(true) }

  const handleSave = async () => {
    if (items.length === 0) return
    setSaving(true)
    try {
      await api.ventas.create({ cliente_id: clienteId === '' ? null : clienteId, canal, items })
      setModalOpen(false)
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleEstadoChange = async (id: number, estado: EstadoVenta) => {
    try { await api.ventas.update(id, { estado }); load() } catch (e) { alert(e instanceof Error ? e.message : 'Error') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta venta?')) return
    try { await api.ventas.remove(id); load() } catch (e) { alert(e instanceof Error ? e.message : 'Error') }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <CrudHeader icon={<ShoppingCart size={18} />} title="Ventas" count={ventas.length}
        onAdd={canWrite ? openCreate : undefined} addLabel="Nueva venta" />

      <ViewToolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por cliente..." />
        <FilterSelect value={estadoFilter} onChange={setEstadoFilter}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </FilterSelect>
      </ViewToolbar>

      <div className="mt-4">
        {error ? <ErrorBanner message={error} onRetry={load} /> : (
          <CrudTableWrap>
            <thead><tr>
              <Th>Cliente</Th><Th>Canal</Th><Th>Estado</Th><Th className="text-right">Total</Th><Th>Fecha</Th><Th></Th>
            </tr></thead>
            <tbody>
              {loading ? <TableSkeleton cols={6} /> : filtered.map(v => (
                <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                  <Td>{v.cliente_nombre ?? 'Consumidor final'}</Td>
                  <Td><CategoryBadge category={CANAL_LABEL[v.canal]} /></Td>
                  <Td>
                    {canWrite ? (
                      <select className="bg-transparent text-xs border border-border rounded-md px-2 py-1 cursor-pointer"
                        value={v.estado} onChange={e => handleEstadoChange(v.id, e.target.value as EstadoVenta)}>
                        {Object.entries(ESTADO_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    ) : ESTADO_LABEL[v.estado]}
                  </Td>
                  <Td className="text-right font-mono">{currency.format(v.total)}</Td>
                  <Td className="text-muted-foreground text-xs">{v.created_at.slice(0, 10)}</Td>
                  <Td>
                    {canDelete && (
                      <button onClick={() => handleDelete(v.id)}
                        className="size-7 flex items-center justify-center rounded-lg hover:bg-critical/10 text-muted-foreground hover:text-critical transition-colors ml-auto">
                        <TrashIcon size={14} />
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Sin ventas</td></tr>
              )}
            </tbody>
          </CrudTableWrap>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <Modal title="Nueva venta" onClose={() => setModalOpen(false)} onSubmit={handleSave}
            submitLabel="Registrar venta" loading={saving}>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Cliente">
                <select className={selectCls} value={clienteId} onChange={e => setClienteId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Consumidor final</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </FormField>
              <FormField label="Canal">
                <select className={selectCls} value={canal} onChange={e => setCanal(e.target.value as Canal)}>
                  {Object.entries(CANAL_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </FormField>
            </div>

            <FormField label="Productos">
              <div className="flex gap-2">
                <select className={`${selectCls} flex-1`} value={pickProducto} onChange={e => setPickProducto(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Elegir producto…</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {currency.format(p.precio)}</option>)}
                </select>
                <input type="number" min={1} className={`${inputCls} w-16`} value={pickCantidad}
                  onChange={e => setPickCantidad(Math.max(1, Number(e.target.value)))} />
                <button type="button" onClick={addItem}
                  className="px-3 rounded-lg text-sm font-medium bg-primary/12 text-primary border border-primary/25 hover:bg-primary/20 transition-colors">
                  +
                </button>
              </div>
            </FormField>

            {items.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-lg border border-border p-2">
                {items.map((it, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center justify-between text-xs px-1">
                    <span>{it.cantidad}× {it.producto_nombre}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">{currency.format(it.cantidad * it.precio_unitario)}</span>
                      <button type="button" onClick={() => removeItem(i)} className="text-muted-foreground hover:text-critical">✕</button>
                    </div>
                  </motion.div>
                ))}
                <div className="flex items-center justify-between text-sm font-semibold pt-1.5 border-t border-border px-1">
                  <span>Total</span><span className="font-mono">{currency.format(total)}</span>
                </div>
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}
