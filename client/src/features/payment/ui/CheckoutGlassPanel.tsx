import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Panel kính mờ — checkout, order summary (Cosmo theme). */
export function CheckoutGlassPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'cosmo-glass rounded-[var(--radius-card)] border border-ds-border/70',
        'shadow-[0_20px_50px_rgba(0,0,0,0.38)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
