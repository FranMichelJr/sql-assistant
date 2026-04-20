import { createContext, useContext, useState, useCallback } from 'react'

export type ActivityType = 'create' | 'update' | 'delete' | 'query' | 'stock' | 'order'
export type ActivityEntity = 'product' | 'customer' | 'order' | 'category' | 'query'

export interface ActivityEvent {
  id: string
  type: ActivityType
  entity: ActivityEntity
  entityName: string
  userName: string
  timestamp: Date
  details?: string
}

interface ActivityContextValue {
  events: ActivityEvent[]
  addActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void
  clearActivities: () => void
}

const ActivityContext = createContext<ActivityContextValue | null>(null)

const MAX_EVENTS = 100

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<ActivityEvent[]>([])

  const addActivity = useCallback((event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    setEvents(prev => [{
      ...event,
      id: crypto.randomUUID().slice(0, 8),
      timestamp: new Date(),
    }, ...prev].slice(0, MAX_EVENTS))
  }, [])

  const clearActivities = useCallback(() => setEvents([]), [])

  return (
    <ActivityContext.Provider value={{ events, addActivity, clearActivities }}>
      {children}
    </ActivityContext.Provider>
  )
}

export function useActivity() {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivity must be used inside ActivityProvider')
  return ctx
}
