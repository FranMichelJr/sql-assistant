import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import type { AppNotification } from '@/types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface NotifContextValue {
  notifications: AppNotification[]
  unreadCount: number
  toasts: AppNotification[]
  markRead: (id: number) => Promise<void>
  markAllRead: () => Promise<void>
  dismissToast: (id: number) => void
}

const NotifContext = createContext<NotifContextValue | null>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [toasts, setToasts] = useState<AppNotification[]>([])
  const socketRef = useRef<Socket | null>(null)
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setNotifications([])
      setToasts([])
      return
    }

    // Load historical notifications
    fetch(`${BASE}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : []))
      .then(setNotifications)
      .catch(() => {})

    // Connect WebSocket
    const socket = io(BASE, { transports: ['websocket', 'polling'] })

    socket.on('notification', (notif: AppNotification) => {
      setNotifications(prev => [notif, ...prev])
      setToasts(prev => [...prev, notif])

      const timer = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== notif.id))
        timersRef.current.delete(notif.id)
      }, 5000)
      timersRef.current.set(notif.id, timer)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
      timersRef.current.forEach(clearTimeout)
      timersRef.current.clear()
    }
  }, [token])

  const unreadCount = notifications.filter(n => !n.read).length

  const markRead = useCallback(async (id: number) => {
    if (!token) return
    try {
      const res = await fetch(`${BASE}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch {}
  }, [token])

  const markAllRead = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${BASE}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch {}
  }, [token])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) { clearTimeout(timer); timersRef.current.delete(id) }
  }, [])

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, toasts, markRead, markAllRead, dismissToast }}>
      {children}
    </NotifContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotifContext)
  if (!ctx) throw new Error('useNotifications must be inside NotificationProvider')
  return ctx
}
