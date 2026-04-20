import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Category as CategoryIcon } from '@carbon/icons-react'
import type { Category } from '@/types'
import { api } from '@/lib/api'
import {
  Modal, ConfirmDialog, CrudHeader, CrudTableWrap,
  Th, Td, RowActions, TableSkeleton, ErrorBanner,
  FormField, inputCls,
} from './shared'

const EMPTY: Omit<Category, 'id'> = { name: '', description: '' }

export function CategoriesView() {
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<Omit<Category, 'id'>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await api.categories.list()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, description: c.description }); setModalOpen(true) }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await api.categories.update(editing.id, form)
        setItems(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } : c))
      } else {
        const created = await api.categories.create(form)
        setItems(prev => [...prev, created])
      }
      setModalOpen(false)
    } catch (e) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (deleteId === null) return
    setDeleting(true)
    try {
      await api.categories.remove(deleteId)
      setItems(prev => prev.filter(c => c.id !== deleteId))
      setDeleteId(null)
    } catch (e) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setDeleting(false) }
  }

  return (
    <motion.div
      key="categories"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
      className="p-6 flex flex-col gap-4"
    >
      <CrudHeader
        icon={<CategoryIcon size={18} />}
        title="Categorías"
        count={items.length}
        onAdd={openAdd}
        addLabel="Nueva categoría"
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <CrudTableWrap>
        <thead>
          <tr>
            <Th className="w-12">#</Th>
            <Th>Nombre</Th>
            <Th>Descripción</Th>
            <Th className="w-24 text-right">Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeleton cols={4} />
          ) : items.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground text-sm">Sin categorías</td></tr>
          ) : (
            items.map(c => (
              <tr key={c.id} className="hover:bg-muted/20 transition-colors duration-200">
                <Td className="text-muted-foreground font-mono text-xs">{c.id}</Td>
                <Td className="font-medium">{c.name}</Td>
                <Td className="text-muted-foreground max-w-xs truncate">{c.description || '—'}</Td>
                <Td><RowActions onEdit={() => openEdit(c)} onDelete={() => setDeleteId(c.id)} /></Td>
              </tr>
            ))
          )}
        </tbody>
      </CrudTableWrap>

      <AnimatePresence>
        {modalOpen && (
          <Modal
            title={editing ? 'Editar categoría' : 'Nueva categoría'}
            onClose={() => setModalOpen(false)}
            onSubmit={handleSave}
            loading={saving}
          >
            <FormField label="Nombre">
              <input
                className={inputCls} value={form.name} placeholder="Nombre de la categoría"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </FormField>
            <FormField label="Descripción">
              <textarea
                className={inputCls + ' resize-none'} rows={3} value={form.description}
                placeholder="Descripción opcional"
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </FormField>
          </Modal>
        )}
        {deleteId !== null && (
          <ConfirmDialog
            message="¿Eliminar esta categoría? Los productos asociados perderán su categoría."
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
