import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import UserMultiple from '@carbon/icons-react/es/UserMultiple'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { Cliente } from '@/types'
import {
  CrudHeader, CrudTableWrap, Th, Td, RowActions, TableSkeleton, ErrorBanner,
  Modal, ConfirmDialog, FormField, SearchInput, ViewToolbar, inputCls,
} from './shared'

const EMPTY = { nombre: '', telefono: '', email: '' }

export function ClientesView() {
  const { user } = useAuth()
  const canWrite = user?.role === 'dueno' || user?.role === 'encargado'
  const canDelete = user?.role === 'dueno'

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; data: typeof EMPTY; id?: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true); setError(null)
    api.clientes.list().then(setClientes).catch(e => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = useMemo(() => clientes.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase())), [clientes, search])

  const openCreate = () => setModal({ mode: 'create', data: { ...EMPTY } })
  const openEdit = (c: Cliente) => setModal({ mode: 'edit', id: c.id, data: { nombre: c.nombre, telefono: c.telefono, email: c.email } })

  const handleSave = async () => {
    if (!modal) return
    setSaving(true)
    try {
      if (modal.mode === 'create') await api.clientes.create(modal.data)
      else await api.clientes.update(modal.id!, modal.data)
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
    try { await api.clientes.remove(deleteId); setDeleteId(null); load() }
    catch (e) { alert(e instanceof Error ? e.message : 'Error al eliminar') }
    finally { setDeleting(false) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <CrudHeader icon={<UserMultiple size={18} />} title="Clientes" count={clientes.length}
        onAdd={canWrite ? openCreate : undefined} addLabel="Nuevo cliente" />

      <p className="text-[11px] text-muted-foreground/60 -mt-4 mb-4">
        Datos ficticios generados automáticamente para esta demo — ninguna persona real.
      </p>

      <ViewToolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar cliente..." />
      </ViewToolbar>

      <div className="mt-4">
        {error ? <ErrorBanner message={error} onRetry={load} /> : (
          <CrudTableWrap>
            <thead><tr><Th>Nombre</Th><Th>Teléfono</Th><Th>Email</Th><Th>Cliente desde</Th><Th></Th></tr></thead>
            <tbody>
              {loading ? <TableSkeleton cols={5} /> : filtered.map(c => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <Td>{c.nombre}</Td>
                  <Td className="text-muted-foreground">{c.telefono || '—'}</Td>
                  <Td className="text-muted-foreground">{c.email || '—'}</Td>
                  <Td className="text-muted-foreground text-xs">{c.created_at.slice(0, 10)}</Td>
                  <Td>{canWrite && <RowActions onEdit={() => openEdit(c)} onDelete={() => canDelete && setDeleteId(c.id)} />}</Td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">Sin clientes</td></tr>
              )}
            </tbody>
          </CrudTableWrap>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <Modal title={modal.mode === 'create' ? 'Nuevo cliente' : 'Editar cliente'} onClose={() => setModal(null)} onSubmit={handleSave} loading={saving}>
            <FormField label="Nombre">
              <input className={inputCls} value={modal.data.nombre}
                onChange={e => setModal({ ...modal, data: { ...modal.data, nombre: e.target.value } })} />
            </FormField>
            <FormField label="Teléfono">
              <input className={inputCls} value={modal.data.telefono}
                onChange={e => setModal({ ...modal, data: { ...modal.data, telefono: e.target.value } })} />
            </FormField>
            <FormField label="Email">
              <input type="email" className={inputCls} value={modal.data.email}
                onChange={e => setModal({ ...modal, data: { ...modal.data, email: e.target.value } })} />
            </FormField>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId !== null && (
          <ConfirmDialog message="¿Eliminar este cliente?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
        )}
      </AnimatePresence>
    </div>
  )
}
