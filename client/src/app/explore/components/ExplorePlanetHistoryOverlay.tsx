'use client'

import Link from 'next/link'
import {
  NarrativeControls,
  NarrativeInfoPanel,
  NarrativeTimeline,
} from '@/features/content3d/narrative/public'
import type { ExploreLessonLink } from '../hooks/types'

type Props = {
  planetHistoryLabel: string
  planetHistoryLessonLinks: ExploreLessonLink[]
  onClose: () => void
}

/** Deep History — grid 3 cột: timeline trái | scene 3D (trống) | info phải. Không panel nào đè giữa. */
export function ExplorePlanetHistoryOverlay({
  planetHistoryLabel,
  planetHistoryLessonLinks,
  onClose,
}: Props) {
  return (
    <div className="explore-deep-history-shell">
      <header className="explore-deep-history-header flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-400/20 bg-black/40 px-3 py-2 text-[11px] backdrop-blur-sm">
        <span className="shrink-0 tracking-[0.14em] uppercase text-violet-100/95">
          Deep History · {planetHistoryLabel}
        </span>
        {planetHistoryLessonLinks.length > 0 ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <span className="shrink-0 text-[10px] text-violet-200/80">Bài LP:</span>
            {planetHistoryLessonLinks.slice(0, 4).map((row) => (
              <Link
                key={row.lessonId}
                href={row.href}
                className="max-w-[10rem] truncate rounded border border-violet-400/35 bg-violet-950/50 px-2 py-0.5 text-[10px] text-violet-50 hover:bg-violet-600/30"
              >
                {row.title}
              </Link>
            ))}
            {planetHistoryLessonLinks.length > 4 ? (
              <span className="text-[10px] text-violet-300/70">+{planetHistoryLessonLinks.length - 4}</span>
            ) : null}
          </div>
        ) : (
          <span className="min-w-0 flex-1 text-[10px] text-violet-200/55">
            Xoay / zoom quả cầu ở giữa — panel chỉ ở hai bên.
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded border border-violet-300/45 px-2 py-1 text-[10px] uppercase tracking-wider text-violet-50 hover:bg-violet-600/25"
        >
          Quay lại Showcase
        </button>
      </header>

      <div className="explore-deep-history-timeline">
        <NarrativeTimeline entityLabel={planetHistoryLabel} placement="rail" />
      </div>

      <div className="explore-deep-history-stage" aria-hidden />

      <div className="explore-deep-history-info">
        <NarrativeInfoPanel layout="dock" entityLabel={planetHistoryLabel} />
      </div>

      <div className="explore-deep-history-controls">
        <NarrativeControls placement="rail" />
      </div>
    </div>
  )
}
