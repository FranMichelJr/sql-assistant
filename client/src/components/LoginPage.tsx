import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, ArrowRight, Loader2, TrendingUp, Bell, FileText } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const DEMO_ACCOUNTS = [
  { email: 'demo@bymes.ar', password: 'ByMesDemo26!', label: 'Demo' },
]


const HIGHLIGHTS = [
  { icon: <Bell size={14} />, text: 'Detecta desvíos en ventas, gastos y stock, solo.' },
  { icon: <TrendingUp size={14} />, text: 'KPIs en tiempo real, sin armar planillas.' },
  { icon: <FileText size={14} />, text: 'Reportes semanales en lenguaje natural.' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || loading) return
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-background bg-grid relative overflow-hidden px-4">
      <div className="relative w-full max-w-md">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center text-center mb-8"
        >
          <motion.div
            initial={{ scale: 1.6, rotate: -14, opacity: 0 }}
            animate={{ scale: 1, rotate: -6, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative size-16 rounded-full bg-card border-[3px] border-primary flex items-center justify-center text-primary mb-4 shadow-stamp-primary"
          >
            <div className="absolute inset-1 rounded-full border border-primary/40" />
            <Bot size={28} />
          </motion.div>
          <h1 className="text-3xl font-serif tracking-tight text-foreground">
            By<span className="text-primary">Mes</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">
            Tu negocio, en piloto automático. El agente de BI que vigila tu PyME y te avisa antes de que preguntes.
          </p>
        </motion.div>

        {/* Highlights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex flex-col gap-2 mb-6"
        >
          {HIGHLIGHTS.map((h, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <span className="size-6 rounded-md bg-muted/40 border border-border flex items-center justify-center text-primary shrink-0">
                {h.icon}
              </span>
              {h.text}
            </div>
          ))}
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-2xl p-6 shadow-stamp flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="demo@bymes.ar"
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
            />
          </div>

          {error && (
            <div className="text-xs text-critical bg-critical/10 border border-critical/25 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer mt-1"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <>Entrar <ArrowRight size={15} /></>}
          </button>

          {/* Demo accounts — informativo, no interactivo */}
          <div className="pt-3 mt-1 border-t border-border/60 pointer-events-none select-none">
            <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-2">
              Iniciá con estas credenciales para ver la demo
            </p>
            <div className="flex flex-col gap-1.5">
              {DEMO_ACCOUNTS.map(acc => (
                <div
                  key={acc.email}
                  className="flex items-center justify-between gap-2 text-[11px] px-2.5 py-1.5 rounded-lg border border-border/60 bg-muted/20"
                >
                  <span className="font-medium text-foreground/70 shrink-0">{acc.label}</span>
                  <span className="font-mono text-muted-foreground truncate">{acc.email} · {acc.password}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.form>
      </div>
    </div>
  )
}
