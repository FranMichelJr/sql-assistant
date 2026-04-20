import { motion } from 'framer-motion'
import { Table2 } from 'lucide-react'
import { CountryBadge, CategoryBadge } from '@/components/crud/shared'

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border/50 animate-pulse">
          {Array.from({ length: 4 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3 bg-muted rounded" style={{ width: `${45 + (i * j * 7) % 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

const COUNTRY_COLS = new Set(['country', 'país', 'pais', 'country_name', 'customer_country'])
const CATEGORY_COLS = new Set(['category', 'categoría', 'categoria', 'category_name', 'categoria_nombre'])

function CellValue({ value, colName }: { value: unknown; colName?: string }) {
  if (value === null || value === undefined || value === 'NULL') {
    return <span className="text-muted-foreground/40 font-mono text-xs italic">null</span>
  }
  const str = String(value)
  const col = (colName ?? '').toLowerCase()
  if (COUNTRY_COLS.has(col) && str && str !== '—') return <CountryBadge country={str} />
  if (CATEGORY_COLS.has(col) && str && str !== '—') return <CategoryBadge category={str} />
  const isNum = value !== '' && !isNaN(Number(value))
  return (
    <span className={`font-mono text-xs ${isNum ? 'text-primary' : 'text-foreground/80'}`}>
      {str.length > 80 ? str.slice(0, 77) + '…' : str}
    </span>
  )
}

interface ResultsTableProps {
  columns: string[]
  rows: unknown[][]
  loading: boolean
  rowCount?: number
}

export default function ResultsTable({ columns, rows, loading, rowCount }: ResultsTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, delay: 0.06 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Table2 className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
          <span className="text-[10px] font-mono font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Resultados
          </span>
        </div>
        {!loading && rowCount !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-mono text-emerald-400">
              {rowCount} {rowCount === 1 ? 'fila' : 'filas'}
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[28rem] scrollbar-thin">
        {loading ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {Array.from({ length: 4 }).map((_, i) => (
                  <th key={i} className="px-4 py-2.5">
                    <div className="h-2.5 bg-muted rounded w-16 animate-pulse" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody><SkeletonRows /></tbody>
          </table>
        ) : columns.length > 0 ? (
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-2.5 text-[10px] font-mono font-semibold tracking-[0.15em] text-muted-foreground uppercase whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-xs font-mono text-muted-foreground/40">
                    Sin resultados
                  </td>
                </tr>
              ) : (
                rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-b border-border/40 hover:bg-accent/60 transition-colors duration-100"
                  >
                    {(row as unknown[]).map((cell, ci) => (
                      <td key={ci} className="px-4 py-2.5 whitespace-nowrap">
                        <CellValue value={cell} colName={columns[ci]} />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-xs font-mono text-muted-foreground/40">Los resultados aparecerán aquí</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
