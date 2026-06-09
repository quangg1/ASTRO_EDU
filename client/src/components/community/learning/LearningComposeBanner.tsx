'use client'

import Link from 'next/link'
import type { ComposeLearningContext } from '@/features/community/lib/composeContext'
import { buildContextTitle, learningContextBackHref } from '@/features/community/lib/composeContext'
import { useT } from '@/i18n/public'

type Props = {
  context: ComposeLearningContext
}

export function LearningComposeBanner({ context }: Props) {
  const { t } = useT()
  const backHref = learningContextBackHref(context)
  const title = buildContextTitle(context)
  const isLesson = Boolean(context.lessonTitle || context.learningLessonId)
  const attachTarget =
    context.pathSource === 'learning-path' ? t('community.composeAttachPath') : t('community.composeAttachCourse')

  return (
    <div className="mb-4 rounded-xl border border-violet-500/35 bg-gradient-to-r from-violet-500/15 to-cyan-500/10 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-violet-200/90">
        {isLesson ? t('community.askInLesson') : t('community.askAboutCourse')}
      </p>
      <p className="mt-1 text-sm text-white font-medium leading-snug">{title}</p>
      <p className="mt-1 text-xs text-ds-muted">{t('community.composeAttachHint', { target: attachTarget })}</p>
      {backHref && (
        <Link href={backHref} className="mt-2 inline-block text-xs text-ds-accent hover:text-cyan-200 underline">
          {t('community.backToLesson')}
        </Link>
      )}
    </div>
  )
}
