'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Send } from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import { AvatarWithDecoration } from '@/features/users/public'
import {
  fetchConversationMessages,
  fetchConversations,
  sendDirectMessage,
  useDmRealtime,
  type DmConversationSummary,
  type DmMessage,
} from '@/features/messages/public'

export default function MessageThreadPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = String(params?.conversationId ?? '').trim()
  const { user, checked } = useAuthStore()
  const [peer, setPeer] = useState<DmConversationSummary['otherUser'] | null>(null)
  const [messages, setMessages] = useState<DmMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const load = useCallback(async () => {
    if (!conversationId) return
    const [list, msgs] = await Promise.all([
      fetchConversations(),
      fetchConversationMessages(conversationId),
    ])
    const conv = list.find((c) => c.id === conversationId)
    setPeer(conv?.otherUser ?? null)
    setMessages(msgs)
    setLoading(false)
    setTimeout(scrollBottom, 50)
  }, [conversationId])

  useEffect(() => {
    if (checked && !user) {
      router.replace(`/login?redirect=/messages/${encodeURIComponent(conversationId)}`)
      return
    }
    if (!user || !conversationId) return
    void load()
  }, [checked, user, conversationId, router, load])

  useDmRealtime(Boolean(user), (ev) => {
    if (ev.conversationId !== conversationId) return
    setMessages((prev) => {
      if (prev.some((m) => m.id === ev.message.id)) return prev
      return [...prev, ev.message]
    })
    setTimeout(scrollBottom, 30)
  })

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setDraft('')
    const res = await sendDirectMessage({ conversationId, body })
    setSending(false)
    if (res?.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message.id)) return prev
        return [...prev, res.message]
      })
      setTimeout(scrollBottom, 30)
    }
  }

  return (
    <div className="relative z-10 text-ds-text w-full flex flex-col">
      <header className="fixed top-14 left-0 right-0 z-20 border-b border-ds-border bg-ds-overlay backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/messages"
            className="p-1.5 rounded-lg text-ds-muted hover:text-ds-text hover:bg-white/5"
            aria-label="Quay lại hộp thư"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          {peer ? (
            <>
              <AvatarWithDecoration
                avatarUrl={peer.avatar}
                displayName={peer.displayName}
                overlayUrl={peer.authorOverlayUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/users/${peer.id}`}
                  className="font-medium text-white hover:text-cyan-200 truncate block"
                >
                  {peer.displayName}
                </Link>
              </div>
            </>
          ) : (
            <span className="text-ds-muted text-sm">Đang tải…</span>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-[7.5rem] pb-24 max-w-2xl mx-auto w-full px-4">
        {loading ? (
          <p className="text-sm text-ds-subtle text-center py-12">Đang tải tin nhắn…</p>
        ) : (
          <div className="flex-1 space-y-3 overflow-y-auto py-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.isMine
                      ? 'bg-ds-accent text-ds-base rounded-br-md'
                      : 'cosmo-dark-panel border border-ds-border text-ds-text rounded-bl-md'
                  }`}
                >
                  {m.body}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <form
        onSubmit={(e) => void handleSend(e)}
        className="fixed bottom-0 left-0 right-0 border-t border-ds-border bg-ds-overlay backdrop-blur-md p-4"
      >
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nhập tin nhắn…"
            className="cosmo-input-surface flex-1 rounded-xl px-4 py-3 text-sm text-ds-text placeholder:text-ds-subtle focus:border-ds-accent focus:outline-none"
            maxLength={4000}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="p-3 rounded-xl bg-ds-accent text-ds-base disabled:opacity-40 hover:opacity-90"
            aria-label="Gửi"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
