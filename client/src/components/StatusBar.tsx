import { motion } from 'framer-motion'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatusMessage } from '@/types'

const CONFIG = {
  error:   { Icon: AlertCircle,   cls: 'bg-destructive/10 border-destructive/30 text-destructive' },
  warning: { Icon: AlertTriangle, cls: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' },
  info:    { Icon: Info,          cls: 'bg-secondary border-border text-muted-foreground' },
} as const

export default function StatusBar({ status }: { status: StatusMessage }) {
  const { Icon, cls } = CONFIG[status.type]
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className={cn('flex items-start gap-2.5 px-4 py-3 rounded-xl border text-xs font-mono leading-relaxed', cls)}
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{status.text}</span>
    </motion.div>
  )
}
