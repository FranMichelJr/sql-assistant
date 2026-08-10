import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingCart, AlertTriangle, RefreshCw, X, Bot, FileText } from 'lucide-react'
import { useNotifications } from '@/context/NotificationContext'
import type { NotificationType } from '@/types'

const TYPE_CFG: Record<NotificationType, {
  icon: React.ReactNode
  iconCls: string
  barCls: string
  label: string
}> = {
  nueva_venta: {
    icon: <ShoppingCart size={14} />,
    iconCls: 'text-positive',
    barCls: 'bg-positive',
    label: 'Nueva Venta',
  },
  stock_bajo: {
    icon: <AlertTriangle size={14} />,
    iconCls: 'text-warning',
    barCls: 'bg-warning',
    label: 'Stock Bajo',
  },
  cambio_estado: {
    icon: <RefreshCw size={14} />,
    iconCls: 'text-primary',
    barCls: 'bg-primary',
    label: 'Estado',
  },
  agent_alert: {
    icon: <Bot size={14} />,
    iconCls: 'text-critical',
    barCls: 'bg-critical',
    label: 'Agente',
  },
  agent_report: {
    icon: <FileText size={14} />,
    iconCls: 'text-primary',
    barCls: 'bg-primary',
    label: 'Reporte',
  },
}

export function NotificationToasts() {
  const { toasts, dismissToast } = useNotifications()

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col-reverse gap-2.5 pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map(t => {
          const cfg = TYPE_CFG[t.type] ?? TYPE_CFG.nueva_venta
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 72, scale: 0.88 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 72, scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="pointer-events-auto w-[280px] bg-card border border-border
                rounded-xl shadow-2xl overflow-hidden"
            >
              {/* color bar */}
              <div className={`h-[3px] w-full ${cfg.barCls}`} />

              <div className="flex items-start gap-3 px-4 py-3">
                {/* icon */}
                <div className={`size-8 rounded-lg bg-muted/30 border border-border flex
                  items-center justify-center shrink-0 ${cfg.iconCls}`}>
                  {cfg.icon}
                </div>

                {/* text */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[12px] font-semibold text-foreground leading-tight">
                    {t.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                    {t.message}
                  </p>
                </div>

                {/* dismiss */}
                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  className="size-5 flex items-center justify-center rounded hover:bg-muted/60
                    text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
                >
                  <X size={11} />
                </button>
              </div>

              {/* progress bar */}
              <motion.div
                className={`h-[2px] ${cfg.barCls} opacity-30`}
                initial={{ scaleX: 1, transformOrigin: 'left' }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 5, ease: 'linear' }}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
