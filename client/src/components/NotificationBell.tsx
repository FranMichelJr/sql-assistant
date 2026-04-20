import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, ShoppingCart, AlertTriangle, RefreshCw, CheckCheck, PackageSearch } from 'lucide-react'
import { useNotifications } from '@/context/NotificationContext'
import type { AppNotification, NotificationType } from '@/types'

// ── Config per notification type ──────────────────────────────────────────

const TYPE_CFG: Record<NotificationType, {
  icon: React.ReactNode
  iconCls: string
  bgCls: string
  barCls: string
}> = {
  new_order: {
    icon: <ShoppingCart size={13} />,
    iconCls: 'text-emerald-400',
    bgCls: 'bg-emerald-500/10 border-emerald-500/25',
    barCls: 'bg-emerald-400',
  },
  low_stock: {
    icon: <AlertTriangle size={13} />,
    iconCls: 'text-yellow-400',
    bgCls: 'bg-yellow-500/10 border-yellow-500/25',
    barCls: 'bg-yellow-400',
  },
  status_change: {
    icon: <RefreshCw size={13} />,
    iconCls: 'text-blue-400',
    bgCls: 'bg-blue-500/10 border-blue-500/25',
    barCls: 'bg-blue-400',
  },
}

// ── Time helper ───────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'ahora mismo'
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

// ── Single notification row ───────────────────────────────────────────────

function NotifRow({ n, onRead }: { n: AppNotification; onRead: () => void }) {
  const cfg = TYPE_CFG[n.type] ?? TYPE_CFG.new_order
  return (
    <motion.button
      type="button"
      layout
      onClick={onRead}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors
        hover:bg-muted/25 ${n.read ? 'opacity-55' : ''}`}
    >
      {/* type icon */}
      <div className={`size-7 rounded-lg flex items-center justify-center shrink-0 border
        ${cfg.bgCls} ${cfg.iconCls}`}>
        {cfg.icon}
      </div>

      {/* content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <span className={`text-[12px] font-semibold leading-tight
            ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>
            {n.title}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0">
            {timeAgo(n.created_at)}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
          {n.message}
        </p>
      </div>

      {/* unread dot */}
      {!n.read && (
        <div className="size-1.5 rounded-full bg-primary shrink-0 mt-2" />
      )}
    </motion.button>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="size-12 rounded-2xl bg-muted/30 border border-border flex items-center justify-center">
        <PackageSearch size={20} className="text-muted-foreground/50" />
      </div>
      <p className="text-sm text-muted-foreground">Sin notificaciones</p>
    </div>
  )
}

// ── Main bell ─────────────────────────────────────────────────────────────

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleRead = (n: AppNotification) => {
    if (!n.read) markRead(n.id)
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`relative size-8 flex items-center justify-center rounded-lg transition-colors
          ${open
            ? 'bg-muted/60 text-foreground'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
          }`}
      >
        <motion.div
          animate={unreadCount > 0 ? { rotate: [0, -12, 12, -8, 8, 0] } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Bell size={15} />
        </motion.div>

        {/* Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500
                text-white text-[9px] font-bold flex items-center justify-center px-0.5 pointer-events-none"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-80 bg-card border border-border
              rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Notificaciones</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold
                    bg-red-500/15 text-red-400 border border-red-500/20 leading-none">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground
                    hover:text-foreground transition-colors"
                >
                  <CheckCheck size={12} />
                  Leer todas
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[340px] divide-y divide-border/40">
              {notifications.length === 0 ? (
                <EmptyState />
              ) : (
                notifications.map(n => (
                  <NotifRow key={n.id} n={n} onRead={() => handleRead(n)} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
