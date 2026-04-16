import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-100',
        className
      )}
      {...props}
    />
  )
}
