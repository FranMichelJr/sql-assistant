import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Receipt from '@carbon/icons-react/es/Receipt'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { Gasto } from '@/types'
import {
  CrudHeader, CrudTableWrap, Th, Td, RowActions, TableSkeleton, ErrorBanner,
  Modal, ConfirmDialog, FormField, FilterSelect, ViewToolbar, CategoryBadge, inputCls, selectCls,
} from './shared'

const CATEGORIAS_GASTO = ['Alquiler', 'Sueldos', 'Servicios', 'Impuestos', 'Insumos', 'Otros']
const EMPTY = { categoria: CATEGORIAS_GASTO[0], descripcion: '', monto: 0 }
const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export function GastosView() {
  const { user } = useAuth()
  const canWrite = user?.role === 'dueno' || user?.role === 'encargado'
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catFilter, setCatFilter] = useState('')
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; data: typeof EMPTY; id?: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true); setError(null)
    api.gastos.list().then(setGastos).catch(e => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = useMemo(() => gastos.filter(g => !catFilter || g.categoria === catFilter), [gastos, catFilter])
  const totalFiltrado = filtered.reduce((s, g) => s + g.monto, 0)

  const openCreate = () => setModal({ mode: 'create', data: { ...EMPTY } })
  const openEdit = (g: Gasto) => setModal({ mode: 'edit', id: g.id, data: { categoria: g.categoria, descripcion: g.descripcion, monto: g.monto } })

  const handleSave = async () => {
    if (!modal) return
    setSaving(true)
    try {
      if (modal.mode === 'create') await api.gastos.create(modal.data)
      else await api.gastos.update(modal.id!, modal.data)
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
    try { await api.gastos.remove(deleteId); setDeleteId(null); load() }
    catch (e) { alert(e instanceof Error ? e.message : 'Error al eliminar') }
    finally { setDeleting(false) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <CrudHeader icon={<Receipt size={18} />} title="Gastos" count={gastos.length}
        onAdd={canWrite ? openCreate : undefined} addLabel="Nuevo gasto" />

      <ViewToolbar>
        <FilterSelect value={catFilter} onChange={setCatFilter}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>
        <span className="text-xs text-muted-foreground font-mono ml-auto">
          Total filtrado: <span className="text-foreground font-semibold">{currency.format(totalFiltrado)}</span>
        </span>
      </ViewToolbar>

      <div className="mt-4">
        {error ? <ErrorBanner message={error} onRetry={load} /> : (
          <CrudTableWrap>
            <thead><tr><Th>Categoría</Th><Th>Descripción</Th><Th className="text-right">Monto</Th><Th>Fecha</Th><Th></Th></tr></thead>
            <tbody>
              {loading ? <TableSkeleton cols={5} /> : filtered.map(g => (
                <tr key={g.id} className="hover:bg-muted/20 transition-colors">
                  <Td><CategoryBadge category={g.categoria} /></Td>
                  <Td>{g.descripcion}</Td>
                  <Td className="text-right font-mono">{currency.format(g.monto)}</Td>
                  <Td className="text-muted-foreground text-xs">{g.created_at.slice(0, 10)}</Td>
                  <Td>{canWrite && <RowActions onEdit={() => openEdit(g)} onDelete={() => setDeleteId(g.id)} />}</Td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">Sin gastos</td></tr>
              )}
            </tbody>
          </CrudTableWrap>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <Modal title={modal.mode === 'create' ? 'Nuevo gasto' : 'Editar gasto'} onClose={() => setModal(null)} onSubmit={handleSave} loading={saving}>
            <FormField label="Categoría">
              <select className={selectCls} value={modal.data.categoria}
                onChange={e => setModal({ ...modal, data: { ...modal.data, categoria: e.target.value } })}>
                {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Descripción">
              <input className={inputCls} value={modal.data.descripcion}
                onChange={e => setModal({ ...modal, data: { ...modal.data, descripcion: e.target.value } })} />
            </FormField>
            <FormField label="Monto">
              <input type="number" className={inputCls} value={modal.data.monto}
                onChange={e => setModal({ ...modal, data: { ...modal.data, monto: Number(e.target.value) } })} />
            </FormField>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId !== null && (
          <ConfirmDialog message="¿Eliminar este gasto?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
        )}
      </AnimatePresence>
    </div>
  )
}
