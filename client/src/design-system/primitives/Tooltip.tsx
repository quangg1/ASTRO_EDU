'use client'

/**
 * Tooltip — pure-CSS hover/focus hint.
 *
 * No portal, no positioning lib (Floating UI). Trade-off: cheap to render and
 * good for >90% of the cases where the trigger has room above/below. If a real
 * consumer needs collision-aware placement (e.g. button at viewport edge),
 * upgrade to @floating-ui/react then.
 *
 * Replaces sprinkles of native `title="…"` (which has a 1s browser delay,
 * can't be styled, and is invisible to many touch devices). Show on hover and
 * focus-within so keyboard users get parity.
 *
 *   <Tooltip label="Reset to defaults">
 *     <Button variant="ghost"><RefreshIcon /></Button>
 *   </Tooltip>
 */

import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Side = 'top' | 'bottom' | 'left' | 'right'

const SIDE_CLASSES: Record<Side, string> = {
  top: 'bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2',
  bottom: 'top-[calc(100%+6px)] left-1/2 -translate-x-1/2',
  left: 'right-[calc(100%+6px)] top-1/2 -translate-y-1/2',
  right: 'left-[calc(100%+6px)] top-1/2 -translate-y-1/2',
}

export type TooltipProps = {
  label: ReactNode
  /** Trigger element. Must accept `aria-describedby`. */
  children: ReactNode
  side?: Side
  /** Hide for users who would prefer no tooltip (e.g. inline only). */
  disabled?: boolean
  className?: string
}

export function Tooltip({
  label,
  children,
  side = 'top',
  disabled,
  className,
}: TooltipProps) {
  const id = useId()
  if (disabled || label == null || label === '') return <>{children}</>
  return (
    <span className="group/tt relative inline-flex">
      {/* Trigger keeps its own ref / events; we only describe it. */}
      <span aria-describedby={id} className="contents">
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        className={cn(
          'pointer-events-none absolute z-[70] whitespace-nowrap rounded-md',
          'bg-ds-elevated border border-ds-border-strong text-ds-text',
          'px-2 py-1 text-[11px] leading-tight shadow-lg shadow-black/40',
          'opacity-0 scale-95 transition-all duration-ds-fast ease-ds',
          'group-hover/tt:opacity-100 group-hover/tt:scale-100',
          'group-focus-within/tt:opacity-100 group-focus-within/tt:scale-100',
          SIDE_CLASSES[side],
          className,
        )}
      >
        {label}
      </span>
    </span>
  )
}
