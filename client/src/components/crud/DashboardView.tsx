import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, PackageX, Users2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { AppView, DashboardMetrics } from '@/types'
import { CategoryBadge, CANAL_LABEL } from './shared'

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

function formatCompact(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 1)}K`
  return `$${v}`
}

function KpiTile({
  label, value, sub, icon, tone = 'default',
}: {
  label: string; value: string; sub?: string; icon: React.ReactNode
  tone?: 'default' | 'positive' | 'warning' | 'critical'
}) {
  const toneCls = {
    default: 'text-primary bg-primary/10 border-primary/20',
    positive: 'text-positive bg-positive/10 border-positive/20',
    warning: 'text-warning bg-warning/10 border-warning/20',
    critical: 'text-critical bg-critical/10 border-critical/20',
  }[tone]

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 shadow-stamp-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={`size-8 rounded-full border-2 flex items-center justify-center shrink-0 ${toneCls}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-mono font-bold text-foreground tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function DashboardView({ onNavigate }: { onNavigate: (v: AppView) => void }) {
  const [data, setData] = useState<DashboardMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.dashboard.get().then(setData).catch(e => setError(e.message))
  }, [])

  const avgVentas = useMemo(() => {
    if (!data || data.ventas_por_dia.length === 0) return 0
    return data.ventas_por_dia.reduce((s, d) => s + d.total, 0) / data.ventas_por_dia.length
  }, [data])

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-critical/30 bg-critical/5 text-critical text-sm px-4 py-3">{error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    )
  }

  const margenPositivo = data.margen_mes >= 0

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
      className="p-6 flex flex-col gap-6 max-w-6xl mx-auto"
    >
      <div>
        <h1 className="text-xl font-serif text-foreground">Dashboard</h1>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">Vista general del negocio</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiTile label="Ventas hoy" value={currency.format(data.ventas_hoy.total)}
          sub={`${data.ventas_hoy.cantidad} ventas`} icon={<TrendingUp size={15} />} tone="positive" />
        <KpiTile label="Ventas semana" value={currency.format(data.ventas_semana.total)}
          sub={`${data.ventas_semana.cantidad} ventas`} icon={<TrendingUp size={15} />} />
        <KpiTile label="Ventas mes" value={currency.format(data.ventas_mes.total)}
          sub={`${data.ventas_mes.cantidad} ventas`} icon={<Wallet size={15} />} />
        <KpiTile label="Gastos del mes" value={currency.format(data.gastos_mes)}
          icon={<PiggyBank size={15} />} tone="warning" />
        <KpiTile label="Margen del mes" value={currency.format(data.margen_mes)}
          icon={margenPositivo ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
          tone={margenPositivo ? 'positive' : 'critical'} />
        <KpiTile label="Stock crítico" value={String(data.stock_critico_count)}
          sub="productos bajo mínimo" icon={<PackageX size={15} />}
          tone={data.stock_critico_count > 0 ? 'critical' : 'default'} />
      </div>

      {/* Trend chart */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Ventas — últimos 30 días</h2>
          {data.ventas_por_dia.some(d => d.total < avgVentas * 0.6) && (
            <span className="flex items-center gap-1.5 text-[11px] text-critical">
              <span className="size-1.5 rounded-full bg-critical" />
              Desvío detectado
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.ventas_por_dia} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="18%">
            <CartesianGrid strokeDasharray="4 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 10, fontFamily: 'Courier Prime, monospace', fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={v => v.slice(5)} axisLine={{ stroke: 'hsl(var(--foreground))' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fontFamily: 'Courier Prime, monospace', fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false} tickLine={false} tickFormatter={formatCompact} width={48} />
            <Tooltip
              cursor={{ fill: 'hsl(var(--foreground) / 0.05)' }}
              contentStyle={{ background: 'hsl(var(--card))', border: '2px solid hsl(var(--foreground))', borderRadius: 4, fontSize: 12, boxShadow: '3px 3px 0 0 hsl(var(--foreground) / 0.15)' }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))', fontFamily: 'Karla, sans-serif' }}
              formatter={(v) => [currency.format(Number(v ?? 0)), 'Ventas']}
            />
            <Bar dataKey="total" radius={[2, 2, 0, 0]}>
              {data.ventas_por_dia.map((d, i) => (
                <Cell
                  key={i}
                  fill={avgVentas > 0 && d.total < avgVentas * 0.6 ? 'hsl(var(--critical))' : 'hsl(var(--primary))'}
                  stroke="hsl(var(--foreground))"
                  strokeWidth={1}
                  strokeOpacity={0.15}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top productos */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Productos más vendidos</h2>
          <div className="flex flex-col gap-3">
            {data.top_productos.length === 0 && <p className="text-xs text-muted-foreground">Sin datos aún.</p>}
            {data.top_productos.map((p, i) => {
              const max = Math.max(...data.top_productos.map(tp => tp.revenue), 1)
              return (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground/90 truncate">{p.nombre}</span>
                    <span className="font-mono text-muted-foreground shrink-0 ml-2">{currency.format(p.revenue)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(p.revenue / max) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stock crítico */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Stock crítico</h2>
            <button onClick={() => onNavigate('productos')} className="text-[11px] text-primary hover:underline cursor-pointer">
              Ver productos →
            </button>
          </div>
          {data.productos_stock_critico.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todo el stock está por encima del mínimo.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.productos_stock_critico.map(p => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-critical/5 border border-critical/20">
                  <span className="text-xs text-foreground/90 truncate">{p.nombre}</span>
                  <span className="text-[11px] font-mono text-critical shrink-0 ml-2">{p.stock} / {p.stock_minimo}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ventas recientes */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Ventas recientes</h2>
          <button onClick={() => onNavigate('ventas')} className="text-[11px] text-primary hover:underline cursor-pointer">
            Ver todas →
          </button>
        </div>
        <div className="flex flex-col">
          <div className="grid grid-cols-[1fr_130px_110px] gap-2 items-center pb-2 border-b border-border">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Cliente</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-center">Canal</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">Total</span>
          </div>
          <div className="flex flex-col divide-y divide-border/50">
            {data.ventas_recientes.map(v => (
              <div key={v.id} className="grid grid-cols-[1fr_130px_110px] gap-2 items-center py-2.5 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Users2 size={13} className="text-muted-foreground shrink-0" />
                  <span className="text-foreground/90 truncate">{v.cliente_nombre ?? 'Consumidor final'}</span>
                </div>
                <span className="flex justify-center">
                  <CategoryBadge category={CANAL_LABEL[v.canal]} />
                </span>
                <span className="font-mono text-foreground text-right">{currency.format(v.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
