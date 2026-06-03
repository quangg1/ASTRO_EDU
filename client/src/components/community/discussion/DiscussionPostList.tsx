'use client'

import Link from 'next/link'
import { MessageSquare, Pin } from 'lucide-react'
import type { Post } from '@/features/community/api/communityApi'
import { plainTextExcerpt } from '@/features/community/lib/postContent'
import { PostLearningContextChip } from '@/components/community/learning/PostLearningContextChip'
import { UserProfileLink } from '@/components/profile/UserProfileLink'
import { PostVoteRail } from '@/components/community/discussion/PostVoteRail'

function formatDate(date?: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('vi-VN')
}

type Props = {
  posts: Post[]
  user?: { id: string } | null
  onVoteChange?: (postId: string, voteCount: number, myVote: number | null) => void
  onLoginRequired?: () => void
}

export function DiscussionPostList({ posts, user = null, onVoteChange, onLoginRequired }: Props) {
  if (!posts.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-8 text-center text-ds-muted">
        Chưa có bài viết phù hợp.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((p) => {
        const excerpt = plainTextExcerpt(p.content, 160)
        return (
          <article
            key={p._id}
            className="flex overflow-hidden rounded-xl border border-ds-border bg-ds-surface/50 transition-colors hover:border-cyan-300/25"
          >
            <PostVoteRail
              postId={p._id}
              voteCount={p.voteCount}
              myVote={p.myVote ?? null}
              user={user}
              onVote={onVoteChange}
              onLoginRequired={onLoginRequired}
            />

            <div className="min-w-0 flex-1">
              {(p.contextTitle || p.courseSlug || p.learningLessonId) && (
                <div className="px-4 pt-3">
                  <PostLearningContextChip post={p} />
                </div>
              )}

              <Link
                href={`/community/post/${p._id}`}
                className="block px-4 pb-2 pt-3 transition-colors hover:bg-ds-surface/40"
              >
                <div className="mb-1 flex flex-wrap items-start gap-2">
                  {p.isPinned && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300/35 bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-200">
                      <Pin className="h-3 w-3" aria-hidden />
                      Ghim
                    </span>
                  )}
                </div>

                <h3 className="font-medium leading-snug text-white">{p.title}</h3>

                {excerpt ? (
                  <p className="mt-1.5 line-clamp-2 text-sm text-ds-muted">{excerpt}</p>
                ) : null}

                {p.tags && p.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.tags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-violet-400/25 bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-3 pt-1 text-xs text-ds-subtle">
                <UserProfileLink
                  userId={p.authorId}
                  displayName={p.authorName}
                  avatarUrl={p.authorAvatar}
                  overlayUrl={p.authorOverlayUrl}
                  learnerTier={p.authorLearnerTier}
                  size="sm"
                  showName
                  nameClassName="text-ds-muted hover:text-slate-200"
                />
                <span className="text-gray-600" aria-hidden>
                  ·
                </span>
                <span>{formatDate(p.createdAt)}</span>
                <span className="text-gray-600" aria-hidden>
                  ·
                </span>
                <span className="inline-flex items-center gap-1 text-ds-muted">
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                  {p.commentCount} bình luận
                </span>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
