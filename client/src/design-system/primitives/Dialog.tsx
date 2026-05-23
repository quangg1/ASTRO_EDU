'use client'

/**
 * Dialog — modal primitive.
 *
 * Headless behavior, token-driven chrome. Pragmatic scope (no Radix dep yet):
 *   • ESC closes
 *   • backdrop click closes (opt out via `dismissOnBackdrop={false}`)
 *   • body scroll locked while open
 *   • return focus to the previously-focused element on close
 *   • SSR-safe (renders nothing until mounted)
 *
 * Not yet covered (add via Radix when a real consumer needs it):
 *   • full focus trap inside the dialog (Tab cycle)
 *   • inert siblings for screen readers
 *
 * Usage:
 *   <Dialog open={open} onClose={() => setOpen(false)} title="Confirm delete">
 *     <p className="text-sm text-ds-muted">…</p>
 *     <DialogFooter>
 *       <Button onClick={() => setOpen(false)}>Cancel</Button>
 *       <Button variant="danger" onClick={onConfirm}>Delete</Button>
 *     </DialogFooter>
 *   </Dialog>
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

export type DialogProps = {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  /** Close when the backdrop is clicked. Default `true`. */
  dismissOnBackdrop?: boolean
  /** Close on ESC. Default `true`. */
  dismissOnEscape?: boolean
  /** Width preset (Tailwind max-w). Default `md`. */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZES: Record<NonNullable<DialogProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  dismissOnBackdrop = true,
  dismissOnEscape = true,
  size = 'md',
  className,
}: DialogProps) {
  const titleId = useId()
  const descId = useId()
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (dismissOnEscape && e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey, true)

    // Focus the panel on next tick so the title/contents are announced.
    requestAnimationFrame(() => panelRef.current?.focus())

    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [open, dismissOnEscape, onClose])

  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismissOnBackdrop ? onClose : undefined}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative w-full rounded-ds-card border border-ds-border-strong bg-ds-elevated',
          'shadow-2xl shadow-black/60 outline-none',
          'animate-slide-up-fade',
          SIZES[size],
          className,
        )}
      >
        {(title || description) && (
          <header className="px-ds-content pt-ds-content pb-3 space-y-1">
            {title ? (
              <h2 id={titleId} className="text-lg font-semibold text-ds-text">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p id={descId} className="text-sm text-ds-muted">
                {description}
              </p>
            ) : null}
          </header>
        )}
        <div className="px-ds-content pb-ds-content">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

/** Action row — right-aligned by default; flips to space-between with `justify="between"`. */
export function DialogFooter({
  className,
  justify = 'end',
  ...props
}: HTMLAttributes<HTMLDivElement> & { justify?: 'end' | 'between' }) {
  return (
    <div
      className={cn(
        'mt-4 flex items-center gap-2',
        justify === 'between' ? 'justify-between' : 'justify-end',
        className,
      )}
      {...props}
    />
  )
}

/** Imperative close-button for the corner — optional, callers may omit. */
export function DialogCloseButton({ onClose, className }: { onClose: () => void; className?: string }) {
  const onClick = useCallback(() => onClose(), [onClose])
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Đóng"
      className={cn(
        'absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-md',
        'text-ds-muted hover:text-ds-text hover:bg-ds-surface transition-colors',
        className,
      )}
    >
      ×
    </button>
  )
}
