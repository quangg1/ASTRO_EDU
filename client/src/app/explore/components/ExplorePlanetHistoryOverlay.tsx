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

export function ExplorePlanetHistoryOverlay({
  planetHistoryLabel,
  planetHistoryLessonLinks,
  onClose,
}: Props) {
  return (
    <>
      <div className="fixed top-14 left-0 right-0 z-[22] border-b border-violet-400/25 bg-black/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-2 text-[11px]">
          <span className="tracking-[0.14em] uppercase text-violet-100/95 shrink-0">
            Deep History · {planetHistoryLabel}
          </span>
          {planetHistoryLessonLinks.length > 0 ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-violet-200/80 shrink-0">Bài LP:</span>
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
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-violet-300/45 px-2 py-1 text-[10px] uppercase tracking-wider text-violet-50 hover:bg-violet-600/25 shrink-0"
          >
            Quay lại Showcase
          </button>
        </div>
      </div>
      <NarrativeTimeline entityLabel={planetHistoryLabel} />
      <div className="pointer-events-auto fixed right-3 top-24 bottom-28 z-30 flex w-[min(22rem,calc(100vw-1.25rem))] min-h-0 flex-col gap-2">
        <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden">
          <NarrativeInfoPanel layout="dock" entityLabel={planetHistoryLabel} />
        </div>
      </div>
      <NarrativeControls />
    </>
  )
}
