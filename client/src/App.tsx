import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, PlusCircle, Sun, Moon, Activity } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Badge } from '@/components/ui/badge'
import { SqlAssistantSidebar } from '@/components/ui/sidebar-component'
import QueryInput from '@/components/QueryInput'
import SqlDisplay from '@/components/SqlDisplay'
import ResultsTable from '@/components/ResultsTable'
import StatusBar from '@/components/StatusBar'
import { AnimatedAIChat } from '@/components/ui/animated-ai-chat'
import { DashboardView } from '@/components/crud/DashboardView'
import { ProductsView } from '@/components/crud/ProductsView'
import { CustomersView } from '@/components/crud/CustomersView'
import { OrdersView } from '@/components/crud/OrdersView'
import { CategoriesView } from '@/components/crud/CategoriesView'
import { LowStockView } from '@/components/crud/LowStockView'
import { ReportsView } from '@/components/crud/ReportsView'
import { SettingsView } from '@/components/crud/SettingsView'
import { ProfileView } from '@/components/crud/ProfileView'
import { GlobalSearch } from '@/components/GlobalSearch'
import { OnboardingTour, shouldShowTour } from '@/components/OnboardingTour'
import { ShortcutsPanel } from '@/components/ShortcutsPanel'
import { ActivityFeed } from '@/components/ActivityFeed'
import LoginPage from '@/components/LoginPage'
import { NotificationBell } from '@/components/NotificationBell'
import { NotificationToasts } from '@/components/NotificationToasts'
import { useAuth } from '@/context/AuthContext'
import { useActivity } from '@/context/ActivityContext'
import { api } from '@/lib/api'
import type { QueryResult, HistoryItem, StatusMessage, AppView, UserRole } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const LOADING_MSGS = [
  'Consultando a Claude...',
  'Generando SQL...',
  'Procesando pregunta...',
  'Analizando esquema...',
]

const CRUD_LABELS: Partial<Record<AppView, string>> = {
  products: 'Productos',
  customers: 'Clientes',
  orders: 'Órdenes',
  categories: 'Categorías',
  lowstock: 'Stock Bajo',
  reports: 'Reportes',
  settings: 'Configuración',
  profile: 'Mi Perfil',
}

const ROLE_ALLOWED: Record<UserRole, AppView[]> = {
  admin:      ['dashboard', 'query', 'products', 'customers', 'orders', 'categories', 'lowstock', 'reports', 'settings', 'profile'],
  vendedor:   ['dashboard', 'orders', 'customers', 'reports', 'settings', 'profile'],
  bodega:     ['products', 'categories', 'lowstock', 'settings', 'profile'],
  espectador: ['dashboard', 'query', 'products', 'customers', 'orders', 'reports', 'profile'],
}

const DEFAULT_VIEW: Record<UserRole, AppView> = {
  admin:      'dashboard',
  vendedor:   'dashboard',
  bodega:     'products',
  espectador: 'dashboard',
}

function recordQueryDate() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const raw = localStorage.getItem('sql_query_log') ?? '[]'
    const arr: string[] = JSON.parse(raw)
    arr.push(today)
    localStorage.setItem('sql_query_log', JSON.stringify(arr.slice(-2000)))
  } catch {}
}

function recordLastAccess() {
  try {
    localStorage.setItem('sql_last_access', new Date().toISOString())
  } catch {}
}

export default function App() {
  const { user, token, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { addActivity } = useActivity()

  const [question, setQuestion]       = useState('')
  const [loading, setLoading]         = useState(false)
  const [loadingMsg, setLoadingMsg]   = useState(LOADING_MSGS[0])
  const [result, setResult]           = useState<QueryResult | null>(null)
  const [status, setStatus]           = useState<StatusMessage | null>(null)
  const [history, setHistory]         = useState<HistoryItem[]>([])
  const [activeId, setActiveId]       = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [appView, setAppView]         = useState<AppView>('dashboard')
  const [lowStockCount, setLowStockCount] = useState(0)
  const [focusMode, setFocusMode]     = useState(false)

  // Overlay panels
  const [searchOpen, setSearchOpen]       = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [activityOpen, setActivityOpen]   = useState(false)
  const [tourOpen, setTourOpen]           = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Set initial view + start onboarding on login
  useEffect(() => {
    if (user) {
      setAppView(DEFAULT_VIEW[user.role])
      recordLastAccess()
      if (shouldShowTour()) setTourOpen(true)
    }
  }, [user?.email])

  // Fetch low-stock count
  useEffect(() => {
    if (!user || !token) return
    if (user.role === 'vendedor' || user.role === 'espectador') return
    api.dashboard.get()
      .then(d => setLowStockCount(d.low_stock_count))
      .catch(() => {})
  }, [user, token])

  useEffect(() => {
    if (!loading) return
    let i = 0
    intervalRef.current = setInterval(() => {
      i = (i + 1) % LOADING_MSGS.length
      setLoadingMsg(LOADING_MSGS[i])
    }, 1400)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [loading])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA'

      if (e.key === 'Escape') {
        if (searchOpen) { setSearchOpen(false); return }
        if (shortcutsOpen) { setShortcutsOpen(false); return }
        if (activityOpen) { setActivityOpen(false); return }
        if (tourOpen) { setTourOpen(false); return }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(v => !v)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        setFocusMode(v => !v)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !isInput) {
        e.preventDefault()
        handleNewQuery()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && appView === 'query') {
        e.preventDefault()
        handleSubmit()
        return
      }

      if (e.key === '?' && !isInput) {
        setShortcutsOpen(v => !v)
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen, shortcutsOpen, activityOpen, tourOpen, appView])

  const canAccess = (view: AppView): boolean => {
    if (!user) return false
    return ROLE_ALLOWED[user.role].includes(view)
  }

  const handleAppViewChange = (v: AppView) => {
    if (canAccess(v)) setAppView(v)
  }

  const handleSubmit = useCallback(async (overrideQuestion?: string) => {
    const q = (overrideQuestion ?? question).trim()
    if (!q || loading) return

    setLoading(true)
    setStatus(null)
    setResult(null)
    setActiveId(null)
    setLoadingMsg(LOADING_MSGS[0])
    setAppView('query')

    try {
      const storedToken = localStorage.getItem('auth_token')
      const res = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
        },
        body: JSON.stringify({ question: q }),
      })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const data = await res.json()

      recordQueryDate()
      addActivity({ type: 'query', entity: 'query', entityName: q.slice(0, 50), userName: user?.name ?? 'Usuario' })

      if (!data.success) {
        const item: HistoryItem = {
          id: Date.now(), question: q, sql: data.sql ?? null,
          columns: [], rows: [], rowCount: 0,
          error: data.error, timestamp: new Date(),
        }
        setHistory(h => [...h, item])
        setActiveId(item.id)
        setResult({ sql: data.sql ?? '', columns: [], rows: [], rowCount: 0, error: data.error })
        setStatus({ type: 'error', text: data.error })
      } else {
        const item: HistoryItem = {
          id: Date.now(), question: q, sql: data.sql,
          columns: data.columns, rows: data.rows, rowCount: data.row_count,
          error: null, timestamp: new Date(),
        }
        setHistory(h => [...h, item])
        setActiveId(item.id)
        setResult({ sql: data.sql, columns: data.columns, rows: data.rows, rowCount: data.row_count, error: null })
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message.toLowerCase().includes('fetch')
          ? 'No se pudo conectar con el servidor Flask. ¿Está ejecutando "python app.py"?'
          : err instanceof Error ? err.message : 'Error desconocido'
      setStatus({ type: 'error', text: msg })
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [question, loading, logout, user, addActivity])

  const handleNewQuery = () => {
    setResult(null); setStatus(null); setQuestion(''); setActiveId(null)
    setAppView('query')
  }

  const handleHistorySelect = (item: HistoryItem) => {
    setActiveId(item.id)
    setQuestion(item.question)
    setAppView('query')
    setResult({ sql: item.sql ?? '', columns: item.columns, rows: item.rows, rowCount: item.rowCount, error: item.error })
    setStatus(item.error ? { type: 'error', text: item.error } : null)
  }

  const handleQuerySelect = (q: string) => {
    setQuestion(q)
    handleSubmit(q)
  }

  if (!user || !token) {
    return <LoginPage />
  }

  const showResults = loading || result !== null
  const isCrud = !['query', 'dashboard', 'settings', 'profile'].includes(appView)

  return (
    <>
    <NotificationToasts />

    {/* Overlays */}
    <GlobalSearch
      open={searchOpen}
      onClose={() => setSearchOpen(false)}
      history={history}
      onNavigate={handleAppViewChange}
      onQuerySelect={handleQuerySelect}
    />
    <ShortcutsPanel open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    <ActivityFeed open={activityOpen} onClose={() => setActivityOpen(false)} />
    {tourOpen && <OnboardingTour onComplete={() => setTourOpen(false)} />}

    <div className="flex h-full overflow-hidden bg-background">

      {/* Sidebar (hidden in focus mode) */}
      <AnimatePresence>
        {!focusMode && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-shrink-0 h-full border-r border-border overflow-hidden"
          >
            <SqlAssistantSidebar
              history={history}
              activeId={activeId}
              onSelect={handleHistorySelect}
              onClear={() => { setHistory([]); setActiveId(null) }}
              onQuerySelect={handleQuerySelect}
              appView={appView}
              onAppViewChange={handleAppViewChange}
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen(v => !v)}
              lowStockCount={lowStockCount}
              user={user}
              onLogout={logout}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="flex-shrink-0 h-12 flex items-center gap-3 px-4 border-b border-border bg-background/90 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" strokeWidth={2} />
            <span className="text-sm font-mono font-semibold text-foreground tracking-tight">
              SQL<span className="text-primary">Assistant</span>
            </span>
          </div>

          {(isCrud || ['settings', 'profile'].includes(appView)) && CRUD_LABELS[appView] && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>/</span>
              <span className="text-foreground font-medium">{CRUD_LABELS[appView]}</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Focus mode toggle */}
            <button
              type="button"
              onClick={() => setFocusMode(v => !v)}
              title={`${focusMode ? 'Salir del' : 'Entrar en'} modo focus (Ctrl+B)`}
              className={`size-8 flex items-center justify-center rounded-lg text-xs font-mono transition-colors ${
                focusMode ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              {focusMode ? '◁' : '▷'}
            </button>

            {isCrud ? (
              <button
                onClick={() => canAccess('dashboard') ? setAppView('dashboard') : setAppView(DEFAULT_VIEW[user.role])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-all bg-muted/40 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              >
                ← Inicio
              </button>
            ) : appView === 'query' ? (
              <button
                onClick={handleNewQuery}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-all bg-muted/40 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                title="Nueva consulta (Ctrl+N)"
              >
                <PlusCircle className="w-3 h-3" />
                Nueva
                <kbd className="ml-0.5 text-[9px] opacity-50">Ctrl+N</kbd>
              </button>
            ) : null}

            <div className="w-px h-4 bg-border" />

            {/* Search button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border border-border/40"
              title="Búsqueda global (Ctrl+K)"
            >
              <span>Buscar</span>
              <kbd className="text-[9px] opacity-50">Ctrl+K</kbd>
            </button>

            {/* Activity feed */}
            <button
              type="button"
              onClick={() => setActivityOpen(true)}
              title="Feed de actividad"
              className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              <Activity size={14} />
            </button>

            <div className="w-px h-4 bg-border" />
            <NotificationBell />
            <div className="w-px h-4 bg-border" />

            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              title="Cambiar tema"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <div className="w-px h-4 bg-border" />
            <Badge variant="default">claude-opus-4-7</Badge>
            <Badge variant="default">SQLite</Badge>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="wait">

            {appView === 'dashboard' && canAccess('dashboard') && (
              <DashboardView key="dashboard" onNavigate={v => canAccess(v) && setAppView(v)} />
            )}

            {appView === 'products'   && canAccess('products')   && <ProductsView   key="products"   />}
            {appView === 'customers'  && canAccess('customers')  && <CustomersView  key="customers"  />}
            {appView === 'orders'     && canAccess('orders')     && <OrdersView     key="orders"     />}
            {appView === 'categories' && canAccess('categories') && <CategoriesView key="categories" />}
            {appView === 'lowstock'   && canAccess('lowstock')   && <LowStockView   key="lowstock"   />}
            {appView === 'reports'    && canAccess('reports')    && <ReportsView    key="reports"    />}
            {appView === 'settings'   && canAccess('settings')   && <SettingsView   key="settings"   />}
            {appView === 'profile'    && canAccess('profile')    && (
              <ProfileView key="profile" history={history} onLogout={logout} />
            )}

            {appView === 'query' && canAccess('query') && (
              <motion.div
                key="query"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className={showResults || status ? 'px-5 py-5 space-y-4' : 'h-full'}
              >
                {(showResults || status) && (
                  <QueryInput
                    value={question}
                    onChange={setQuestion}
                    onSubmit={() => handleSubmit()}
                    loading={loading}
                  />
                )}

                <AnimatePresence>
                  {loading && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card"
                    >
                      <span className="flex gap-0.5">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="w-1 h-1 rounded-full bg-primary animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">{loadingMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {status && !loading && <StatusBar key="status" status={status} />}
                </AnimatePresence>

                <AnimatePresence>
                  {showResults && <SqlDisplay key="sql" sql={result?.sql ?? null} loading={loading} />}
                </AnimatePresence>

                <AnimatePresence>
                  {showResults && (
                    <ResultsTable key="results"
                      columns={result?.columns ?? []} rows={result?.rows ?? []}
                      loading={loading} rowCount={result?.rowCount}
                    />
                  )}
                </AnimatePresence>

                {!showResults && !status && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="lab-bg h-full"
                  >
                    <AnimatedAIChat
                      onSend={msg => { setQuestion(msg); handleSubmit(msg) }}
                      loading={loading}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
    </>
  )
}
