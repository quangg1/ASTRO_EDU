'use client'

import Link from 'next/link'
import type { Post } from '@/features/community/public'
import { postLearningBackHref } from '@/features/community/lib/composeContext'
import { useT } from '@/i18n/public'

type Props = {
  post: Pick<
    Post,
    | 'pathSource'
    | 'contextTitle'
    | 'courseSlug'
    | 'lessonSlug'
    | 'learningModuleId'
    | 'learningNodeId'
    | 'learningLessonId'
  >
  className?: string
}

export function PostLearningContextChip({ post, className = '' }: Props) {
  const { t } = useT()
  const href = postLearningBackHref(post)
  const label =
    post.contextTitle?.trim() ||
    (post.pathSource === 'learning-path'
      ? t('community.chipLearningPath')
      : post.courseSlug
        ? t('community.chipCourseSlug', { slug: post.courseSlug })
        : null)

  if (!label && !href) return null

  const inner = (
    <>
      <span className="text-[10px] uppercase tracking-wide text-ds-accent/80 shrink-0">
        {post.pathSource === 'learning-path' ? t('community.chipPathShort') : t('community.chipCourseShort')}
      </span>
      <span className="text-violet-100 truncate">{label}</span>
    </>
  )

  const base =
    'inline-flex items-center gap-2 max-w-full rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs'

  if (href) {
    return (
      <Link href={href} className={`${base} hover:bg-violet-500/20 transition-colors ${className}`}>
        {inner}
      </Link>
    )
  }

  return <span className={`${base} ${className}`}>{inner}</span>
}
