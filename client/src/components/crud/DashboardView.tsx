import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Analytics, OrderDetails, WarningAlt, UserMultiple } from '@carbon/icons-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import type { DashboardMetrics, OrderStatus, AppView } from '@/types'
import { api } from '@/lib/api'
import { ErrorBanner } from './shared'

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente', processing: 'Procesando', shipped: 'Enviado',
  delivered: 'Entregado', cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'text-yellow-500', processing: 'text-blue-400', shipped: 'text-blue-400',
  delivered: 'text-emerald-400', cancelled: 'text-red-400',
}

type CardAccent = 'green' | 'blue' | 'yellow' | 'cyan'

const ACCENT_CLS: Record<CardAccent, { border: string; icon: string; bar: string }> = {
  green:  { border: 'border-l-emerald-500/50', icon: 'bg-emerald-500/10 text-emerald-400', bar: 'border-l-4' },
  blue:   { border: 'border-l-blue-500/50',    icon: 'bg-blue-500/10 text-blue-400',       bar: 'border-l-4' },
  yellow: { border: 'border-l-yellow-500/50',  icon: 'bg-yellow-500/10 text-yellow-500',   bar: 'border-l-4' },
  cyan:   { border: 'border-l-primary/50',     icon: 'bg-primary/10 text-primary',         bar: 'border-l-4' },
}

function MetricCard({ title, value, sub, icon, warn, onClick, accent = 'cyan' }: {
  title: string; value: string; sub?: string
  icon: React.ReactNode; warn?: boolean; onClick?: () => void; accent?: CardAccent
}) {
  const ac = warn ? ACCENT_CLS.yellow : ACCENT_CLS[accent]
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-xl border border-border ${ac.bar} ${ac.border} bg-card p-5 flex flex-col gap-2 text-left
        ${onClick ? 'hover:bg-muted/20 cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className={`size-8 rounded-lg flex items-center justify-center ${ac.icon}`}>
          {icon}
        </div>
      </div>
      <span className={`text-2xl font-mono font-semibold tabular-nums ${warn ? 'text-yellow-500' : 'text-foreground'}`}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </Tag>
  )
}

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-')
  return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('es-AR', { month: 'short' })
}

export function DashboardView({ onNavigate }: { onNavigate?: (v: AppView) => void }) {
  const [data, setData] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setData(await api.dashboard.get()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 h-28 animate-pulse" />
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card h-64 animate-pulse" />
      </div>
    )
  }

  if (error) return <div className="p-6"><ErrorBanner message={error} onRetry={load} /></div>
  if (!data) return null

  const chartData = data.sales_by_month.map(m => ({
    month: monthLabel(m.month),
    ventas: Math.round(m.total),
  }))

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
      className="p-6 flex flex-col gap-6"
    >
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ventas Totales"
          value={`$${data.total_sales.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
          sub="Órdenes no canceladas"
          icon={<Analytics size={16} />}
          accent="green"
        />
        <MetricCard
          title="Órdenes del Mes"
          value={String(data.monthly_orders)}
          sub="Mes actual"
          icon={<OrderDetails size={16} />}
          accent="blue"
        />
        <MetricCard
          title="Stock Bajo"
          value={String(data.low_stock_count)}
          sub={data.low_stock_count > 0 ? 'Ver productos afectados →' : 'Sin alertas'}
          icon={<WarningAlt size={16} />}
          warn={data.low_stock_count > 0}
          accent="yellow"
          onClick={data.low_stock_count > 0 ? () => onNavigate?.('lowstock') : undefined}
        />
        <MetricCard
          title="Clientes"
          value={String(data.total_customers)}
          icon={<UserMultiple size={16} />}
          accent="cyan"
        />
      </div>

      {/* Chart + top products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Ventas — últimos 6 meses</h2>
          {chartData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} width={56}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: 'hsl(231 36% 8%)', border: '1px solid hsl(231 34% 15%)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#71717a', fontWeight: 600 }}
                  itemStyle={{ color: '#22c55e' }}
                  formatter={(v) => [`$${Number(v).toLocaleString('es-AR')}`, 'Ventas']}
                />
                <Area
                  type="monotone" dataKey="ventas" stroke="#22c55e" strokeWidth={2}
                  fill="url(#salesGrad)" dot={false}
                  isAnimationActive={true} animationDuration={800} animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Top 5 Productos</h2>
          {data.top_products.length === 0 ? (
            <span className="text-sm text-muted-foreground">Sin datos</span>
          ) : (
            <div className="flex flex-col gap-3">
              {data.top_products.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground w-4 shrink-0 text-right">{i + 1}</span>
                  <span className="text-xs text-foreground flex-1 truncate">{p.name}</span>
                  <span className="text-xs font-mono text-primary shrink-0">{p.units_sold} u.</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Órdenes Recientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                {['# Orden', 'Cliente', 'Estado', 'Total', 'Fecha'].map((h, i) => (
                  <th key={h} className={`px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent_orders.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Sin órdenes</td></tr>
              ) : data.recent_orders.map(o => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors duration-200">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{o.id}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{o.customer_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${STATUS_COLORS[o.status]}`}>
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">${o.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs font-mono whitespace-nowrap">
                    {o.created_at ? new Date(o.created_at).toLocaleDateString('es-AR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}
