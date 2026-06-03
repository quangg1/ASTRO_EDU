'use client'

import { useMemo, useState } from 'react'
import type { Comment } from '@/features/community/api/communityApi'
import { voteComment, markCommentHelpful } from '@/features/community/public'
import { syncCommunityGemReward } from '@/features/community/lib/communityGemReward'
import { canModerate } from '@/lib/roles'
import { useToast } from '@/design-system'
import { CommentBody } from '@/components/community/comments/CommentBody'
import { CommentComposer } from '@/components/community/comments/CommentComposer'
import { UserProfileLink } from '@/components/profile/UserProfileLink'
import { ReportContentButton } from '@/components/community/moderation/ReportContentButton'

type CommentNode = Comment & { replies: CommentNode[] }

function formatDate(date?: string): string {
  if (!date) return ''
  return new Date(date).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

function buildTree(comments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>()
  const roots: CommentNode[] = []

  for (const c of comments) {
    map.set(c._id, { ...c, replies: [] })
  }
  for (const c of comments) {
    const node = map.get(c._id)!
    const parentId = c.parentId ? String(c.parentId) : null
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.replies.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

function canMarkCommentHelpful(
  user: { id: string; role?: string } | null,
  postAuthorId: string,
  commentAuthorId: string,
): boolean {
  if (!user || user.id === commentAuthorId) return false
  if (canModerate(user as Parameters<typeof canModerate>[0]) || user.role === 'teacher') return true
  return user.id === postAuthorId
}

type Props = {
  comments: Comment[]
  user: { id: string; role?: string } | null
  postAuthorId: string
  isNewsForum?: boolean
  onAddComment: (content: string, parentId?: string) => Promise<boolean>
  onVoteComment?: (commentId: string, voteCount: number, myVote: number | null | undefined) => void
  onMarkHelpful?: (commentId: string, updated: Comment) => void
}

function CommentVoteButtons({
  node,
  user,
  onVote,
}: {
  node: CommentNode
  user: { id: string } | null
  onVote: (commentId: string, voteCount: number, myVote: number | null | undefined) => void
}) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const handleVote = async (value: 1 | -1) => {
    if (!user || busy) return
    setBusy(true)
    const res = await voteComment(node._id, value)
    setBusy(false)
    if (res.success && res.voteCount != null) {
      onVote(node._id, res.voteCount, res.myVote)
      if (res.gemReward && user.id === node.authorId) {
        void syncCommunityGemReward(res.gemReward).then((synced) => {
          if (synced) {
            toast.show(`+${res.gemReward!.gemsEarned} Gem · ${res.gemReward!.label}`, { tone: 'success' })
          }
        })
      }
    }
  }

  if (!user) {
    return <span className="text-xs text-ds-subtle">{node.voteCount} vote</span>
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleVote(1)}
        className={`px-2 py-0.5 rounded text-xs transition-colors disabled:opacity-50 ${
          node.myVote === 1
            ? 'bg-cyan-500/30 text-ds-accent border border-cyan-300/40'
            : 'bg-white/10 text-ds-muted hover:text-white border border-ds-border'
        }`}
      >
        ▲ {node.voteCount}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleVote(-1)}
        className={`px-2 py-0.5 rounded text-xs transition-colors disabled:opacity-50 ${
          node.myVote === -1
            ? 'bg-red-500/30 text-red-300 border border-red-300/40'
            : 'bg-white/10 text-ds-muted hover:text-white border border-ds-border'
        }`}
      >
        ▼
      </button>
    </div>
  )
}

function CommentItem({
  node,
  depth,
  user,
  postAuthorId,
  isNewsForum,
  onAddComment,
  onVoteComment,
  onMarkHelpful,
}: {
  node: CommentNode
  depth: number
  user: { id: string; role?: string } | null
  postAuthorId: string
  isNewsForum?: boolean
  onAddComment: (content: string, parentId?: string) => Promise<boolean>
  onVoteComment?: Props['onVoteComment']
  onMarkHelpful?: Props['onMarkHelpful']
}) {
  const toast = useToast()
  const [replyOpen, setReplyOpen] = useState(false)
  const [markBusy, setMarkBusy] = useState(false)
  const maxDepth = 6

  const handleVote = (commentId: string, voteCount: number, myVote: number | null | undefined) => {
    onVoteComment?.(commentId, voteCount, myVote)
  }

  const showHelpfulAction =
    !isNewsForum &&
    !node.isHelpful &&
    canMarkCommentHelpful(user, postAuthorId, node.authorId)

  const handleMarkHelpful = async () => {
    if (!user || markBusy || node.isHelpful) return
    setMarkBusy(true)
    const res = await markCommentHelpful(node._id)
    setMarkBusy(false)
    if (res.success && res.data) {
      onMarkHelpful?.(node._id, res.data)
      if (res.gemReward && user.id === node.authorId) {
        void syncCommunityGemReward(res.gemReward).then((synced) => {
          if (synced) {
            toast.show(`+${res.gemReward!.gemsEarned} Gem · ${res.gemReward!.label}`, { tone: 'success' })
          }
        })
      } else if (res.gemReward) {
        toast.show('Đã đánh dấu hữu ích — tác giả nhận thưởng Gem', { tone: 'success' })
      } else {
        toast.show('Đã đánh dấu hữu ích', { tone: 'success' })
      }
    } else if (res.error) {
      toast.show(res.error, { tone: 'danger' })
    }
  }

  return (
    <div className={depth > 0 ? 'mt-3 ml-3 sm:ml-4 pl-3 border-l border-ds-border' : ''}>
      <article className="rounded-xl border border-ds-border bg-white/5 p-4">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <UserProfileLink
            userId={node.authorId}
            displayName={node.authorName}
            avatarUrl={node.authorAvatar}
            overlayUrl={node.authorOverlayUrl}
            learnerTier={node.authorLearnerTier}
            size="sm"
            showName
            nameClassName="font-medium text-white"
          />
          {node.isHelpful ? (
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              Hữu ích
            </span>
          ) : null}
          <span className="text-ds-subtle text-xs">{formatDate(node.createdAt)}</span>
        </div>
        <div className="mt-2">
          <CommentBody content={node.content} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <CommentVoteButtons node={node} user={user} onVote={handleVote} />
          {showHelpfulAction ? (
            <button
              type="button"
              disabled={markBusy}
              onClick={() => void handleMarkHelpful()}
              className="text-xs text-emerald-400/90 hover:text-emerald-300 disabled:opacity-50"
            >
              {markBusy ? '...' : 'Hữu ích ✓'}
            </button>
          ) : null}
          {user && depth < maxDepth && (
            <button
              type="button"
              onClick={() => setReplyOpen((v) => !v)}
              className="text-xs text-cyan-400/90 hover:text-ds-text"
            >
              {replyOpen ? 'Đóng' : 'Trả lời'}
            </button>
          )}
          {user && user.id !== node.authorId && (
            <ReportContentButton targetType="comment" targetId={node._id} className="inline" />
          )}
        </div>
        {replyOpen && user && (
          <div className="mt-3 pt-3 border-t border-ds-border">
            <CommentComposer
              placeholder="Trả lời bình luận…"
              submitLabel="Gửi trả lời"
              onCancel={() => setReplyOpen(false)}
              onSubmit={async (html) => {
                const ok = await onAddComment(html, node._id)
                if (ok) setReplyOpen(false)
                return ok
              }}
            />
          </div>
        )}
      </article>
      {node.replies.length > 0 && (
        <div className="space-y-0">
          {node.replies.map((r) => (
            <CommentItem
              key={r._id}
              node={r}
              depth={depth + 1}
              user={user}
              postAuthorId={postAuthorId}
              isNewsForum={isNewsForum}
              onAddComment={onAddComment}
              onVoteComment={onVoteComment}
              onMarkHelpful={onMarkHelpful}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CommentThread({
  comments,
  user,
  postAuthorId,
  isNewsForum,
  onAddComment,
  onVoteComment,
  onMarkHelpful,
}: Props) {
  const tree = useMemo(() => buildTree(comments), [comments])

  return (
    <div className="space-y-4">
      {user && (
        <div className="rounded-xl border border-ds-border bg-white/[0.03] p-4">
          <CommentComposer onSubmit={(html) => onAddComment(html)} />
        </div>
      )}

      {tree.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-6 text-center text-ds-muted">
          Chưa có bình luận nào. Hãy là người mở đầu cuộc thảo luận.
        </div>
      ) : (
        tree.map((node) => (
          <CommentItem
            key={node._id}
            node={node}
            depth={0}
            user={user}
            postAuthorId={postAuthorId}
            isNewsForum={isNewsForum}
            onAddComment={onAddComment}
            onVoteComment={onVoteComment}
            onMarkHelpful={onMarkHelpful}
          />
        ))
      )}
    </div>
  )
}
