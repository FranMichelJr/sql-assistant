import { motion } from 'framer-motion'
import {
  LayoutDashboard, Bot, ShoppingCart, Package, Receipt, Users, Settings, LogOut,
} from 'lucide-react'
import type { AppView, User, UserRole } from '@/types'

const NAV_ITEMS: { view: AppView; label: string; icon: React.ReactNode }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
  { view: 'agente', label: 'Agente', icon: <Bot size={17} /> },
  { view: 'ventas', label: 'Ventas', icon: <ShoppingCart size={17} /> },
  { view: 'productos', label: 'Productos', icon: <Package size={17} /> },
  { view: 'gastos', label: 'Gastos', icon: <Receipt size={17} /> },
  { view: 'clientes', label: 'Clientes', icon: <Users size={17} /> },
]

const ROLE_ALLOWED: Record<UserRole, AppView[]> = {
  dueno:     ['agente', 'dashboard', 'ventas', 'productos', 'gastos', 'clientes', 'settings'],
  encargado: ['agente', 'dashboard', 'ventas', 'productos', 'clientes', 'settings'],
  demo:      ['agente', 'dashboard', 'ventas', 'productos', 'gastos', 'clientes', 'settings'],
}

const ROLE_LABEL: Record<UserRole, string> = {
  dueno: 'Dueño/a',
  encargado: 'Encargado/a',
  demo: 'Demo',
}

export function canAccessView(role: UserRole, view: AppView): boolean {
  return ROLE_ALLOWED[role]?.includes(view) ?? false
}

export function defaultViewForRole(_role: UserRole): AppView {
  return 'dashboard'
}

interface NavProps {
  appView: AppView
  onNavigate: (v: AppView) => void
  user: User
  onLogout: () => void
  stockCriticoCount?: number
}

export function Nav({ appView, onNavigate, user, onLogout, stockCriticoCount = 0 }: NavProps) {
  const allowed = ROLE_ALLOWED[user.role] ?? []

  return (
    <aside className="w-56 h-full shrink-0 border-r border-border bg-background flex flex-col">
      {/* Brand */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
        <div className="size-8 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary shrink-0">
          <Bot size={16} />
        </div>
        <span className="text-[17px] font-serif tracking-tight text-foreground">
          By<span className="text-primary">Mes</span>
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.filter(i => allowed.includes(i.view)).map(item => {
          const isActive = appView === item.view
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onNavigate(item.view)}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary"
                  transition={{ duration: 0.2 }}
                />
              )}
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.view === 'productos' && stockCriticoCount > 0 && (
                <span className="min-w-[18px] h-[18px] rounded-full bg-warning/20 text-warning text-[10px] font-bold flex items-center justify-center px-1">
                  {stockCriticoCount > 9 ? '9+' : stockCriticoCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer: settings + user + logout */}
      <div className="border-t border-border p-3 flex flex-col gap-1">
        {allowed.includes('settings') && (
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              appView === 'settings'
                ? 'bg-primary/12 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <Settings size={17} />
            Configuración
          </button>
        )}

        <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
          <div className="size-8 rounded-full bg-card border border-border flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
            <p className="text-[10px] text-muted-foreground">{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesión"
            className="size-7 flex items-center justify-center rounded-lg text-muted-foreground/60 hover:bg-critical/10 hover:text-critical transition-colors shrink-0 cursor-pointer"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
