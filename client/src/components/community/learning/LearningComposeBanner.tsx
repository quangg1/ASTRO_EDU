'use client'

import Link from 'next/link'
import type { ComposeLearningContext } from '@/features/community/lib/composeContext'
import { buildContextTitle, learningContextBackHref } from '@/features/community/lib/composeContext'

type Props = {
  context: ComposeLearningContext
}

export function LearningComposeBanner({ context }: Props) {
  const backHref = learningContextBackHref(context)
  const title = buildContextTitle(context)
  const isLesson = Boolean(context.lessonTitle || context.learningLessonId)

  return (
    <div className="mb-4 rounded-xl border border-violet-500/35 bg-gradient-to-r from-violet-500/15 to-cyan-500/10 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-violet-200/90">
        {isLesson ? 'Hỏi trong bài học' : 'Hỏi về khóa học'}
      </p>
      <p className="mt-1 text-sm text-white font-medium leading-snug">{title}</p>
      <p className="mt-1 text-xs text-slate-400">
        Câu hỏi sẽ được gắn với {context.pathSource === 'learning-path' ? 'bài trên lộ trình' : 'khóa học'} để cộng đồng và giáo viên dễ theo dõi.
      </p>
      {backHref && (
        <Link href={backHref} className="mt-2 inline-block text-xs text-cyan-300 hover:text-cyan-200 underline">
          ← Quay lại bài học
        </Link>
      )}
    </div>
  )
}
