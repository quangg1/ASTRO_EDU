'use client'

import clsx from 'clsx'
import { AgentChips, type AgentChip } from '@/features/agent/ui/AgentChips'

const MAX_SUGGESTIONS = 5

type Props = {
  lessonChips: AgentChip[]
  communityChips: AgentChip[]
  fallbackChips: AgentChip[]
  onChip: (chip: AgentChip) => void
  className?: string
}

/** Gộp gợi ý bài học / cộng đồng / fallback thành một hàng cuộn ngang — không chiếm chiều cao chat. */
export function AgentSuggestionsRail({
  lessonChips,
  communityChips,
  fallbackChips,
  onChip,
  className,
}: Props) {
  const hasPrimary = lessonChips.length > 0 || communityChips.length > 0
  const merged: AgentChip[] = []

  for (const c of lessonChips.slice(0, 3)) merged.push(c)
  for (const c of communityChips.slice(0, 3)) {
    if (merged.length >= MAX_SUGGESTIONS) break
    merged.push(c)
  }
  if (!hasPrimary) {
    for (const c of fallbackChips.slice(0, MAX_SUGGESTIONS)) {
      if (merged.length >= MAX_SUGGESTIONS) break
      merged.push(c)
    }
  }

  if (!merged.length) return null

  return (
    <div
      className={clsx(
        'shrink-0 border-t border-cyan-400/10 bg-[#060a14]/90 px-3 py-2 backdrop-blur-sm sm:px-4',
        className,
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ds-subtle">
          Gợi ý liên quan
        </span>
        {merged.length > 2 ? (
          <span className="text-[10px] text-ds-subtle/80">Vuốt ngang →</span>
        ) : null}
      </div>
      <AgentChips variant="rail" chips={merged} onChip={onChip} />
    </div>
  )
}
