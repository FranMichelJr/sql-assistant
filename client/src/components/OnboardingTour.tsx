import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Close from '@carbon/icons-react/es/Close'

const STORAGE_KEY = 'sql_assistant_onboarding_done'

interface TourStep {
  title: string
  description: string
  hint?: string
  emoji: string
}

const STEPS: TourStep[] = [
  {
    emoji: '🎉',
    title: '¡Bienvenido a SQL Assistant!',
    description: 'Esta app te permite consultar tu base de datos usando lenguaje natural. No necesitás saber SQL — escribís tu pregunta y Claude la convierte automáticamente.',
    hint: 'Tour: 1 de 5',
  },
  {
    emoji: '💬',
    title: 'Consultas en lenguaje natural',
    description: 'En la sección "Consultar" (ícono de historial en el sidebar), escribís preguntas como "¿Cuáles son los 10 productos más vendidos?" y obtenés los datos al instante.',
    hint: 'Tour: 2 de 5',
  },
  {
    emoji: '📊',
    title: 'Dashboard y vistas CRUD',
    description: 'Desde los íconos del sidebar podés acceder al Dashboard con métricas, y gestionar Productos, Clientes, Órdenes y más directamente sin escribir SQL.',
    hint: 'Tour: 3 de 5',
  },
  {
    emoji: '⌨️',
    title: 'Atajos de teclado',
    description: 'Usá Ctrl+K para buscar en toda la app, Ctrl+N para nueva consulta, Ctrl+B para modo focus (ocultar sidebar), y "?" para ver todos los atajos.',
    hint: 'Tour: 4 de 5',
  },
  {
    emoji: '🚀',
    title: '¡Todo listo!',
    description: 'Ya estás listo para explorar. Podés volver a este tour desde tu perfil de usuario. ¡Que disfrutes SQL Assistant!',
    hint: 'Tour: 5 de 5',
  },
]

interface OnboardingTourProps {
  onComplete: () => void
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0)

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      handleFinish()
    }
  }

  const handleFinish = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    onComplete()
  }

  const current = STEPS[step]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -10 }}
          transition={{ duration: 0.2 }}
          className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col gap-5"
        >
          {/* Close */}
          <button
            type="button" onClick={handleFinish}
            className="absolute top-4 right-4 size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <Close size={15} />
          </button>

          {/* Hint */}
          <span className="text-[10px] font-mono text-muted-foreground/60">{current.hint}</span>

          {/* Emoji + title */}
          <div className="flex flex-col gap-2">
            <span className="text-4xl">{current.emoji}</span>
            <h2 className="text-lg font-semibold text-foreground">{current.title}</h2>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`rounded-full transition-all ${i === step ? 'w-5 h-2 bg-primary' : 'w-2 h-2 bg-border hover:bg-muted-foreground/40'}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button" onClick={handleFinish}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Saltar tour
            </button>
            <button
              type="button" onClick={handleNext}
              className="ml-auto px-5 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {step < STEPS.length - 1 ? 'Siguiente →' : '¡Empezar!'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export function shouldShowTour(): boolean {
  return !localStorage.getItem(STORAGE_KEY)
}
