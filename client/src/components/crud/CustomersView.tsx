import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import UserMultiple from '@carbon/icons-react/es/UserMultiple'
import type { Customer } from '@/types'
import { api } from '@/lib/api'
import { exportToCsv } from '@/lib/csv'
import { useActivity } from '@/context/ActivityContext'
import { useAuth } from '@/context/AuthContext'
import {
  Modal, ConfirmDialog, CrudHeader, CrudTableWrap,
  Th, Td, RowActions, TableSkeleton, ErrorBanner,
  FormField, inputCls,
  SearchInput, ExportButton, ViewToolbar, CountryBadge,
} from './shared'

type CustomerForm = Omit<Customer, 'id' | 'created_at'>
const EMPTY: CustomerForm = { first_name: '', last_name: '', email: '', phone: '', city: '', country: '' }

export function CustomersView() {
  const { addActivity } = useActivity()
  const { user } = useAuth()
  const isReadonly = user?.role === 'espectador'
  const [items, setItems] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState<CustomerForm>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await api.customers.list()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    )
  }, [items, search])

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit = (c: Customer) => {
    setEditing(c)
    setForm({ first_name: c.first_name, last_name: c.last_name, email: c.email, phone: c.phone, city: c.city, country: c.country })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.email.trim()) return
    setSaving(true)
    try {
      const name = `${form.first_name} ${form.last_name}`.trim()
      if (editing) {
        await api.customers.update(editing.id, form)
        setItems(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } : c))
        addActivity({ type: 'update', entity: 'customer', entityName: name, userName: user?.name ?? 'Usuario' })
      } else {
        const created = await api.customers.create(form)
        setItems(prev => [...prev, created])
        addActivity({ type: 'create', entity: 'customer', entityName: name, userName: user?.name ?? 'Usuario' })
      }
      setModalOpen(false)
    } catch (e) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (deleteId === null) return
    setDeleting(true)
    try {
      await api.customers.remove(deleteId)
      setItems(prev => prev.filter(c => c.id !== deleteId))
      setDeleteId(null)
    } catch (e) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setDeleting(false) }
  }

  const handleExport = () => {
    exportToCsv(filtered.map(c => ({
      id: c.id, nombre: c.first_name, apellido: c.last_name,
      email: c.email, teléfono: c.phone, ciudad: c.city, país: c.country,
    })), 'clientes.csv')
  }

  return (
    <motion.div
      key="customers"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
      className="p-6 flex flex-col gap-4"
    >
      <CrudHeader
        icon={<UserMultiple size={18} />}
        title="Clientes"
        count={filtered.length}
        onAdd={isReadonly ? undefined : openAdd}
        addLabel="Nuevo cliente"
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <ViewToolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o email..." />
        <ExportButton onClick={handleExport} />
      </ViewToolbar>

      <CrudTableWrap>
        <thead>
          <tr>
            <Th className="w-12">#</Th>
            <Th>Nombre</Th>
            <Th>Email</Th>
            <Th>Teléfono</Th>
            <Th>Ciudad</Th>
            <Th>País</Th>
            <Th className="w-24 text-right">Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeleton cols={7} />
          ) : filtered.length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">Sin resultados</td></tr>
          ) : (
            filtered.map(c => (
              <tr key={c.id} className="hover:bg-muted/20 transition-colors duration-200">
                <Td className="text-muted-foreground font-mono text-xs">{c.id}</Td>
                <Td className="font-medium whitespace-nowrap">{c.first_name} {c.last_name}</Td>
                <Td className="text-muted-foreground">{c.email}</Td>
                <Td className="text-muted-foreground font-mono text-xs">{c.phone || '—'}</Td>
                <Td className="text-muted-foreground">{c.city || '—'}</Td>
                <Td><CountryBadge country={c.country} /></Td>
                <Td>{!isReadonly && <RowActions onEdit={() => openEdit(c)} onDelete={() => setDeleteId(c.id)} />}</Td>
              </tr>
            ))
          )}
        </tbody>
      </CrudTableWrap>

      <AnimatePresence>
        {modalOpen && (
          <Modal
            title={editing ? 'Editar cliente' : 'Nuevo cliente'}
            onClose={() => setModalOpen(false)}
            onSubmit={handleSave}
            loading={saving}
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nombre">
                <input className={inputCls} value={form.first_name} placeholder="Nombre"
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} autoFocus />
              </FormField>
              <FormField label="Apellido">
                <input className={inputCls} value={form.last_name} placeholder="Apellido"
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Email">
              <input type="email" className={inputCls} value={form.email} placeholder="email@ejemplo.com"
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Teléfono">
                <input className={inputCls} value={form.phone} placeholder="+54 11..."
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </FormField>
              <FormField label="País">
                <input className={inputCls} value={form.country} placeholder="Argentina"
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Ciudad">
              <input className={inputCls} value={form.city} placeholder="Buenos Aires"
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </FormField>
          </Modal>
        )}
        {deleteId !== null && (
          <ConfirmDialog
            message="¿Eliminar este cliente y todos sus datos?"
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
