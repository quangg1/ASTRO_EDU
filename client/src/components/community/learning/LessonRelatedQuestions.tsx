'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchForumPosts, type Post } from '@/features/community/api/communityApi'
import {
  composeContextToParams,
  type ComposeLearningContext,
} from '@/features/community/lib/composeContext'
import { DEFAULT_COURSE_QUESTION_FORUM, composeForumUrl } from '@/features/community/lib/forumKinds'
import { plainTextExcerpt } from '@/features/community/lib/postContent'
import { CommunityAskButton } from '@/components/community/learning/CommunityAskButton'

const PREVIEW_LIMIT = 5

type Props = {
  context: ComposeLearningContext
  className?: string
}

function formatRelativeDate(date?: string): string {
  if (!date) return ''
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return 'Hôm nay'
  if (days < 7) return `${days} ngày trước`
  return d.toLocaleDateString('vi-VN')
}

export function LessonRelatedQuestions({ context, className = '' }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const filterKey =
    context.pathSource === 'learning-path'
      ? `lp:${context.learningLessonId}`
      : `course:${context.courseSlug}:${context.lessonSlug ?? ''}`

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const opts: Parameters<typeof fetchForumPosts>[1] = {
      limit: PREVIEW_LIMIT,
      sort: 'newest',
      pathSource: context.pathSource,
    }
    if (context.pathSource === 'course' && context.courseSlug) {
      opts.courseSlug = context.courseSlug
      if (context.lessonSlug) opts.lessonSlug = context.lessonSlug
    }
    if (context.pathSource === 'learning-path' && context.learningLessonId) {
      opts.learningLessonId = context.learningLessonId
    }

    void fetchForumPosts(DEFAULT_COURSE_QUESTION_FORUM, opts).then((r) => {
      if (cancelled) return
      setPosts(r.data)
      setTotal(r.total)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [filterKey])

  const viewAllHref = composeForumUrl(DEFAULT_COURSE_QUESTION_FORUM, composeContextToParams(context))

  return (
    <section
      className={`rounded-2xl border border-violet-500/25 bg-gradient-to-b from-violet-500/10 to-[#060d18]/90 ${className}`}
      aria-labelledby="lesson-related-questions-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 id="lesson-related-questions-heading" className="text-base font-semibold text-white">
            Câu hỏi về bài này
          </h2>
          <p className="mt-1 text-xs text-ds-muted leading-relaxed">
            Cộng đồng trả lời trong{' '}
            <Link href={`/community/${DEFAULT_COURSE_QUESTION_FORUM}`} className="text-ds-accent hover:text-violet-200 underline">
              Hỏi đáp học tập
            </Link>
            {total > 0 ? ` · ${total} câu hỏi` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <CommunityAskButton context={context} variant="compact" />
          {total > 0 && (
            <Link
              href={viewAllHref}
              className="inline-flex items-center justify-center rounded-lg border border-ds-border bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 transition-colors"
            >
              Xem tất cả
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          <div className="h-14 rounded-xl border border-ds-border bg-white/5 animate-pulse" />
          <div className="h-14 rounded-xl border border-ds-border bg-white/5 animate-pulse" />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-sm text-ds-muted rounded-xl border border-dashed border-violet-500/30 bg-ds-surface/50 px-4 py-5 text-center">
          Chưa có câu hỏi nào cho bài này. Bấm <strong className="text-violet-200 font-medium">Hỏi về bài này</strong> để
          đặt câu hỏi đầu tiên.
        </p>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => (
            <li key={p._id}>
              <Link
                href={`/community/post/${p._id}`}
                className="block rounded-xl border border-ds-border bg-ds-surface/50 px-4 py-3 hover:border-violet-400/30 hover:bg-white/[0.07] transition-colors"
              >
                <p className="text-sm font-medium text-white leading-snug">{p.title}</p>
                {p.content ? (
                  <p className="mt-1 text-xs text-ds-muted line-clamp-2">{plainTextExcerpt(p.content, 140)}</p>
                ) : null}
                <p className="mt-2 text-[11px] text-ds-subtle">
                  {p.commentCount} bình luận · {p.voteCount} vote · {formatRelativeDate(p.createdAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && posts.length > 0 && total > posts.length && (
        <Link
          href={viewAllHref}
          className="mt-3 inline-block text-xs text-ds-accent hover:text-cyan-200 underline"
        >
          Xem thêm {total - posts.length} câu hỏi →
        </Link>
      )}
    </section>
  )
}
