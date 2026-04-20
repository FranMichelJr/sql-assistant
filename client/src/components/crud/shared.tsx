import { motion, AnimatePresence } from 'framer-motion'
import { Close, TrashCan, AddLarge, Edit, Download, Search } from '@carbon/icons-react'
import React from 'react'

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
        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
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

export function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
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

export function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors whitespace-nowrap shrink-0"
    >
      <Download size={13} />
      Exportar CSV
    </button>
  )
}

export function ViewToolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 flex-wrap">{children}</div>
}

// ── Country badge ─────────────────────────────────────────────────────────

const COUNTRY_COLORS: Record<string, { bg: string; color: string }> = {
  'españa':         { bg: '#c60b1e', color: '#f1bf00' },
  'spain':          { bg: '#c60b1e', color: '#f1bf00' },
  'méxico':         { bg: '#006847', color: '#ce1126' },
  'mexico':         { bg: '#006847', color: '#ce1126' },
  'usa':            { bg: '#002868', color: '#ffffff' },
  'united states':  { bg: '#002868', color: '#ffffff' },
  'argentina':      { bg: '#74acdf', color: '#ffffff' },
  'brasil':         { bg: '#009c3b', color: '#ffdf00' },
  'brazil':         { bg: '#009c3b', color: '#ffdf00' },
  'france':         { bg: '#002395', color: '#ffffff' },
  'francia':        { bg: '#002395', color: '#ffffff' },
  'germany':        { bg: '#333333', color: '#ffcc00' },
  'alemania':       { bg: '#333333', color: '#ffcc00' },
  'italy':          { bg: '#009246', color: '#ffffff' },
  'italia':         { bg: '#009246', color: '#ffffff' },
  'japan':          { bg: '#bc002d', color: '#ffffff' },
  'japón':          { bg: '#bc002d', color: '#ffffff' },
  'china':          { bg: '#de2910', color: '#ffde00' },
  'uk':             { bg: '#012169', color: '#ffffff' },
  'united kingdom': { bg: '#012169', color: '#ffffff' },
  'canada':         { bg: '#d80027', color: '#ffffff' },
  'canadá':         { bg: '#d80027', color: '#ffffff' },
  'australia':      { bg: '#003087', color: '#ffffff' },
  'chile':          { bg: '#d52b1e', color: '#ffffff' },
  'colombia':       { bg: '#fcd116', color: '#003087' },
  'peru':           { bg: '#d91023', color: '#ffffff' },
  'perú':           { bg: '#d91023', color: '#ffffff' },
  'uruguay':        { bg: '#0038a8', color: '#ffffff' },
  'paraguay':       { bg: '#d52b1e', color: '#ffffff' },
  'bolivia':        { bg: '#d52b1e', color: '#f9b40c' },
  'ecuador':        { bg: '#ffda00', color: '#003580' },
  'venezuela':      { bg: '#cf142b', color: '#ffffff' },
  'portugal':       { bg: '#006600', color: '#ffffff' },
  'russia':         { bg: '#003580', color: '#ffffff' },
  'rusia':          { bg: '#003580', color: '#ffffff' },
  'india':          { bg: '#ff9933', color: '#ffffff' },
  'south korea':    { bg: '#003478', color: '#ffffff' },
  'corea del sur':  { bg: '#003478', color: '#ffffff' },
}

const FALLBACK_COUNTRY_PALETTES = [
  { bg: '#1e3a8a', color: '#ffffff' },
  { bg: '#065f46', color: '#ffffff' },
  { bg: '#7c2d12', color: '#ffffff' },
  { bg: '#4c1d95', color: '#ffffff' },
  { bg: '#831843', color: '#ffffff' },
  { bg: '#134e4a', color: '#ffffff' },
  { bg: '#1e1b4b', color: '#ffffff' },
  { bg: '#713f12', color: '#ffffff' },
]

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff
  return h
}

export function CountryBadge({ country }: { country: string }) {
  if (!country) return <span className="text-muted-foreground">—</span>
  const style = COUNTRY_COLORS[country.toLowerCase()]
    ?? FALLBACK_COUNTRY_PALETTES[hashStr(country) % FALLBACK_COUNTRY_PALETTES.length]
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {country}
    </span>
  )
}

// ── Category badge ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  'electrónica':      { bg: '#1d4ed8', color: '#ffffff' },
  'electronica':      { bg: '#1d4ed8', color: '#ffffff' },
  'electronics':      { bg: '#1d4ed8', color: '#ffffff' },
  'alimentación':     { bg: '#16a34a', color: '#ffffff' },
  'alimentacion':     { bg: '#16a34a', color: '#ffffff' },
  'food':             { bg: '#16a34a', color: '#ffffff' },
  'ropa':             { bg: '#ea580c', color: '#ffffff' },
  'clothing':         { bg: '#ea580c', color: '#ffffff' },
  'moda':             { bg: '#ea580c', color: '#ffffff' },
  'libros':           { bg: '#a16207', color: '#ffffff' },
  'books':            { bg: '#a16207', color: '#ffffff' },
  'hogar y jardín':   { bg: '#15803d', color: '#ffffff' },
  'hogar y jardin':   { bg: '#15803d', color: '#ffffff' },
  'home & garden':    { bg: '#15803d', color: '#ffffff' },
  'hogar':            { bg: '#15803d', color: '#ffffff' },
  'música':           { bg: '#7c3aed', color: '#ffffff' },
  'musica':           { bg: '#7c3aed', color: '#ffffff' },
  'music':            { bg: '#7c3aed', color: '#ffffff' },
  'belleza':          { bg: '#db2777', color: '#ffffff' },
  'beauty':           { bg: '#db2777', color: '#ffffff' },
  'automóvil':        { bg: '#6b7280', color: '#ffffff' },
  'automovil':        { bg: '#6b7280', color: '#ffffff' },
  'automotive':       { bg: '#6b7280', color: '#ffffff' },
  'autos':            { bg: '#6b7280', color: '#ffffff' },
  'deporte':          { bg: '#dc2626', color: '#ffffff' },
  'deportes':         { bg: '#dc2626', color: '#ffffff' },
  'sports':           { bg: '#dc2626', color: '#ffffff' },
  'juguetes':         { bg: '#f59e0b', color: '#ffffff' },
  'toys':             { bg: '#f59e0b', color: '#ffffff' },
  'tecnología':       { bg: '#0891b2', color: '#ffffff' },
  'tecnologia':       { bg: '#0891b2', color: '#ffffff' },
  'technology':       { bg: '#0891b2', color: '#ffffff' },
  'salud':            { bg: '#0d9488', color: '#ffffff' },
  'health':           { bg: '#0d9488', color: '#ffffff' },
  'mascotas':         { bg: '#d97706', color: '#ffffff' },
  'pets':             { bg: '#d97706', color: '#ffffff' },
}

const FALLBACK_CATEGORY_PALETTES = [
  { bg: '#6366f1', color: '#ffffff' },
  { bg: '#8b5cf6', color: '#ffffff' },
  { bg: '#ec4899', color: '#ffffff' },
  { bg: '#14b8a6', color: '#ffffff' },
  { bg: '#f97316', color: '#ffffff' },
  { bg: '#84cc16', color: '#ffffff' },
  { bg: '#06b6d4', color: '#ffffff' },
  { bg: '#a855f7', color: '#ffffff' },
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
