import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import Settings from '@carbon/icons-react/es/Settings'
import { useAuth } from '@/context/AuthContext'
import { CrudHeader } from './shared'

export function SettingsView() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <div className="p-6 max-w-lg mx-auto">
      <CrudHeader icon={<Settings size={18} />} title="Configuración" count={0} />

      <div className="rounded-2xl border border-border bg-card p-5 mb-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Cuenta</h2>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>Nombre: <span className="text-foreground">{user?.name}</span></span>
          <span>Email: <span className="text-foreground">{user?.email}</span></span>
          <span>Rol: <span className="text-foreground capitalize">{user?.role}</span></span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Apariencia</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-colors cursor-pointer ${theme === 'dark' ? 'bg-primary/12 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-muted/40'}`}>
            <Moon size={14} /> Oscuro
          </button>
          <button type="button" onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-colors cursor-pointer ${theme === 'light' ? 'bg-primary/12 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-muted/40'}`}>
            <Sun size={14} /> Claro
          </button>
        </div>
      </div>
    </div>
  )
}
