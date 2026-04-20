import { motion, AnimatePresence } from 'framer-motion'
import Close from '@carbon/icons-react/es/Close'

interface Shortcut {
  keys: string[]
  label: string
}

const GROUPS: { title: string; shortcuts: Shortcut[] }[] = [
  {
    title: 'Navegación',
    shortcuts: [
      { keys: ['Ctrl', 'K'], label: 'Búsqueda global' },
      { keys: ['Ctrl', 'B'], label: 'Modo focus (ocultar sidebar)' },
      { keys: ['?'], label: 'Mostrar atajos de teclado' },
    ],
  },
  {
    title: 'Consultas',
    shortcuts: [
      { keys: ['Ctrl', 'Enter'], label: 'Ejecutar consulta' },
      { keys: ['Ctrl', 'N'], label: 'Nueva consulta' },
      { keys: ['Enter'], label: 'Enviar mensaje en chat' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['ESC'], label: 'Cerrar modal / panel' },
      { keys: ['↑', '↓'], label: 'Navegar en resultados' },
      { keys: ['⏎'], label: 'Seleccionar resultado' },
    ],
  },
]

function Key({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded border border-border bg-muted/50 text-[10px] font-mono text-foreground/70 shadow-sm">
      {label}
    </kbd>
  )
}

interface ShortcutsPanelProps {
  open: boolean
  onClose: () => void
}

export function ShortcutsPanel({ open, onClose }: ShortcutsPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Atajos de teclado</h2>
              <button type="button" onClick={onClose}
                className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                <Close size={15} />
              </button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-5 overflow-y-auto max-h-96">
              {GROUPS.map(group => (
                <div key={group.title}>
                  <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                    {group.title}
                  </p>
                  <div className="flex flex-col gap-2">
                    {group.shortcuts.map(s => (
                      <div key={s.label} className="flex items-center justify-between gap-4">
                        <span className="text-sm text-foreground/80">{s.label}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {s.keys.map((k, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <Key label={k} />
                              {i < s.keys.length - 1 && <span className="text-[10px] text-muted-foreground/40">+</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
