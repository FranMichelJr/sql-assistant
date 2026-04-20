import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import WarningAlt from '@carbon/icons-react/es/WarningAlt'
import type { Product } from '@/types'
import { api } from '@/lib/api'
import { CrudTableWrap, Th, Td, TableSkeleton, ErrorBanner, ExportButton } from './shared'
import { exportToCsv } from '@/lib/csv'

function stockColor(stock: number) {
  if (stock === 0) return 'text-red-500 font-bold'
  if (stock <= 3) return 'text-orange-500 font-semibold'
  return 'text-yellow-500'
}

export function LowStockView() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const all = await api.products.list()
      setItems(all.filter(p => p.stock < 10).sort((a, b) => a.stock - b.stock))
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleExport = () => {
    exportToCsv(items.map(p => ({
      id: p.id, nombre: p.name, categoría: p.category_name ?? '',
      stock: p.stock, precio: p.price,
    })), 'stock-bajo.csv')
  }

  return (
    <motion.div
      key="lowstock"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
      className="p-6 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
            <WarningAlt size={18} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Alertas de Stock</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {loading ? '…' : `${items.length} producto${items.length !== 1 ? 's' : ''} con stock < 10`}
            </p>
          </div>
        </div>
        {items.length > 0 && <ExportButton onClick={handleExport} />}
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      <CrudTableWrap>
        <thead>
          <tr>
            <Th className="w-12">#</Th>
            <Th>Nombre</Th>
            <Th>Categoría</Th>
            <Th className="text-right">Precio</Th>
            <Th className="text-right w-24">Stock</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeleton cols={5} />
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                Sin alertas — todos los productos tienen stock suficiente
              </td>
            </tr>
          ) : (
            items.map(p => (
              <tr key={p.id} className="hover:bg-muted/20 transition-colors duration-200">
                <Td className="text-muted-foreground font-mono text-xs">{p.id}</Td>
                <Td className="font-medium">{p.name}</Td>
                <Td>
                  <span className="px-2 py-0.5 rounded-md text-xs bg-muted/40 border border-border/60 text-muted-foreground">
                    {p.category_name ?? '—'}
                  </span>
                </Td>
                <Td className="text-right font-mono">${p.price.toFixed(2)}</Td>
                <Td className={`text-right font-mono ${stockColor(p.stock)}`}>
                  {p.stock === 0 ? 'SIN STOCK' : p.stock}
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </CrudTableWrap>
    </motion.div>
  )
}
