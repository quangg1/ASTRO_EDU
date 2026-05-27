'use client'

import { X } from 'lucide-react'
import type { CoachNudge } from '../hooks/useAgentCoach'

type Props = {
  nudge: CoachNudge
  onDismiss: () => void
  onOpenAgent: () => void
  onChip?: (action: string, lessonId?: string) => void
}

export function AgentCoachBanner({ nudge, onDismiss, onOpenAgent, onChip }: Props) {
  if (!nudge.allowed || !nudge.message) return null

  return (
    <div
      role="status"
      className="mb-4 flex flex-col gap-2 rounded-ds-card border border-cyan-400/30 bg-cyan-950/40 px-4 py-3 text-sm text-cyan-100"
    >
      <div className="flex items-start justify-between gap-3">
        <p>{nudge.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-cyan-300/80 hover:text-white"
          aria-label="Đóng gợi ý"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {nudge.chips?.length ? (
        <div className="flex flex-wrap gap-2">
          {nudge.chips.map((c) => (
            <button
              key={`${c.action}-${c.label}`}
              type="button"
              className="rounded-full border border-cyan-400/35 bg-cyan-500/15 px-3 py-1 text-xs text-cyan-100 hover:bg-cyan-500/25"
              onClick={() => {
                if (c.action === 'open_agent') onOpenAgent()
                else if (c.action === 'dismiss') onDismiss()
                else onChip?.(c.action, c.lessonId)
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpenAgent}
          className="self-start rounded-full border border-cyan-400/40 px-3 py-1 text-xs font-medium text-white hover:bg-cyan-500/20"
        >
          Hỏi trợ lý
        </button>
      )}
    </div>
  )
}
