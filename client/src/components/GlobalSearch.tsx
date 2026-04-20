import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Close } from '@carbon/icons-react'
import { Box, UserMultiple, OrderDetails } from '@carbon/icons-react'
import { api } from '@/lib/api'
import type { HistoryItem, AppView } from '@/types'

interface SearchResult {
  id: string
  type: 'product' | 'customer' | 'order' | 'query'
  label: string
  sub: string
  view: AppView
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  product:  <Box size={14} />,
  customer: <UserMultiple size={14} />,
  order:    <OrderDetails size={14} />,
  query:    <Search size={14} />,
}

const TYPE_COLOR: Record<string, string> = {
  product:  'text-blue-400',
  customer: 'text-emerald-400',
  order:    'text-yellow-400',
  query:    'text-primary',
}

interface GlobalSearchProps {
  open: boolean
  onClose: () => void
  history: HistoryItem[]
  onNavigate: (view: AppView) => void
  onQuerySelect: (q: string) => void
}

export function GlobalSearch({ open, onClose, history, onNavigate, onQuerySelect }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Raw data cache
  const cacheRef = useRef<{
    products: { id: number; name: string }[]
    customers: { id: number; first_name: string; last_name: string; email: string }[]
    orders: { id: number; status: string; total: number }[]
  }>({ products: [], customers: [], orders: [] })

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); setActive(0); return }
    inputRef.current?.focus()
    // Prefetch data
    setLoading(true)
    Promise.all([
      api.products.list().catch(() => []),
      api.customers.list().catch(() => []),
      api.orders.list().catch(() => []),
    ]).then(([products, customers, orders]) => {
      cacheRef.current = { products, customers, orders }
    }).finally(() => setLoading(false))
  }, [open])

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return }
    const lq = q.toLowerCase()
    const out: SearchResult[] = []

    for (const p of cacheRef.current.products) {
      if (p.name.toLowerCase().includes(lq)) {
        out.push({ id: `p${p.id}`, type: 'product', label: p.name, sub: `Producto #${p.id}`, view: 'products' })
      }
    }
    for (const c of cacheRef.current.customers) {
      const name = `${c.first_name} ${c.last_name}`
      if (name.toLowerCase().includes(lq) || c.email.toLowerCase().includes(lq)) {
        out.push({ id: `c${c.id}`, type: 'customer', label: name, sub: c.email, view: 'customers' })
      }
    }
    for (const o of cacheRef.current.orders) {
      if (String(o.id).includes(lq) || o.status.toLowerCase().includes(lq)) {
        out.push({ id: `o${o.id}`, type: 'order', label: `Orden #${o.id}`, sub: `${o.status} · $${o.total.toFixed(2)}`, view: 'orders' })
      }
    }
    for (const h of history) {
      if (h.question.toLowerCase().includes(lq)) {
        out.push({ id: `h${h.id}`, type: 'query', label: h.question.slice(0, 80), sub: `${h.rowCount} filas`, view: 'query' })
      }
    }

    setResults(out.slice(0, 8))
    setActive(0)
  }, [history])

  useEffect(() => { search(query) }, [query, search])

  const handleSelect = (r: SearchResult) => {
    if (r.type === 'query') {
      onQuerySelect(r.label)
    } else {
      onNavigate(r.view)
    }
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && results[active]) { handleSelect(results[active]) }
    else if (e.key === 'Escape') { onClose() }
  }

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search size={16} className="text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar productos, clientes, órdenes, queries..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                {loading && <span className="w-3.5 h-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />}
                <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Close size={15} />
                </button>
              </div>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-80 overflow-y-auto">
              {results.length === 0 && query.trim() && !loading && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Sin resultados para "{query}"
                </div>
              )}
              {results.length === 0 && !query.trim() && (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground/60">
                  Escribí para buscar en toda la app
                </div>
              )}
              {results.map((r, i) => (
                <button
                  key={r.id}
                  data-idx={i}
                  type="button"
                  onClick={() => handleSelect(r)}
                  onMouseEnter={() => setActive(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    i === active ? 'bg-primary/10' : 'hover:bg-muted/40'
                  }`}
                >
                  <span className={`shrink-0 ${TYPE_COLOR[r.type]}`}>{TYPE_ICON[r.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{r.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.sub}</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 capitalize">{r.type}</span>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-4 py-2 border-t border-border/50 text-[10px] font-mono text-muted-foreground/50">
              <span>↑↓ navegar</span>
              <span>⏎ seleccionar</span>
              <span>ESC cerrar</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
