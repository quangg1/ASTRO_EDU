'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import { AvatarWithDecoration } from '@/features/users/public'
import {
  fetchConversations,
  useDmRealtime,
  type DmConversationSummary,
} from '@/features/messages/public'

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(+d)) return ''
  const now = new Date()
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  if (sameDay) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })
}

export default function MessagesInboxPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [items, setItems] = useState<DmConversationSummary[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const list = await fetchConversations()
    setItems(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (checked && !user) {
      router.replace('/login?redirect=/messages')
      return
    }
    if (!user) return
    void reload()
  }, [checked, user, router, reload])

  useDmRealtime(Boolean(user), () => {
    void reload()
  })

  return (
    <div className="relative z-10 px-4 pb-16 max-w-2xl mx-auto pt-2">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-ds-accent/80 font-mono">
              Tin nhắn
            </p>
            <h1 className="text-2xl font-bold text-ds-text mt-1">Hộp thư</h1>
          </div>
          <Link
            href="/community"
            className="text-sm text-ds-muted hover:text-ds-text"
          >
            Cộng đồng →
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-ds-subtle">Đang tải…</p>
        ) : items.length === 0 ? (
          <div className="cosmo-dark-panel rounded-2xl p-10 text-center">
            <MessageCircle className="h-10 w-10 text-ds-accent/40 mx-auto mb-3" aria-hidden />
            <p className="text-ds-muted">Chưa có cuộc trò chuyện nào.</p>
            <p className="text-sm text-ds-subtle mt-2">
              Vào hồ sơ bạn bè trong cộng đồng và bấm &quot;Nhắn tin&quot;.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/messages/${encodeURIComponent(c.id)}`}
                  className="cosmo-dark-panel flex items-center gap-3 rounded-xl px-4 py-3 hover:border-ds-accent/30 transition"
                >
                  <AvatarWithDecoration
                    avatarUrl={c.otherUser.avatar}
                    displayName={c.otherUser.displayName}
                    overlayUrl={c.otherUser.authorOverlayUrl}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-white truncate">
                        {c.otherUser.displayName}
                      </span>
                      <span className="text-[10px] text-ds-subtle shrink-0">
                        {formatTime(c.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-sm text-ds-muted truncate mt-0.5">
                      {c.lastMessagePreview || '—'}
                    </p>
                  </div>
                  {c.unreadCount > 0 ? (
                    <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-ds-accent text-[10px] font-bold text-ds-base flex items-center justify-center">
                      {c.unreadCount > 9 ? '9+' : c.unreadCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}
