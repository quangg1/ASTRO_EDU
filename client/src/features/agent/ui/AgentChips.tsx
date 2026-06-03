'use client'

import clsx from 'clsx'

export type AgentChip = {
  label: string
  action: string
  lessonId?: string
  moduleId?: string
  nodeId?: string
  href?: string
}

type Props = {
  chips: AgentChip[]
  onChip: (chip: AgentChip) => void
  className?: string
  variant?: 'default' | 'prominent'
}

/** Fallback / gợi ý nhanh khi AI down hoặc session mới (Phase 0.7). */
export function AgentChips({ chips, onChip, className, variant = 'default' }: Props) {
  if (!chips.length) return null
  const prominent = variant === 'prominent'
  return (
    <div className={clsx('flex flex-wrap gap-2', prominent && 'justify-center', className)}>
      {chips.map((c) => (
        <button
          key={`${c.action}-${c.label}`}
          type="button"
          className={clsx(
            'rounded-full border text-xs transition-all duration-200',
            prominent
              ? 'border-cyan-400/40 bg-cyan-500/10 px-4 py-2.5 text-sm text-ds-text hover:border-cyan-300/60 hover:bg-ds-accent/15 hover:shadow-[0_0_14px_rgba(6,182,212,0.35)] active:scale-[0.98]'
              : 'border-ds-border bg-white/5 px-3 py-1.5 text-gray-300 hover:border-cyan-400/30 hover:opacity-90/10 hover:text-ds-text hover:shadow-[0_0_10px_rgba(6,182,212,0.2)]',
          )}
          onClick={() => onChip(c)}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}
