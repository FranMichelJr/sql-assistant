import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io, type Socket } from 'socket.io-client'
import {
  Bot, User, Send, Loader2, RadioTower, FileText, X, Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { AgentMessage, AgentReportSummary, AgentReportDetail } from '@/types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

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

// ── Minimal, dependency-free markdown renderer for the agent's reports ─────
function MarkdownLite({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let list: string[] = []

  const flushList = (key: string) => {
    if (list.length === 0) return
    blocks.push(
      <ul key={key} className="list-disc pl-5 space-y-1">
        {list.map((li, i) => <li key={i}>{renderInline(li)}</li>)}
      </ul>
    )
    list = []
  }

  function renderInline(s: string): React.ReactNode {
    const parts = s.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i} className="text-foreground font-semibold">{p.slice(2, -2)}</strong>
        : p
    )
  }

  lines.forEach((line, i) => {
    const l = line.trim()
    if (l.startsWith('### ')) { flushList(`ul-${i}`); blocks.push(<h3 key={i} className="text-sm font-semibold text-foreground mt-3 mb-1">{l.slice(4)}</h3>) }
    else if (l.startsWith('## ')) { flushList(`ul-${i}`); blocks.push(<h2 key={i} className="text-base font-semibold text-foreground mt-4 mb-1.5">{l.slice(3)}</h2>) }
    else if (l.startsWith('- ') || l.startsWith('* ')) { list.push(l.slice(2)) }
    else if (l === '') { flushList(`ul-${i}`) }
    else { flushList(`ul-${i}`); blocks.push(<p key={i} className="text-sm text-muted-foreground leading-relaxed">{renderInline(l)}</p>) }
  })
  flushList('ul-end')

  return <div className="flex flex-col gap-0.5">{blocks}</div>
}

function ChatBubble({ msg }: { msg: AgentMessage }) {
  const isAgent = msg.role === 'agent'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className={`flex gap-2.5 ${isAgent ? '' : 'flex-row-reverse'}`}
    >
      <div className={`size-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
        isAgent ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted/40 border-border text-foreground'
      }`}>
        {isAgent ? <Bot size={14} /> : <User size={14} />}
      </div>
      <div className={`flex flex-col gap-1 max-w-[80%] ${isAgent ? 'items-start' : 'items-end'}`}>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isAgent
            ? 'bg-card border border-border text-foreground rounded-tl-sm'
            : 'bg-primary/12 border border-primary/25 text-foreground rounded-tr-sm'
        }`}>
          {msg.content}
        </div>
        <span className="text-[10px] text-muted-foreground/60 px-1">{timeAgo(msg.created_at)}</span>
      </div>
    </motion.div>
  )
}

export default function AgentView() {
  const { token, user } = useAuth()
  const isDemo = user?.role === 'demo'
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [reports, setReports] = useState<AgentReportSummary[]>([])
  const [openReport, setOpenReport] = useState<AgentReportDetail | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [statusNote, setStatusNote] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.agent.messages().then(setMessages).catch(() => {})
    api.agent.reports().then(setReports).catch(() => {})
  }, [])

  useEffect(() => {
    if (!token) return
    const socket = io(BASE, { transports: ['websocket', 'polling'] })
    socket.on('agent_message', (msg: AgentMessage) => {
      setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
      setStatusNote(null)
    })
    socket.on('agent_report', () => {
      api.agent.reports().then(setReports).catch(() => {})
    })
    socketRef.current = socket
    return () => { socket.disconnect(); socketRef.current = null }
  }, [token])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    const optimistic: AgentMessage = {
      id: -Date.now(), role: 'user', content: text, related_notification_id: null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    try {
      const reply = await api.agent.chat(text)
      setMessages(prev => [...prev, reply])
    } catch (e) {
      setMessages(prev => [...prev, {
        id: -Date.now() - 1, role: 'agent',
        content: e instanceof Error ? `No pude responder: ${e.message}` : 'No pude responder.',
        related_notification_id: null, created_at: new Date().toISOString(),
      }])
    } finally {
      setSending(false)
    }
  }, [input, sending])

  const handleRunNow = async () => {
    setChecking(true)
    setStatusNote(null)
    try {
      const res = await api.agent.runNow()
      if (res.anomalies === 0) setStatusNote('El agente revisó todo y no encontró desvíos por ahora.')
    } catch (e) {
      setStatusNote(e instanceof Error ? e.message : 'No se pudo ejecutar el chequeo.')
    } finally {
      setChecking(false)
    }
  }

  const handleGenerateReport = async () => {
    setGenerating(true)
    try {
      await api.agent.generateReport()
    } catch (e) {
      setStatusNote(e instanceof Error ? e.message : 'No se pudo generar el reporte.')
    } finally {
      setGenerating(false)
    }
  }

  const openReportDetail = async (id: number) => {
    setLoadingReport(true)
    try {
      const detail = await api.agent.report(id)
      setOpenReport(detail)
    } catch { /* ignore */ } finally {
      setLoadingReport(false)
    }
  }

  return (
    <div className="h-full flex">
      {/* Chat timeline */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 flex items-center justify-between px-6 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <RadioTower size={14} className="text-primary" />
            <span className="text-base font-serif text-foreground">El agente</span>
            <span className="text-[10px] font-mono text-muted-foreground">· en vivo</span>
          </div>
          <button
            type="button" onClick={handleRunNow} disabled={checking || isDemo}
            title={isDemo ? 'No disponible en la cuenta demo' : undefined}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-muted/30 disabled:hover:text-muted-foreground cursor-pointer"
          >
            {checking ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Ejecutar chequeo ahora
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-16">
              <div className="size-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary">
                <Bot size={22} />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                Todavía no hay mensajes. Preguntale algo al agente o pedile que revise el negocio ahora.
              </p>
            </div>
          )}
          {messages.map(m => <ChatBubble key={m.id} msg={m} />)}
          <AnimatePresence>
            {statusNote && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs text-muted-foreground italic px-1"
              >
                {statusNote}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 border-t border-border shrink-0">
          {isDemo && (
            <p className="text-[11px] text-muted-foreground/70 mb-2 px-1">
              Modo demo: solo lectura. El chat y las acciones del agente no están disponibles para no consumir la API.
            </p>
          )}
          <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-primary/50 transition-colors">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={isDemo ? 'Chat no disponible en la cuenta demo' : 'Preguntale algo al agente sobre tu negocio…'}
              disabled={isDemo}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:cursor-not-allowed"
            />
            <button
              type="button" onClick={handleSend} disabled={!input.trim() || sending || isDemo}
              className="size-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shrink-0 cursor-pointer"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Reports panel */}
      <div className="w-72 shrink-0 border-l border-border flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-border shrink-0">
          <span className="text-base font-serif text-foreground">Reportes semanales</span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 flex flex-col gap-2">
          {reports.length === 0 && (
            <p className="text-xs text-muted-foreground px-1 py-4">Todavía no hay reportes generados.</p>
          )}
          {reports.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => openReportDetail(r.id)}
              className="text-left px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText size={12} className="text-primary shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">{r.title}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{timeAgo(r.created_at)}</span>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-border">
          <button
            type="button" onClick={handleGenerateReport} disabled={generating || isDemo}
            title={isDemo ? 'No disponible en la cuenta demo' : undefined}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-primary/12 text-primary border border-primary/25 hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary/12 cursor-pointer"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            Generar reporte ahora
          </button>
        </div>
      </div>

      {/* Report detail modal */}
      <AnimatePresence>
        {(openReport || loadingReport) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpenReport(null)}
            />
            <motion.div
              className="relative bg-card border border-border rounded-2xl w-full max-w-lg max-h-[80vh] shadow-2xl flex flex-col"
              initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
                <h2 className="text-sm font-semibold text-foreground">{openReport?.title ?? 'Cargando…'}</h2>
                <button type="button" onClick={() => setOpenReport(null)}
                  className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>
              <div className="px-6 py-5 overflow-y-auto scrollbar-thin">
                {loadingReport || !openReport ? (
                  <div className="flex flex-col gap-2">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-3 bg-muted/40 rounded animate-pulse" style={{ width: `${60 + i * 8}%` }} />)}
                  </div>
                ) : (
                  <MarkdownLite text={openReport.summary_md} />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
