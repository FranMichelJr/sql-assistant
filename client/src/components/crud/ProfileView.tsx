import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { UserProfile, Locked, Logout } from '@carbon/icons-react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import type { HistoryItem } from '@/types'

const ROLE_LABEL: Record<string, string> = { admin: 'Administrador', vendedor: 'Vendedor', bodega: 'Bodega' }
const ROLE_BADGE: Record<string, string> = {
  admin:    'bg-primary/15 text-primary border-primary/30',
  vendedor: 'bg-blue-500/15 text-blue-500 border-blue-500/30 dark:text-blue-300',
  bodega:   'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-300',
}

// ── Contribution Heatmap ───────────────────────────────────────────────────

function ContributionHeatmap({ queryDates }: { queryDates: string[] }) {
  const WEEKS = 20
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOfWeek = today.getDay()

  // Build a map of date → count
  const countByDate: Record<string, number> = {}
  for (const d of queryDates) {
    countByDate[d] = (countByDate[d] ?? 0) + 1
  }

  // Build grid: WEEKS * 7 days, starting from (today - WEEKS*7 days + padding)
  const totalDays = WEEKS * 7
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - totalDays + 1 + (6 - dayOfWeek))

  const cells: { date: string; count: number }[] = []
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().split('T')[0]
    cells.push({ date: key, count: countByDate[key] ?? 0 })
  }

  function color(count: number) {
    if (count === 0) return 'bg-muted/60'
    if (count <= 2) return 'bg-primary/30'
    if (count <= 5) return 'bg-primary/60'
    return 'bg-primary'
  }

  const weeks: { date: string; count: number }[][] = []
  for (let w = 0; w < WEEKS; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7))
  }

  return (
    <div className="flex gap-0.5 overflow-x-auto">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-0.5">
          {week.map(({ date, count }) => (
            <div
              key={date}
              title={`${date}: ${count} quer${count === 1 ? 'y' : 'ies'}`}
              className={`w-3 h-3 rounded-sm ${color(count)} transition-colors`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Password Change Form ───────────────────────────────────────────────────

function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const inputCls = 'w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors'

  const handleSave = async () => {
    setMsg(null)
    if (!current || !next || !confirm) { setMsg({ type: 'err', text: 'Completá todos los campos' }); return }
    if (next !== confirm) { setMsg({ type: 'err', text: 'Las contraseñas no coinciden' }); return }
    if (next.length < 6) { setMsg({ type: 'err', text: 'Mínimo 6 caracteres' }); return }
    setSaving(true)
    try {
      await api.auth.changePassword(current, next)
      setMsg({ type: 'ok', text: 'Contraseña actualizada correctamente' })
      setCurrent(''); setNext(''); setConfirm('')
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Error al cambiar contraseña' })
    } finally { setSaving(false) }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Locked size={13} /> Cambiar contraseña
      </h2>
      <div className="flex flex-col gap-3">
        <input type="password" className={inputCls} placeholder="Contraseña actual"
          value={current} onChange={e => setCurrent(e.target.value)} />
        <input type="password" className={inputCls} placeholder="Nueva contraseña"
          value={next} onChange={e => setNext(e.target.value)} />
        <input type="password" className={inputCls} placeholder="Confirmar nueva contraseña"
          value={confirm} onChange={e => setConfirm(e.target.value)} />
        {msg && (
          <p className={`text-xs ${msg.type === 'ok' ? 'text-emerald-500' : 'text-destructive'}`}>{msg.text}</p>
        )}
        <button
          type="button" onClick={handleSave} disabled={saving}
          className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Actualizar contraseña'}
        </button>
      </div>
    </section>
  )
}

// ── Main Profile View ──────────────────────────────────────────────────────

interface ProfileViewProps {
  history: HistoryItem[]
  onLogout: () => void
}

export function ProfileView({ history, onLogout }: ProfileViewProps) {
  const { user } = useAuth()

  const queryDates = useMemo(() => {
    // Merge session history + localStorage log
    const lsRaw = localStorage.getItem('sql_query_log') ?? '[]'
    let lsDates: string[] = []
    try { lsDates = JSON.parse(lsRaw) } catch {}
    const sessionDates = history.map(h => new Date(h.timestamp).toISOString().split('T')[0])
    return [...lsDates, ...sessionDates]
  }, [history])

  const topQueries = useMemo(() => {
    const freq: Record<string, number> = {}
    for (const h of history) {
      const key = h.question.slice(0, 60)
      freq[key] = (freq[key] ?? 0) + 1
    }
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [history])

  const lastAccess = useMemo(() => {
    const raw = localStorage.getItem('sql_last_access')
    return raw ? new Date(raw).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }) : 'Primera vez'
  }, [])

  if (!user) return null

  return (
    <motion.div
      key="profile"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
      className="p-6 flex flex-col gap-6 max-w-2xl"
    >
      {/* User card */}
      <section className="rounded-xl border border-border bg-card p-6 flex items-center gap-5">
        <div className="size-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary">
          <UserProfile size={30} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-foreground">{user.name}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-mono px-2 py-0.5 rounded border capitalize ${ROLE_BADGE[user.role]}`}>
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
            <span className="text-xs text-muted-foreground font-mono">Último acceso: {lastAccess}</span>
          </div>
        </div>
      </section>

      {/* Usage stats */}
      <section className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Actividad de consultas</h2>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/30 border border-border px-4 py-3 text-center">
            <p className="text-2xl font-mono font-semibold text-foreground tabular-nums">{queryDates.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total queries</p>
          </div>
          <div className="rounded-lg bg-muted/30 border border-border px-4 py-3 text-center">
            <p className="text-2xl font-mono font-semibold text-foreground tabular-nums">{history.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Esta sesión</p>
          </div>
          <div className="rounded-lg bg-muted/30 border border-border px-4 py-3 text-center">
            <p className="text-2xl font-mono font-semibold text-foreground tabular-nums">
              {queryDates.filter(d => d === new Date().toISOString().split('T')[0]).length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Hoy</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2 font-mono">Últimas 20 semanas</p>
          <ContributionHeatmap queryDates={queryDates} />
        </div>

        {topQueries.length > 0 && (
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-2">Queries más frecuentes</p>
            <div className="flex flex-col gap-1.5">
              {topQueries.map(([q, count]) => (
                <div key={q} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-xs text-foreground flex-1 truncate">{q}{q.length >= 60 ? '…' : ''}</span>
                  <span className="text-xs font-mono text-primary shrink-0">×{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Password change */}
      <PasswordForm />

      {/* Logout */}
      <button
        type="button" onClick={onLogout}
        className="flex items-center gap-2 px-4 py-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium"
      >
        <Logout size={16} />
        Cerrar sesión
      </button>
    </motion.div>
  )
}
