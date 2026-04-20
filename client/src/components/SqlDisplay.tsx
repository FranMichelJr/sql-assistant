import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check } from 'lucide-react'
import Terminal from '@carbon/icons-react/es/Terminal'
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/light'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus'
// @ts-expect-error light build requires manual language registration
SyntaxHighlighter.registerLanguage('sql', sql)
import { Button } from '@/components/ui/button'

const syntaxStyle = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    background: 'transparent',
    margin: 0,
    padding: '1rem 1.25rem',
    fontSize: '0.8rem',
    lineHeight: '1.75',
    fontFamily: "'Fira Code', Consolas, monospace",
  },
  'code[class*="language-"]': {
    ...vscDarkPlus['code[class*="language-"]'],
    background: 'transparent',
    fontFamily: "'Fira Code', Consolas, monospace",
  },
}

function SkeletonSql() {
  return (
    <div className="p-5 space-y-3 animate-pulse">
      {[1 / 3, 2 / 3, 1 / 2, 3 / 4].map((w, i) => (
        <div key={i} className="h-3 bg-muted rounded" style={{ width: `${w * 100}%` }} />
      ))}
    </div>
  )
}

interface SqlDisplayProps {
  sql: string | null
  loading: boolean
}

export default function SqlDisplay({ sql, loading }: SqlDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!sql) return
    try {
      await navigator.clipboard.writeText(sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-primary" />
          <span className="text-[10px] font-mono font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            SQL Generado
          </span>
        </div>
        {sql && !loading && (
          <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 px-2.5 text-[10px] gap-1.5">
            {copied
              ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copiado</span></>
              : <><Copy className="w-3 h-3" />Copiar</>
            }
          </Button>
        )}
      </div>

      <div className="syntax-wrapper overflow-x-auto scrollbar-thin">
        {loading ? (
          <SkeletonSql />
        ) : sql ? (
          <SyntaxHighlighter
            language="sql"
            style={syntaxStyle}
            showLineNumbers
            lineNumberStyle={{
              color: 'hsl(231 34% 22%)',
              fontSize: '0.7rem',
              minWidth: '2.5rem',
              paddingRight: '1rem',
              userSelect: 'none',
            }}
            wrapLongLines={false}
          >
            {sql}
          </SyntaxHighlighter>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-xs font-mono text-muted-foreground/40">El SQL generado aparecerá aquí</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
