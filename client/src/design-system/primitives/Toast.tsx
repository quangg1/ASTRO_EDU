'use client'

/**
 * Toast — transient notification system.
 *
 * One container per app, one stack per provider. Replaces the page-local
 * `useState<string | null>` + `setTimeout` snippets scattered across consumer
 * pages. Auto-dismisses (default 3.2s for info, 4.2s for success/warning,
 * 5s for danger). Tone follows `ds-*` semantic tokens so it auto-themes per
 * surface.
 *
 *   // app/providers (root):
 *   <ToastProvider>{children}</ToastProvider>
 *
 *   // any consumer:
 *   const toast = useToast()
 *   toast.show('Đã lưu lesson', { tone: 'success' })
 *   toast.show('Lỗi mạng',     { tone: 'danger', durationMs: 6000 })
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

type ToastTone = 'info' | 'success' | 'warning' | 'danger'

type ToastEntry = {
  id: string
  message: ReactNode
  tone: ToastTone
  durationMs: number
}

type ToastApi = {
  show: (
    message: ReactNode,
    options?: { tone?: ToastTone; durationMs?: number; id?: string },
  ) => string
  dismiss: (id: string) => void
}

const Ctx = createContext<ToastApi | null>(null)

const DEFAULT_DURATION: Record<ToastTone, number> = {
  info: 3200,
  success: 4200,
  warning: 4200,
  danger: 5000,
}

export function useToast(): ToastApi {
  const c = useContext(Ctx)
  if (!c) throw new Error('useToast must be called inside <ToastProvider>')
  return c
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timers = timersRef.current
    return () => {
      timers.forEach(clearTimeout)
      timers.clear()
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const show = useCallback<ToastApi['show']>(
    (message, options) => {
      const tone = options?.tone ?? 'info'
      const durationMs = options?.durationMs ?? DEFAULT_DURATION[tone]
      const id = options?.id ?? `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => {
        const without = prev.filter((t) => t.id !== id)
        return [...without, { id, message, tone, durationMs }]
      })
      const existing = timersRef.current.get(id)
      if (existing) clearTimeout(existing)
      const handle = setTimeout(() => dismiss(id), durationMs)
      timersRef.current.set(id, handle)
      return id
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(() => ({ show, dismiss }), [show, dismiss])

  return (
    <Ctx.Provider value={api}>
      {children}
      {mounted && typeof document !== 'undefined'
        ? createPortal(<ToastViewport toasts={toasts} dismiss={dismiss} />, document.body)
        : null}
    </Ctx.Provider>
  )
}

const TONE_CLASSES: Record<ToastTone, string> = {
  info: 'border-ds-info-strong bg-ds-info-soft text-ds-info',
  success: 'border-ds-success-strong bg-ds-success-soft text-ds-success',
  warning: 'border-ds-warning-strong bg-ds-warning-soft text-ds-warning',
  danger: 'border-ds-danger-strong bg-ds-danger-soft text-ds-danger',
}

function ToastViewport({
  toasts,
  dismiss,
}: {
  toasts: ToastEntry[]
  dismiss: (id: string) => void
}) {
  return (
    <div
      role="region"
      aria-label="Thông báo"
      className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2 max-w-sm pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'pointer-events-auto rounded-ds-control border px-3 py-2 text-sm',
            'shadow-lg shadow-black/40 backdrop-blur',
            'animate-slide-up-fade',
            TONE_CLASSES[t.tone],
          )}
          onClick={() => dismiss(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
