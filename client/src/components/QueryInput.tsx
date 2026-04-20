import { useRef, type KeyboardEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const EXAMPLES = [
  '¿Cuáles son los 5 productos más vendidos?',
  '¿Cuántos clientes hay por país?',
  'Total de ventas por categoría',
  '¿Qué clientes tienen pedidos pendientes?',
  '¿Cuál es el producto con mayor stock?',
]

interface QueryInputProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  loading: boolean
}

export default function QueryInput({ value, onChange, onSubmit, loading }: QueryInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <label className="block text-[10px] font-mono font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        Consulta en lenguaje natural
      </label>

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
        rows={3}
        placeholder="Ej: ¿Cuáles son los 5 productos más vendidos por categoría?"
        className="
          w-full bg-input border border-border rounded-lg
          px-4 py-3 text-sm text-foreground font-sans
          placeholder:text-muted-foreground/30
          focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
          disabled:opacity-50 disabled:cursor-not-allowed
          resize-none transition-all duration-150 scrollbar-thin
        "
      />

      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => { onChange(ex); ref.current?.focus() }}
            disabled={loading}
            className="
              text-[10px] font-mono px-2.5 py-1 rounded-full border border-border
              text-muted-foreground hover:border-primary/40 hover:text-primary
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-150 cursor-pointer
            "
          >
            {ex.length > 38 ? ex.slice(0, 35) + '…' : ex}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-mono text-muted-foreground/40 select-none">
          Ctrl + Enter para ejecutar
        </span>
        <Button
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          size="sm"
          className="gap-2 px-4 h-8 text-xs font-mono font-semibold"
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Procesando...</>
          ) : (
            <><Send className="w-3.5 h-3.5" />Ejecutar</>
          )}
        </Button>
      </div>
    </div>
  )
}
