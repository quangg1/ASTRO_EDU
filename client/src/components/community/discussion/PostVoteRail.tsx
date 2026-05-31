'use client'

import { useEffect, useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { votePost } from '@/features/community/public'

type Props = {
  postId: string
  voteCount: number
  myVote?: number | null
  user: { id: string } | null
  onVote?: (postId: string, voteCount: number, myVote: number | null) => void
  onLoginRequired?: () => void
}

export function PostVoteRail({ postId, voteCount, myVote = null, user, onVote, onLoginRequired }: Props) {
  const [busy, setBusy] = useState(false)
  const [localVoteCount, setLocalVoteCount] = useState(voteCount)
  const [localMyVote, setLocalMyVote] = useState<number | null>(myVote)

  useEffect(() => {
    setLocalVoteCount(voteCount)
    setLocalMyVote(myVote ?? null)
  }, [voteCount, myVote, postId])

  const count = localVoteCount
  const activeVote = localMyVote

  const handleVote = async (value: 1 | -1) => {
    if (!user) {
      onLoginRequired?.()
      return
    }
    if (busy) return
    setBusy(true)
    const res = await votePost(postId, value)
    setBusy(false)
    if (res.success && res.voteCount != null) {
      setLocalVoteCount(res.voteCount)
      setLocalMyVote(res.myVote ?? null)
      onVote?.(postId, res.voteCount, res.myVote ?? null)
    }
  }

  const upActive = activeVote === 1
  const downActive = activeVote === -1

  return (
    <div
      className="flex shrink-0 flex-col items-center justify-center gap-1 border-r border-white/10 bg-black/25 px-2.5 py-3 min-w-[3rem]"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={busy}
        aria-label="Upvote"
        aria-pressed={upActive}
        onClick={() => void handleVote(1)}
        className={`rounded-md p-1.5 transition-colors disabled:opacity-50 ${
          upActive
            ? 'text-cyan-300 bg-cyan-500/20'
            : 'text-gray-500 hover:text-cyan-200 hover:bg-white/5'
        }`}
      >
        <ThumbsUp className="h-4 w-4" strokeWidth={upActive ? 2.25 : 1.75} />
      </button>
      <span
        className={`text-sm font-semibold tabular-nums leading-none ${
          count > 0 ? 'text-cyan-200' : count < 0 ? 'text-red-300' : 'text-gray-400'
        }`}
      >
        {count}
      </span>
      <button
        type="button"
        disabled={busy}
        aria-label="Downvote"
        aria-pressed={downActive}
        onClick={() => void handleVote(-1)}
        className={`rounded-md p-1.5 transition-colors disabled:opacity-50 ${
          downActive
            ? 'text-red-300 bg-red-500/20'
            : 'text-gray-500 hover:text-red-200 hover:bg-white/5'
        }`}
      >
        <ThumbsDown className="h-4 w-4" strokeWidth={downActive ? 2.25 : 1.75} />
      </button>
    </div>
  )
}
