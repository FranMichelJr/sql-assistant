import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Box from '@carbon/icons-react/es/Box'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { Producto, Categoria } from '@/types'
import {
  CrudHeader, CrudTableWrap, Th, Td, RowActions, TableSkeleton, ErrorBanner,
  Modal, ConfirmDialog, FormField, SearchInput, FilterSelect, ViewToolbar,
  CategoryBadge, inputCls, selectCls,
} from './shared'

const EMPTY: Omit<Producto, 'id' | 'categoria_nombre'> = {
  nombre: '', categoria_id: 0, precio: 0, costo: 0, stock: 0, stock_minimo: 5, descripcion: '',
}

export function ProductosView() {
  const { user } = useAuth()
  const canWrite = user?.role === 'dueno' || user?.role === 'encargado'
  const canDelete = user?.role === 'dueno'

  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; data: typeof EMPTY; id?: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true); setError(null)
    Promise.all([api.productos.list(), api.categorias.list()])
      .then(([p, c]) => { setProductos(p); setCategorias(c) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = useMemo(() => productos.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) &&
    (!catFilter || String(p.categoria_id) === catFilter)
  ), [productos, search, catFilter])

  const openCreate = () => setModal({ mode: 'create', data: { ...EMPTY, categoria_id: categorias[0]?.id ?? 0 } })
  const openEdit = (p: Producto) => setModal({
    mode: 'edit', id: p.id,
    data: { nombre: p.nombre, categoria_id: p.categoria_id, precio: p.precio, costo: p.costo, stock: p.stock, stock_minimo: p.stock_minimo, descripcion: p.descripcion },
  })

  const handleSave = async () => {
    if (!modal) return
    setSaving(true)
    try {
      if (modal.mode === 'create') await api.productos.create(modal.data)
      else await api.productos.update(modal.id!, modal.data)
      setModal(null)
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (deleteId === null) return
    setDeleting(true)
    try {
      await api.productos.remove(deleteId)
      setDeleteId(null)
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <CrudHeader icon={<Box size={18} />} title="Productos" count={productos.length}
        onAdd={canWrite ? openCreate : undefined} addLabel="Nuevo producto" />

      <ViewToolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar producto..." />
        <FilterSelect value={catFilter} onChange={setCatFilter}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </FilterSelect>
      </ViewToolbar>

      <div className="mt-4">
        {error ? <ErrorBanner message={error} onRetry={load} /> : (
          <CrudTableWrap>
            <thead><tr>
              <Th>Producto</Th><Th>Categoría</Th><Th className="text-right">Precio</Th>
              <Th className="text-right">Costo</Th><Th className="text-right">Stock</Th><Th></Th>
            </tr></thead>
            <tbody>
              {loading ? <TableSkeleton cols={6} /> : filtered.map(p => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <Td>{p.nombre}</Td>
                  <Td><CategoryBadge category={p.categoria_nombre} /></Td>
                  <Td className="text-right font-mono">{currency.format(p.precio)}</Td>
                  <Td className="text-right font-mono text-muted-foreground">{currency.format(p.costo)}</Td>
                  <Td className={`text-right font-mono ${p.stock <= p.stock_minimo ? 'text-critical font-semibold' : ''}`}>
                    {p.stock}
                  </Td>
                  <Td>
                    {canWrite && <RowActions onEdit={() => openEdit(p)} onDelete={() => canDelete && setDeleteId(p.id)} />}
                  </Td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Sin productos</td></tr>
              )}
            </tbody>
          </CrudTableWrap>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <Modal title={modal.mode === 'create' ? 'Nuevo producto' : 'Editar producto'}
            onClose={() => setModal(null)} onSubmit={handleSave} loading={saving}>
            <FormField label="Nombre">
              <input className={inputCls} value={modal.data.nombre}
                onChange={e => setModal({ ...modal, data: { ...modal.data, nombre: e.target.value } })} />
            </FormField>
            <FormField label="Categoría">
              <select className={selectCls} value={modal.data.categoria_id}
                onChange={e => setModal({ ...modal, data: { ...modal.data, categoria_id: Number(e.target.value) } })}>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Precio">
                <input type="number" className={inputCls} value={modal.data.precio}
                  onChange={e => setModal({ ...modal, data: { ...modal.data, precio: Number(e.target.value) } })} />
              </FormField>
              <FormField label="Costo">
                <input type="number" className={inputCls} value={modal.data.costo}
                  onChange={e => setModal({ ...modal, data: { ...modal.data, costo: Number(e.target.value) } })} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Stock">
                <input type="number" className={inputCls} value={modal.data.stock}
                  onChange={e => setModal({ ...modal, data: { ...modal.data, stock: Number(e.target.value) } })} />
              </FormField>
              <FormField label="Stock mínimo">
                <input type="number" className={inputCls} value={modal.data.stock_minimo}
                  onChange={e => setModal({ ...modal, data: { ...modal.data, stock_minimo: Number(e.target.value) } })} />
              </FormField>
            </div>
            <FormField label="Descripción">
              <input className={inputCls} value={modal.data.descripcion}
                onChange={e => setModal({ ...modal, data: { ...modal.data, descripcion: e.target.value } })} />
            </FormField>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId !== null && (
          <ConfirmDialog message="¿Eliminar este producto? Esta acción no se puede deshacer."
            onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
        )}
      </AnimatePresence>
    </div>
  )
}
