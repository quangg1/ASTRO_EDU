'use client'

import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'
import type { ConceptChipView } from '../lib/conceptMasteryUi'
import { masteryStatusLabel, masteryStatusTone } from '../lib/conceptMasteryUi'

type Props = {
  chips: ConceptChipView[]
  loading?: boolean
  quizLoadingId?: string | null
  loggedIn: boolean
  onChipClick: (chip: ConceptChipView) => void
}

const TONE_CLASS = {
  strong: 'border-emerald-400/35 bg-emerald-500/12 text-emerald-100',
  mid: 'border-sky-400/30 bg-sky-500/10 text-sky-100',
  warn: 'border-amber-400/35 bg-amber-500/12 text-amber-100',
  muted: 'border-white/[0.1] bg-white/[0.04] text-white/55',
} as const

export function ExploreConceptChips({ chips, loading, quizLoadingId, loggedIn, onChipClick }: Props) {
  if (!chips.length) return null

  return (
    <div data-explore-tour="explore-concept-chips" className="pt-0.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/40">Khái niệm</p>
        {loading ? (
          <span className="inline-flex items-center gap-1 text-[9px] text-white/35">
            <Loader2 className="h-3 w-3 animate-spin" />
            Đang tải
          </span>
        ) : loggedIn ? (
          <span className="text-[9px] text-white/35">Bấm để quiz / bài / Cosmo</span>
        ) : (
          <span className="text-[9px] text-white/35">Bấm để mở bài</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => {
          const tone = masteryStatusTone(chip.mastery, chip.needsReview)
          const label = masteryStatusLabel(chip.mastery, chip.needsReview)
          const busy = quizLoadingId === chip.id

          return (
            <button
              key={chip.id}
              type="button"
              disabled={busy}
              onClick={() => onChipClick(chip)}
              className={clsx(
                'group max-w-full rounded-lg border px-2 py-1.5 text-left transition hover:brightness-110 active:scale-[0.98]',
                TONE_CLASS[tone],
                busy && 'opacity-70',
              )}
            >
              <span className="flex items-center gap-1.5">
                {busy ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" /> : null}
                <span className="truncate text-[10px] font-semibold leading-tight">{chip.title}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[9px] opacity-85">
                <span>{label}</span>
                {chip.mastery != null ? (
                  <span className="tabular-nums">{Math.round(chip.mastery)}%</span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
