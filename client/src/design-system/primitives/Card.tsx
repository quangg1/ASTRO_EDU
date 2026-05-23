import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type CardElevation = 'flat' | 'raised' | 'overlay'

const ELEVATIONS: Record<CardElevation, string> = {
  flat: 'bg-ds-surface border-ds-border',
  raised: 'bg-ds-elevated border-ds-border-strong shadow-lg shadow-black/40',
  overlay:
    'bg-ds-overlay border-ds-border backdrop-blur-md shadow-xl shadow-black/50',
}

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevation?: CardElevation
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, elevation = 'flat', ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn('rounded-ds-card border', ELEVATIONS[elevation], className)}
      {...props}
    />
  )
})
