import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral'

const TONES: Record<BadgeTone, string> = {
  accent: 'border-ds-accent-strong bg-ds-accent-soft text-ds-accent',
  success: 'border-ds-success-strong bg-ds-success-soft text-ds-success',
  warning: 'border-ds-warning-strong bg-ds-warning-soft text-ds-warning',
  danger: 'border-ds-danger-strong bg-ds-danger-soft text-ds-danger',
  neutral: 'border-ds-border bg-ds-surface text-ds-muted',
}

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, tone = 'accent', ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-ds-chip border px-2 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
})
