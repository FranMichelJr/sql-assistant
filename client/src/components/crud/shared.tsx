import { motion } from 'framer-motion'
import Close from '@carbon/icons-react/es/Close'
import TrashCan from '@carbon/icons-react/es/TrashCan'
import AddLarge from '@carbon/icons-react/es/AddLarge'
import Edit from '@carbon/icons-react/es/Edit'
import Search from '@carbon/icons-react/es/Search'
import React from 'react'
import type { Canal } from '@/types'

export const CANAL_LABEL: Record<Canal, string> = {
  mostrador: 'Mostrador', whatsapp: 'WhatsApp', mercado_libre: 'Mercado Libre', reparto: 'Reparto',
}

// ── Input / select styles ─────────────────────────────────────────────────
export const inputCls =
  'w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors'

export const selectCls = inputCls + ' cursor-pointer'

// ── FormField ─────────────────────────────────────────────────────────────
export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────
interface ModalProps {
  title: string
  onClose: () => void
  onSubmit: () => void
  submitLabel?: string
  loading?: boolean
  children: React.ReactNode
}

export function Modal({ title, onClose, onSubmit, submitLabel = 'Guardar', loading, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button
            type="button" onClick={onClose}
            className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Close size={16} />
          </button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">{children}</div>
        <div className="flex items-center justify-end gap-3 px-6 pb-5">
          <button
            type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button" onClick={onSubmit} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando…' : submitLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDialog({ message, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onCancel}
      />
      <motion.div
        className="relative bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
      >
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <TrashCan size={16} className="text-destructive" />
          </div>
          <p className="text-sm text-foreground pt-1.5">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button" onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button" onClick={onConfirm} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── CrudHeader ────────────────────────────────────────────────────────────
interface CrudHeaderProps {
  icon: React.ReactNode
  title: string
  count: number
  onAdd?: () => void
  addLabel?: string
}

export function CrudHeader({ icon, title, count, onAdd, addLabel = 'Agregar' }: CrudHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-full bg-primary/10 border-2 border-primary/25 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div>
          <h1 className="text-xl font-serif text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground font-mono">{count} registros</p>
        </div>
      </div>
      {onAdd && (
        <button
          type="button" onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <AddLarge size={14} />
          {addLabel}
        </button>
      )}
    </div>
  )
}

// ── Table wrapper ─────────────────────────────────────────────────────────
export function CrudTableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {children}
        </table>
      </div>
    </div>
  )
}

export function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 border-b border-border ${className}`}>
      {children}
    </th>
  )
}

export function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 text-sm text-foreground border-b border-border/50 ${className}`}>
      {children}
    </td>
  )
}

export function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button
        type="button" onClick={onEdit}
        className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
        title="Editar"
      >
        <Edit size={14} />
      </button>
      <button
        type="button" onClick={onDelete}
        className="size-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        title="Eliminar"
      >
        <TrashCan size={14} />
      </button>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────
export function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          {[...Array(cols)].map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-muted/40 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ── Error banner ──────────────────────────────────────────────────────────
export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onRetry} className="underline text-xs hover:no-underline">
        Reintentar
      </button>
    </div>
  )
}

// ── Toolbar components ────────────────────────────────────────────────────

export function SearchInput({ value, onChange, placeholder = 'Buscar...' }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        className={`${inputCls} pl-8`}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

export function FilterSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <select
      className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {children}
    </select>
  )
}

export function ViewToolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 flex-wrap">{children}</div>
}

// ── Category badge ─────────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff
  return h
}

/* Paleta vintage cerrada — solo tonos tierra, nada de arcoíris */
const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  'almacén':      { bg: '#6B7A3F', color: '#FBF3E7' },
  'almacen':      { bg: '#6B7A3F', color: '#FBF3E7' },
  'bebidas':      { bg: '#9C5236', color: '#FBF3E7' },
  'limpieza':     { bg: '#8A6D4B', color: '#FBF3E7' },
  'kiosco':       { bg: '#C9962B', color: '#2B2118' },
  'electro':      { bg: '#5C4433', color: '#FBF3E7' },
  'indumentaria': { bg: '#7A3B3B', color: '#FBF3E7' },
}

const FALLBACK_CATEGORY_PALETTES = [
  { bg: '#8A9A5B', color: '#2B2118' },
  { bg: '#C08A3E', color: '#2B2118' },
  { bg: '#9C5236', color: '#FBF3E7' },
  { bg: '#6B4423', color: '#FBF3E7' },
  { bg: '#A67B5B', color: '#2B2118' },
  { bg: '#7A3B3B', color: '#FBF3E7' },
  { bg: '#5C6B47', color: '#FBF3E7' },
  { bg: '#B08B3F', color: '#2B2118' },
]

export function CategoryBadge({ category }: { category: string | null | undefined }) {
  if (!category) return <span className="text-muted-foreground">—</span>
  const style = CATEGORY_COLORS[category.toLowerCase()]
    ?? FALLBACK_CATEGORY_PALETTES[hashStr(category) % FALLBACK_CATEGORY_PALETTES.length]
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {category}
    </span>
  )
}

// Re-export icons used across views
export { Edit, Close, AddLarge, TrashCan }
