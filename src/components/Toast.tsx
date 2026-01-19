import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react'

interface ToastOptions {
  type?: 'success' | 'error' | 'info' | 'warning'
  message: string
  title?: string
  icon?: ReactNode
  duration?: number
  onClick?: () => void
}

interface Toast extends ToastOptions {
  id: number
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const showToast = useCallback((options: ToastOptions) => {
    const id = Date.now() + Math.random() // Avoid ID collision
    const toast: Toast = { id, duration: 5000, type: 'info', ...options }

    setToasts(prev => [...prev, toast])

    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      timersRef.current.delete(id)
    }, toast.duration)

    timersRef.current.set(id, timer)
  }, [])

  const removeToast = useCallback((id: number) => {
    // Clear timer when manually removing
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach(timer => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const handleClick = () => {
    if (toast.onClick) {
      toast.onClick()
      onClose()
    }
  }

  const typeStyles = {
    success: {
      bg: 'bg-gradient-to-r from-success-500/20 to-success-600/10',
      border: 'border-success-500/30',
      icon: 'text-success-400',
      iconBg: 'bg-success-500/20',
    },
    error: {
      bg: 'bg-gradient-to-r from-error-500/20 to-error-600/10',
      border: 'border-error-500/30',
      icon: 'text-error-400',
      iconBg: 'bg-error-500/20',
    },
    warning: {
      bg: 'bg-gradient-to-r from-warning-500/20 to-warning-600/10',
      border: 'border-warning-500/30',
      icon: 'text-warning-400',
      iconBg: 'bg-warning-500/20',
    },
    info: {
      bg: 'bg-gradient-to-r from-accent-500/20 to-accent-600/10',
      border: 'border-accent-500/30',
      icon: 'text-accent-400',
      iconBg: 'bg-accent-500/20',
    },
  }

  const style = typeStyles[toast.type || 'info']

  const defaultIcons = {
    success: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }

  return (
    <div
      className={`
        pointer-events-auto
        w-80 sm:w-96
        ${style.bg}
        backdrop-blur-xl
        border ${style.border}
        rounded-2xl
        shadow-2xl shadow-black/20
        overflow-hidden
        animate-slide-in-right
        ${toast.onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}
        transition-transform duration-200
      `}
      onClick={handleClick}
    >
      {/* Glow effect */}
      <div className={`absolute inset-0 ${style.bg} blur-xl opacity-50`} />

      <div className="relative p-4">
        <div className="flex gap-3">
          {/* Icon */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center ${style.icon}`}>
            {toast.icon || defaultIcons[toast.type || 'info']}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            {toast.title && (
              <p className="text-sm font-semibold text-dark-100 mb-0.5">
                {toast.title}
              </p>
            )}
            <p className="text-sm text-dark-300 leading-relaxed">
              {toast.message}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="flex-shrink-0 w-6 h-6 rounded-lg hover:bg-dark-700/50 flex items-center justify-center text-dark-500 hover:text-dark-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-dark-800/50">
          <div
            className={`h-full ${style.icon.replace('text-', 'bg-')} opacity-60`}
            style={{
              animation: `shrink ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
