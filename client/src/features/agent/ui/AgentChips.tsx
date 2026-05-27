'use client'

import clsx from 'clsx'

export type AgentChip = {
  label: string
  action: string
  lessonId?: string
  moduleId?: string
  nodeId?: string
}

type Props = {
  chips: AgentChip[]
  onChip: (chip: AgentChip) => void
  className?: string
}

/** Fallback / gợi ý nhanh khi AI down hoặc session mới (Phase 0.7). */
export function AgentChips({ chips, onChip, className }: Props) {
  if (!chips.length) return null
  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      {chips.map((c) => (
        <button
          key={`${c.action}-${c.label}`}
          type="button"
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-gray-300 hover:bg-white/10"
          onClick={() => onChip(c)}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}
