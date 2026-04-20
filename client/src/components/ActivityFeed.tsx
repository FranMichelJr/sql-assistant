import { motion, AnimatePresence } from 'framer-motion'
import Close from '@carbon/icons-react/es/Close'
import TrashCan from '@carbon/icons-react/es/TrashCan'
import { useActivity, type ActivityEvent, type ActivityType } from '@/context/ActivityContext'

function relativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const TYPE_VERB: Record<ActivityType, string> = {
  create: 'creó',
  update: 'actualizó',
  delete: 'eliminó',
  query:  'consultó',
  stock:  'ajustó stock de',
  order:  'cambió estado de',
}

const TYPE_COLOR: Record<ActivityType, string> = {
  create: 'bg-emerald-500/20 text-emerald-500',
  update: 'bg-blue-500/20 text-blue-400',
  delete: 'bg-red-500/20 text-red-400',
  query:  'bg-primary/20 text-primary',
  stock:  'bg-yellow-500/20 text-yellow-500',
  order:  'bg-purple-500/20 text-purple-400',
}

function ActivityItem({ event }: { event: ActivityEvent }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 items-start"
    >
      {/* Avatar */}
      <div className="size-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">
        {initials(event.userName)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground leading-snug">
          <span className="font-medium">{event.userName}</span>
          {' '}{TYPE_VERB[event.type]}{' '}
          <span className="font-medium">{event.entityName}</span>
          {event.details && <span className="text-muted-foreground"> · {event.details}</span>}
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">{relativeTime(event.timestamp)}</p>
      </div>

      {/* Type pill */}
      <span className={`shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded capitalize ${TYPE_COLOR[event.type]}`}>
        {event.type}
      </span>
    </motion.div>
  )
}

interface ActivityFeedProps {
  open: boolean
  onClose: () => void
}

export function ActivityFeed({ open, onClose }: ActivityFeedProps) {
  const { events, clearActivities } = useActivity()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.aside
            className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-card border-l border-border flex flex-col shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Actividad</span>
                {events.length > 0 && (
                  <span className="text-[10px] font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                    {events.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {events.length > 0 && (
                  <button type="button" onClick={clearActivities} title="Limpiar"
                    className="size-7 flex items-center justify-center rounded-lg text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <TrashCan size={13} />
                  </button>
                )}
                <button type="button" onClick={onClose}
                  className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                  <Close size={15} />
                </button>
              </div>
            </div>

            {/* Events */}
            <div className="flex-1 overflow-y-auto p-4">
              {events.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                  <div className="size-12 rounded-xl bg-muted/50 border border-border flex items-center justify-center">
                    <span className="text-xl">📋</span>
                  </div>
                  <p className="text-xs text-muted-foreground/60 font-mono">Sin actividad aún</p>
                  <p className="text-[11px] text-muted-foreground/40 max-w-[180px]">
                    Los cambios que hagas en productos, órdenes y clientes aparecerán aquí
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <AnimatePresence initial={false}>
                    {events.map(ev => (
                      <ActivityItem key={ev.id} event={ev} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border/50 shrink-0">
              <p className="text-[10px] font-mono text-muted-foreground/40 text-center">
                Actividad de la sesión actual
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
