import { motion, AnimatePresence } from 'framer-motion'
import Time from '@carbon/icons-react/es/Time'
import TrashCan from '@carbon/icons-react/es/TrashCan'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { HistoryItem } from '@/types'

function HistoryCard({ item, isActive, onClick }: {
  item: HistoryItem
  isActive: boolean
  onClick: () => void
}) {
  const time = new Date(item.timestamp).toLocaleTimeString('es', {
    hour: '2-digit', minute: '2-digit',
  })
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={[
        'w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-150 cursor-pointer',
        isActive
          ? 'bg-primary/5 border-primary/25 shadow-[0_0_0_1px_hsl(var(--primary)/0.15),0_0_24px_hsl(var(--primary)/0.04)]'
          : 'bg-card border-border hover:bg-accent hover:border-border/60',
      ].join(' ')}
    >
      <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2 font-sans">
        {item.question}
      </p>
      <div className="flex items-center gap-2 mt-1.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.error ? 'bg-destructive' : 'bg-emerald-500'}`} />
        <span className="text-[10px] font-mono text-muted-foreground">
          {item.error ? 'error' : `${item.rowCount} filas`}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/40 ml-auto">{time}</span>
      </div>
    </motion.button>
  )
}

interface SidebarProps {
  history: HistoryItem[]
  activeId: number | null
  onSelect: (item: HistoryItem) => void
  onClear: () => void
}

export default function Sidebar({ history, activeId, onSelect, onClear }: SidebarProps) {
  return (
    <aside className="w-72 flex-shrink-0 flex flex-col bg-background border-r border-border h-full">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Time size={14} className="text-primary" />
          <span className="text-[10px] font-mono font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Historial
          </span>
        </div>
        <AnimatePresence>
          {history.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClear}
                title="Limpiar historial"
                className="h-6 w-6 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
              >
                <TrashCan size={13} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 p-3">
        {history.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border mx-auto mb-3 flex items-center justify-center">
              <Time size={18} className="text-muted-foreground/20" />
            </div>
            <p className="text-xs font-mono text-muted-foreground/30">Sin consultas aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {[...history].reverse().map((item) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  isActive={item.id === activeId}
                  onClick={() => onSelect(item)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex-shrink-0">
        <p className="text-[10px] font-mono text-muted-foreground/30 text-center">
          {history.length} consulta{history.length !== 1 ? 's' : ''} en sesión
        </p>
      </div>
    </aside>
  )
}
