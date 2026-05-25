'use client'

import Link from 'next/link'
import {
  composeContextToParams,
  type ComposeLearningContext,
} from '@/features/community/lib/composeContext'
import { composeForumUrl, DEFAULT_COURSE_QUESTION_FORUM } from '@/features/community/lib/forumKinds'

type Props = {
  context: ComposeLearningContext
  forumSlug?: string
  className?: string
  children?: React.ReactNode
  variant?: 'primary' | 'outline' | 'compact'
}

const variantClass: Record<NonNullable<Props['variant']>, string> = {
  primary:
    'inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors',
  outline:
    'inline-flex items-center justify-center rounded-xl border border-violet-500/35 bg-violet-500/10 px-4 py-2 text-sm text-violet-200 hover:bg-violet-500/20 transition-colors w-full text-center',
  compact:
    'inline-flex items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-500/20 transition-colors',
}

export function CommunityAskButton({
  context,
  forumSlug = DEFAULT_COURSE_QUESTION_FORUM,
  className = '',
  children,
  variant = 'outline',
}: Props) {
  const href = composeForumUrl(forumSlug, composeContextToParams(context))
  const label = children ?? (context.lessonTitle || context.learningLessonId ? 'Hỏi về bài này' : 'Hỏi cộng đồng')

  return (
    <Link href={href} className={`${variantClass[variant]} ${className}`}>
      {label}
    </Link>
  )
}
