'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Compass, PlayCircle } from 'lucide-react'
import { useLearningPath } from '@/features/learning-path/public'
import {
  loadLessonCompletion,
  resolvePostLessonNextAction,
} from '@/features/learning-path/public'
import { saveEduJourneyContext } from '@/lib/eduJourney'
import { useAuthStore } from '@/features/auth/public'

type Props = {
  lessonId: string
  lessonTitle: string
}

/** Hiện sau khi đánh dấu hoàn thành / master — một primary + một secondary Explore. */
export function LessonNextStepPanel({ lessonId, lessonTitle }: Props) {
  const { user } = useAuthStore()
  const { modules } = useLearningPath()

  const action = useMemo(() => {
    const map = loadLessonCompletion(user?.id)
    return resolvePostLessonNextAction(modules, map, lessonId)
  }, [modules, lessonId, user?.id])

  const onExplore = () => {
    if (!action.secondary) return
    saveEduJourneyContext({
      lessonHref: action.href,
      lessonTitle: action.lessonTitle || lessonTitle,
      exploreHref: action.secondary.href,
      view: 'showcase',
    })
  }

  return (
    <section className="mb-8 rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-cyan-500/10 p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">
        Bước tiếp theo
      </p>
      <h3 className="mt-1 text-base font-semibold text-white">{action.title}</h3>
      <p className="mt-1 text-sm text-ds-subtle">{action.reason}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium text-slate-900 transition hover:bg-white/90"
        >
          <PlayCircle className="h-4 w-4" />
          {action.ctaLabel}
          {action.lessonTitle ? `: ${action.lessonTitle}` : ''}
        </Link>
        {action.secondary ? (
          <Link
            href={action.secondary.href}
            onClick={onExplore}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/20"
          >
            <Compass className="h-4 w-4" />
            {action.secondary.ctaLabel || action.secondary.title}
          </Link>
        ) : null}
      </div>
    </section>
  )
}
