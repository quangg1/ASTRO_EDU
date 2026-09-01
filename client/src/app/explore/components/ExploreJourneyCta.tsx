'use client'

import Link from 'next/link'
import { BookOpen, PlayCircle } from 'lucide-react'
import { useLearnerNextAction } from '@/features/learning-path/public'
import { saveEduJourneyContext } from '@/lib/eduJourney'

type Props = {
  entityLabel?: string
  /** Lesson linked to current entity — preferred over global next-action when present. */
  lessonHref?: string
  lessonTitle?: string
  exploreHref?: string
}

/**
 * Sticky single CTA for Explore — replaces full LearningStartGuide overlay.
 * Prefer entity→lesson link; otherwise “Tiếp tục lộ trình” from next-action.
 */
export function ExploreJourneyCta({
  entityLabel,
  lessonHref,
  lessonTitle,
  exploreHref,
}: Props) {
  const { nextAction } = useLearnerNextAction()

  const relatedHref = lessonHref || null
  const continueHref = nextAction.href
  const primaryHref = relatedHref || continueHref
  const primaryLabel = relatedHref
    ? 'Học bài liên quan'
    : nextAction.hasProgress
      ? 'Tiếp tục lộ trình'
      : 'Bắt đầu lộ trình'
  const subtitle = relatedHref
    ? lessonTitle || (entityLabel ? `Từ ${entityLabel} sang lộ trình học` : 'Bài học gắn với thiên thể đang xem')
    : nextAction.lessonTitle || nextAction.title

  const onClick = () => {
    saveEduJourneyContext({
      entityLabel,
      lessonHref: primaryHref,
      lessonTitle: lessonTitle || nextAction.lessonTitle,
      exploreHref: exploreHref || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/explore'),
      view: 'showcase',
    })
  }

  return (
    <div className="pointer-events-none fixed bottom-5 left-4 right-4 z-[23] sm:left-auto sm:right-5 sm:bottom-6 sm:w-[min(22rem,calc(100vw-2rem))]">
      <div className="pointer-events-auto rounded-2xl border border-cyan-400/25 bg-black/75 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
          {relatedHref ? '3D → Lộ trình' : 'Bước tiếp theo'}
        </p>
        <p className="mt-1 text-sm font-medium text-white line-clamp-2">{subtitle}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Link
            href={primaryHref}
            onClick={onClick}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-white/90"
          >
            {relatedHref ? <BookOpen className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
            {primaryLabel}
          </Link>
          {relatedHref && continueHref !== relatedHref ? (
            <Link
              href={continueHref}
              onClick={onClick}
              className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
            >
              Lộ trình
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
