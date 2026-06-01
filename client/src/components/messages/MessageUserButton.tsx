'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import { openConversationWithUser } from '@/features/messages/public'

type Props = {
  userId: string
  displayName?: string
  className?: string
  variant?: 'primary' | 'ghost'
}

export function MessageUserButton({
  userId,
  displayName,
  className = '',
  variant = 'primary',
}: Props) {
  const router = useRouter()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)

  if (!user?.id || String(user.id) === String(userId)) return null

  const openChat = async () => {
    setLoading(true)
    const res = await openConversationWithUser(userId)
    setLoading(false)
    if (res?.conversationId) {
      router.push(`/messages/${encodeURIComponent(res.conversationId)}`)
    }
  }

  const base =
    variant === 'primary'
      ? 'bg-gradient-to-r from-cyan-600/90 to-violet-600/90 border border-cyan-400/30 text-white shadow-lg shadow-cyan-900/20'
      : 'bg-white/5 border border-white/15 text-slate-200 hover:bg-white/10'

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void openChat()}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 ${base} ${className}`}
    >
      <MessageCircle className="h-4 w-4" aria-hidden />
      {loading ? 'Đang mở…' : `Nhắn tin${displayName ? ` ${displayName.split(' ')[0]}` : ''}`}
    </button>
  )
}
