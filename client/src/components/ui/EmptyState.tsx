import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center', className)}>
      <p className="text-sm font-medium text-white">{title}</p>
      {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
