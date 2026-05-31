'use client'

import Link from 'next/link'
import { FossilDetailDock } from '@/features/content3d/earth/ui/FossilDetailOverlay'
import {
  NarrativeBeatDetailLeft,
  NarrativeBeatDetailRight,
  NarrativeBottomDock,
} from '@/features/content3d/narrative/public'
import { NarrativeEarthFossilPanel } from '@/features/content3d/narrative/ui/NarrativeEarthFossilPanel'
import type { ExploreLessonLink } from '../hooks/types'
import { useDeepHistoryGemRewards } from '../hooks/useDeepHistoryGemRewards'

type Props = {
  planetHistoryLabel: string
  planetHistoryLessonLinks: ExploreLessonLink[]
  planetHistoryEntityId: string | null
  onClose: () => void
}

const EARTH_ENTITY_ID = 'planet-earth'

/**
 * Deep History — kiến trúc dock:
 * panel trái/phải = chi tiết giai đoạn đang chọn · giữa = quả cầu 3D · dưới = timeline + điều khiển.
 */
export function ExplorePlanetHistoryOverlay({
  planetHistoryLabel,
  planetHistoryLessonLinks,
  planetHistoryEntityId,
  onClose,
}: Props) {
  const isEarth = planetHistoryEntityId === EARTH_ENTITY_ID
  useDeepHistoryGemRewards(Boolean(planetHistoryEntityId))

  return (
    <div className={isEarth ? 'explore-deep-history-shell explore-deep-history-shell--earth' : 'explore-deep-history-shell'}>
      <header className="explore-deep-history-header flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[11px] backdrop-blur-md">
        <span className="shrink-0 tracking-[0.14em] uppercase text-slate-200">
          Lịch sử sâu · {planetHistoryLabel}
        </span>
        {planetHistoryLessonLinks.length > 0 ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <span className="shrink-0 text-[10px] text-slate-500">Bài LP:</span>
            {planetHistoryLessonLinks.slice(0, 4).map((row) => (
              <Link
                key={row.lessonId}
                href={row.href}
                className="max-w-[10rem] truncate rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-white/10"
              >
                {row.title}
              </Link>
            ))}
            {planetHistoryLessonLinks.length > 4 ? (
              <span className="text-[10px] text-slate-500">+{planetHistoryLessonLinks.length - 4}</span>
            ) : null}
          </div>
        ) : (
          <span className="min-w-0 flex-1 text-[10px] text-slate-500">
            Panel hai bên theo giai đoạn · timeline và điều khiển ở dưới cùng.
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded border border-white/20 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-200 hover:bg-white/10"
        >
          Quay lại Showcase
        </button>
      </header>

      <div className="explore-deep-history-detail-left">
        <NarrativeBeatDetailLeft entityLabel={planetHistoryLabel} />
      </div>

      <div className="explore-deep-history-stage" aria-hidden />

      <div className="explore-deep-history-detail-right">
        {isEarth ? (
          <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2">
            <div className="flex min-h-0 min-w-0 flex-[1.05] basis-0 flex-col overflow-hidden">
              <NarrativeBeatDetailRight entityLabel={planetHistoryLabel} />
            </div>
            <FossilDetailDock />
            <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden">
              <NarrativeEarthFossilPanel />
            </div>
          </div>
        ) : (
          <NarrativeBeatDetailRight entityLabel={planetHistoryLabel} />
        )}
      </div>

      <div className="explore-deep-history-dock">
        <NarrativeBottomDock />
      </div>
    </div>
  )
}
