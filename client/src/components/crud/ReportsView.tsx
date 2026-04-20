import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Analytics from '@carbon/icons-react/es/Analytics'
import { FileText } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import type { SalesReport, ProductReport } from '@/types'
import { api } from '@/lib/api'
import { exportToCsv } from '@/lib/csv'
import { exportToPdf } from '@/lib/pdf'
import { ErrorBanner, ExportButton, CrudTableWrap, Th, Td, TableSkeleton, CategoryBadge } from './shared'

type Period = 'week' | 'month' | 'year'

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
}

const BAR_COLOR = '#22c55e'

function AnimatedBar(props: Record<string, unknown>) {
  const { x, y, width, height, fill, fillOpacity } = props as {
    x: number; y: number; width: number; height: number
    fill: string; fillOpacity?: number
  }
  const [hovered, setHovered] = useState(false)
  if (!height || !width) return null
  const scale = hovered ? 1.07 : 1
  return (
    <g
      style={{
        transform: `scaleY(${scale})`,
        transformOrigin: `${x + width / 2}px ${y + height}px`,
        transition: 'transform 0.18s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <rect x={x} y={y} width={width} height={height}
        fill={fill} fillOpacity={fillOpacity ?? 0.85} rx={4} ry={4} />
    </g>
  )
}

function PeriodTab({ value, active, onClick }: { value: Period; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-primary/15 text-primary border border-primary/30'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
      }`}
    >
      {PERIOD_LABELS[value]}
    </button>
  )
}

function SectionHeader({ title, onExportCsv, onExportPdf }: {
  title: string
  onExportCsv: () => void
  onExportPdf: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="flex items-center gap-2">
        <ExportButton onClick={onExportCsv} />
        <button
          type="button" onClick={onExportPdf}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors whitespace-nowrap"
        >
          <FileText size={13} />
          Exportar PDF
        </button>
      </div>
    </div>
  )
}

export function ReportsView() {
  const [period, setPeriod] = useState<Period>('month')
  const [salesData, setSalesData] = useState<SalesReport | null>(null)
  const [productsData, setProductsData] = useState<ProductReport[]>([])
  const [loadingSales, setLoadingSales] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [errorSales, setErrorSales] = useState<string | null>(null)
  const [errorProducts, setErrorProducts] = useState<string | null>(null)

  const loadSales = useCallback(async () => {
    setLoadingSales(true); setErrorSales(null)
    try { setSalesData(await api.reports.sales(period)) }
    catch (e) { setErrorSales(e instanceof Error ? e.message : 'Error al cargar') }
    finally { setLoadingSales(false) }
  }, [period])

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true); setErrorProducts(null)
    try { setProductsData(await api.reports.products()) }
    catch (e) { setErrorProducts(e instanceof Error ? e.message : 'Error al cargar') }
    finally { setLoadingProducts(false) }
  }, [])

  useEffect(() => { loadSales() }, [loadSales])
  useEffect(() => { loadProducts() }, [loadProducts])

  // ── Export sales CSV
  const exportSalesCsv = () => {
    if (!salesData) return
    exportToCsv(
      salesData.data.map(d => ({ período: d.period, órdenes: d.orders, ingresos: d.revenue.toFixed(2) })),
      `ventas-por-${period}.csv`
    )
  }

  // ── Export sales PDF
  const exportSalesPdf = () => {
    if (!salesData) return
    exportToPdf(
      `Reporte de Ventas — ${PERIOD_LABELS[period]}`,
      ['Período', 'Órdenes', 'Ingresos'],
      salesData.data.map(d => [d.period, d.orders, `$${d.revenue.toFixed(2)}`])
    )
  }

  // ── Export products CSV
  const exportProductsCsv = () => {
    exportToCsv(
      productsData.map(p => ({
        nombre: p.name,
        categoría: p.category ?? '',
        precio: p.price,
        'unidades vendidas': p.units_sold,
        ingresos: (p.revenue ?? 0).toFixed(2),
        stock: p.stock,
      })),
      'productos-rentables.csv'
    )
  }

  // ── Export products PDF
  const exportProductsPdf = () => {
    exportToPdf(
      'Productos más Rentables',
      ['Producto', 'Categoría', 'Precio', 'Unidades', 'Ingresos', 'Stock'],
      productsData.map(p => [
        p.name, p.category ?? '—', `$${p.price.toFixed(2)}`,
        p.units_sold, `$${(p.revenue ?? 0).toFixed(2)}`, p.stock,
      ])
    )
  }

  const chartData = (salesData?.data ?? []).map(d => ({
    period: d.period,
    ingresos: Math.round(d.revenue),
    órdenes: d.orders,
  }))

  return (
    <motion.div
      key="reports"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
      className="p-6 flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Analytics size={18} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Reportes</h1>
            <p className="text-xs text-muted-foreground font-mono">Análisis de ventas y rentabilidad</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Total Órdenes</span>
          <p className="text-2xl font-semibold text-foreground mt-2 tabular-nums">
            {loadingSales ? <span className="text-muted-foreground animate-pulse">—</span> : (salesData?.total_orders ?? 0).toLocaleString()}
          </p>
          <span className="text-xs text-muted-foreground">Históricas (sin canceladas)</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Ingresos Totales</span>
          <p className="text-2xl font-semibold text-primary mt-2 tabular-nums">
            {loadingSales ? <span className="text-muted-foreground animate-pulse">—</span>
              : `$${(salesData?.total_revenue ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
          </p>
          <span className="text-xs text-muted-foreground">Históricas (sin canceladas)</span>
        </div>
      </div>

      {/* Sales report */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {(['week', 'month', 'year'] as Period[]).map(p => (
              <PeriodTab key={p} value={p} active={period === p} onClick={() => setPeriod(p)} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ExportButton onClick={exportSalesCsv} />
            <button
              type="button" onClick={exportSalesPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors whitespace-nowrap"
            >
              <FileText size={13} />
              Exportar PDF
            </button>
          </div>
        </div>

        <h2 className="text-sm font-semibold text-foreground -mb-2">
          Ventas por {PERIOD_LABELS[period]}
        </h2>

        {errorSales ? (
          <ErrorBanner message={errorSales} onRetry={loadSales} />
        ) : loadingSales ? (
          <div className="h-52 bg-muted/20 rounded-xl animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Sin datos para el período</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} width={58}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                cursor={false}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
                itemStyle={{ color: BAR_COLOR }}
                formatter={(val, name) => [
                  name === 'ingresos' ? `$${Number(val).toLocaleString('es-AR')}` : val,
                  name === 'ingresos' ? 'Ingresos' : 'Órdenes',
                ]}
              />
              <Bar dataKey="ingresos" shape={<AnimatedBar />}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLOR} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Sales table */}
        {!loadingSales && chartData.length > 0 && (
          <CrudTableWrap>
            <thead>
              <tr>
                <Th>Período</Th>
                <Th className="text-right">Órdenes</Th>
                <Th className="text-right">Ingresos</Th>
              </tr>
            </thead>
            <tbody>
              {salesData!.data.map(d => (
                <tr key={d.period} className="hover:bg-muted/20 transition-colors duration-200">
                  <Td className="font-mono text-xs">{d.period}</Td>
                  <Td className="text-right font-mono">{d.orders}</Td>
                  <Td className="text-right font-mono font-semibold text-primary">${d.revenue.toFixed(2)}</Td>
                </tr>
              ))}
            </tbody>
          </CrudTableWrap>
        )}
      </div>

      {/* Product profitability */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <SectionHeader
          title="Productos más Rentables"
          onExportCsv={exportProductsCsv}
          onExportPdf={exportProductsPdf}
        />

        {errorProducts ? (
          <ErrorBanner message={errorProducts} onRetry={loadProducts} />
        ) : (
          <CrudTableWrap>
            <thead>
              <tr>
                <Th className="w-8">#</Th>
                <Th>Producto</Th>
                <Th>Categoría</Th>
                <Th className="text-right">Precio</Th>
                <Th className="text-right">Unidades</Th>
                <Th className="text-right">Ingresos</Th>
                <Th className="text-right">Stock</Th>
              </tr>
            </thead>
            <tbody>
              {loadingProducts ? (
                <TableSkeleton cols={7} />
              ) : productsData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">Sin datos</td>
                </tr>
              ) : (
                productsData.map((p, i) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors duration-200">
                    <Td className="text-muted-foreground font-mono text-xs">{i + 1}</Td>
                    <Td className="font-medium max-w-[180px] truncate">{p.name}</Td>
                    <Td><CategoryBadge category={p.category} /></Td>
                    <Td className="text-right font-mono">${p.price.toFixed(2)}</Td>
                    <Td className="text-right font-mono">{p.units_sold}</Td>
                    <Td className="text-right font-mono font-semibold text-primary">
                      ${(p.revenue ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                    </Td>
                    <Td className={`text-right font-mono font-semibold ${p.stock < 10 ? 'text-red-500' : 'text-emerald-500'}`}>{p.stock}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </CrudTableWrap>
        )}
      </div>
    </motion.div>
  )
}
