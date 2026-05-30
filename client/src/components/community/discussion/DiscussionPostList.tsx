'use client'

import Link from 'next/link'
import type { Post } from '@/features/community/api/communityApi'
import { PostLearningContextChip } from '@/components/community/learning/PostLearningContextChip'
import { UserProfileLink } from '@/components/profile/UserProfileLink'

function formatDate(date?: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('vi-VN')
}

type Props = {
  posts: Post[]
}

export function DiscussionPostList({ posts }: Props) {
  if (!posts.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-8 text-center text-gray-400">
        Chưa có bài viết phù hợp.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <article
          key={p._id}
          className="rounded-xl border border-white/10 bg-white/5 overflow-hidden hover:border-cyan-300/20 transition-colors"
        >
          {(p.contextTitle || p.courseSlug || p.learningLessonId) && (
            <div className="px-4 pt-3">
              <PostLearningContextChip post={p} />
            </div>
          )}
          <Link
            href={`/community/post/${p._id}`}
            className="block p-4 pb-2 hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-medium text-white leading-snug">{p.title}</h3>
              {p.isPinned && (
                <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-300 border border-amber-300/30">
                  Ghim
                </span>
              )}
            </div>
            {p.content && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{p.content.replace(/<[^>]+>/g, ' ')}</p>}
            {p.tags && p.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {p.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-200 border border-violet-400/25"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-4 pt-1 text-xs text-gray-500">
            <UserProfileLink
              userId={p.authorId}
              displayName={p.authorName}
              avatarUrl={p.authorAvatar}
              overlayUrl={p.authorOverlayUrl}
              learnerTier={p.authorLearnerTier}
              size="sm"
              showName
              nameClassName="text-gray-400 hover:text-slate-200"
            />
            <span>{p.commentCount} bình luận</span>
            <span>{p.voteCount} vote</span>
            <span>{formatDate(p.createdAt)}</span>
          </div>
        </article>
      ))}
    </div>
  )
}
