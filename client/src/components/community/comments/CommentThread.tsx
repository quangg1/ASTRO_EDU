'use client'

import { useMemo, useState } from 'react'
import type { Comment } from '@/features/community/api/communityApi'
import { voteComment } from '@/features/community/public'
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

type Props = {
  comments: Comment[]
  user: { id: string } | null
  onAddComment: (content: string, parentId?: string) => Promise<boolean>
  onVoteComment?: (commentId: string, voteCount: number, myVote: number | null | undefined) => void
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
  const [busy, setBusy] = useState(false)

  const handleVote = async (value: 1 | -1) => {
    if (!user || busy) return
    setBusy(true)
    const res = await voteComment(node._id, value)
    setBusy(false)
    if (res.success && res.voteCount != null) {
      onVote(node._id, res.voteCount, res.myVote)
    }
  }

  if (!user) {
    return <span className="text-xs text-gray-500">{node.voteCount} vote</span>
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleVote(1)}
        className={`px-2 py-0.5 rounded text-xs transition-colors disabled:opacity-50 ${
          node.myVote === 1
            ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-300/40'
            : 'bg-white/10 text-gray-400 hover:text-white border border-white/10'
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
            : 'bg-white/10 text-gray-400 hover:text-white border border-white/10'
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
  onAddComment,
  onVoteComment,
}: {
  node: CommentNode
  depth: number
  user: { id: string } | null
  onAddComment: (content: string, parentId?: string) => Promise<boolean>
  onVoteComment?: Props['onVoteComment']
}) {
  const [replyOpen, setReplyOpen] = useState(false)
  const maxDepth = 6

  const handleVote = (commentId: string, voteCount: number, myVote: number | null | undefined) => {
    onVoteComment?.(commentId, voteCount, myVote)
  }

  return (
    <div className={depth > 0 ? 'mt-3 ml-3 sm:ml-4 pl-3 border-l border-white/10' : ''}>
      <article className="rounded-xl border border-white/10 bg-white/5 p-4">
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
          <span className="text-gray-500 text-xs">{formatDate(node.createdAt)}</span>
        </div>
        <div className="mt-2">
          <CommentBody content={node.content} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <CommentVoteButtons node={node} user={user} onVote={handleVote} />
          {user && depth < maxDepth && (
            <button
              type="button"
              onClick={() => setReplyOpen((v) => !v)}
              className="text-xs text-cyan-400/90 hover:text-cyan-300"
            >
              {replyOpen ? 'Đóng' : 'Trả lời'}
            </button>
          )}
          {user && user.id !== node.authorId && (
            <ReportContentButton targetType="comment" targetId={node._id} className="inline" />
          )}
        </div>
        {replyOpen && user && (
          <div className="mt-3 pt-3 border-t border-white/10">
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
              onAddComment={onAddComment}
              onVoteComment={onVoteComment}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CommentThread({ comments, user, onAddComment, onVoteComment }: Props) {
  const tree = useMemo(() => buildTree(comments), [comments])

  return (
    <div className="space-y-4">
      {user && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <CommentComposer onSubmit={(html) => onAddComment(html)} />
        </div>
      )}

      {!user && (
        <p className="text-sm text-amber-200/80 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          Đăng nhập để bình luận với emoji, ảnh và trả lời theo chuỗi.
        </p>
      )}

      {tree.map((node) => (
        <CommentItem
          key={node._id}
          node={node}
          depth={0}
          user={user}
          onAddComment={onAddComment}
          onVoteComment={onVoteComment}
        />
      ))}

      {!tree.length && (
        <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-6 text-center text-gray-400">
          Chưa có bình luận. Hãy mở đầu cuộc thảo luận.
        </div>
      )}
    </div>
  )
}
