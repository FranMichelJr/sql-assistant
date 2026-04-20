import { motion } from 'framer-motion'
import { Settings } from '@carbon/icons-react'
import { DataBase } from '@carbon/icons-react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'

const APP_VERSION = '1.0.0'

export function SettingsView() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
      className="p-6 flex flex-col gap-6 max-w-lg"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <Settings size={18} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Configuración</h1>
          <p className="text-xs text-muted-foreground font-mono">Ajustes de la aplicación</p>
        </div>
      </div>

      {/* Model */}
      <section className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
        <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Modelo activo</h2>
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/30 border border-border">
          <span className="size-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-sm font-mono text-foreground">claude-opus-4-7</span>
          <span className="ml-auto text-xs text-muted-foreground">Anthropic</span>
        </div>
      </section>

      {/* Database */}
      <section className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
        <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Base de datos</h2>
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/30 border border-border">
          <DataBase size={15} className="text-primary shrink-0" />
          <span className="text-sm font-mono text-foreground">ecommerce.db</span>
          <span className="ml-auto text-xs text-muted-foreground font-mono">SQLite</span>
        </div>
      </section>

      {/* Theme toggle */}
      <section className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
        <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Tema</h2>
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2">
            {isDark ? <Moon size={15} className="text-primary" /> : <Sun size={15} className="text-primary" />}
            <span className="text-sm text-foreground">{isDark ? 'Modo oscuro' : 'Modo claro'}</span>
          </div>
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${isDark ? 'bg-primary' : 'bg-border'}`}
            aria-label="Toggle theme"
          >
            <span
              className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-300 ${isDark ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
      </section>

      {/* Version */}
      <section className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
        <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Versión</h2>
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/30 border border-border">
          <span className="text-sm font-mono text-foreground">SQL Assistant</span>
          <span className="text-xs font-mono text-muted-foreground">v{APP_VERSION}</span>
        </div>
      </section>
    </motion.div>
  )
}
