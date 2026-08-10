import { useEffect, useState, lazy, Suspense } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Nav, canAccessView, defaultViewForRole } from '@/components/Nav'
import { NotificationBell } from '@/components/NotificationBell'
import { NotificationToasts } from '@/components/NotificationToasts'
import LoginPage from '@/components/LoginPage'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import type { AppView } from '@/types'

const AgentView = lazy(() => import('@/components/AgentView'))
const DashboardView = lazy(() => import('@/components/crud/DashboardView').then(m => ({ default: m.DashboardView })))
const VentasView = lazy(() => import('@/components/crud/VentasView').then(m => ({ default: m.VentasView })))
const ProductosView = lazy(() => import('@/components/crud/ProductosView').then(m => ({ default: m.ProductosView })))
const GastosView = lazy(() => import('@/components/crud/GastosView').then(m => ({ default: m.GastosView })))
const ClientesView = lazy(() => import('@/components/crud/ClientesView').then(m => ({ default: m.ClientesView })))
const SettingsView = lazy(() => import('@/components/crud/SettingsView').then(m => ({ default: m.SettingsView })))

const VIEW_TITLES: Partial<Record<AppView, string>> = {
  dashboard: 'Dashboard', ventas: 'Ventas', productos: 'Productos',
  gastos: 'Gastos', clientes: 'Clientes', settings: 'Configuración',
}

function ViewSkeleton() {
  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
      ))}
    </div>
  )
}

export default function App() {
  const { user, token, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [appView, setAppView] = useState<AppView>('dashboard')
  const [stockCritico, setStockCritico] = useState(0)

  useEffect(() => {
    if (user) setAppView(defaultViewForRole(user.role))
  }, [user?.email])

  useEffect(() => {
    if (!user || !token) return
    api.dashboard.get().then(d => setStockCritico(d.stock_critico_count)).catch(() => {})
  }, [user, token])

  if (!user || !token) return <LoginPage />

  const handleNavigate = (v: AppView) => {
    if (canAccessView(user.role, v)) setAppView(v)
  }

  return (
    <>
      <NotificationToasts />
      <div className="flex h-full overflow-hidden bg-background">
        <Nav appView={appView} onNavigate={handleNavigate} user={user} onLogout={logout} stockCriticoCount={stockCritico} />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <header className="h-14 flex items-center gap-3 px-6 border-b border-border shrink-0">
            <span className="text-sm font-medium text-foreground">
              {VIEW_TITLES[appView] ?? ''}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
                title="Cambiar tema"
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <div className="w-px h-4 bg-border" />
              <NotificationBell />
            </div>
          </header>

          <main className="flex-1 overflow-hidden">
            <Suspense fallback={<ViewSkeleton />}>
              {appView === 'agente' && canAccessView(user.role, 'agente') && <AgentView />}
              {appView === 'dashboard' && canAccessView(user.role, 'dashboard') && (
                <div className="h-full overflow-y-auto scrollbar-thin"><DashboardView onNavigate={handleNavigate} /></div>
              )}
              {appView === 'ventas' && canAccessView(user.role, 'ventas') && (
                <div className="h-full overflow-y-auto scrollbar-thin"><VentasView /></div>
              )}
              {appView === 'productos' && canAccessView(user.role, 'productos') && (
                <div className="h-full overflow-y-auto scrollbar-thin"><ProductosView /></div>
              )}
              {appView === 'gastos' && canAccessView(user.role, 'gastos') && (
                <div className="h-full overflow-y-auto scrollbar-thin"><GastosView /></div>
              )}
              {appView === 'clientes' && canAccessView(user.role, 'clientes') && (
                <div className="h-full overflow-y-auto scrollbar-thin"><ClientesView /></div>
              )}
              {appView === 'settings' && canAccessView(user.role, 'settings') && (
                <div className="h-full overflow-y-auto scrollbar-thin"><SettingsView /></div>
              )}
            </Suspense>
          </main>
        </div>
      </div>
    </>
  )
}
