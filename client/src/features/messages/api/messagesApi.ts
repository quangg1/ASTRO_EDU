import { getApiPathBase } from '@/lib/apiConfig'
import { apiClientHeaders, apiFetchInit } from '@/lib/apiClientHeaders'
import type { LearnerTierPublic } from '@/features/rewards/public'

const API = `${getApiPathBase()}/messages`

function authHeaders(): HeadersInit {
  return apiClientHeaders()
}

export type DmConversationSummary = {
  id: string
  otherUser: {
    id: string
    displayName: string
    avatar: string | null
    authorOverlayUrl?: string | null
    learnerTier?: LearnerTierPublic | null
  }
  lastMessageAt: string | null
  lastMessagePreview: string
  lastSenderId: string | null
  unreadCount: number
}

export type DmMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string | null
  isMine: boolean
}

export async function fetchConversations(): Promise<DmConversationSummary[]> {
  const res = await fetch(`${API}/conversations`, apiFetchInit({ headers: authHeaders(), cache: 'no-store' }))
  const data = await res.json()
  if (!res.ok || !data?.success) return []
  return Array.isArray(data.data) ? data.data : []
}

export async function fetchConversationMessages(
  conversationId: string,
  before?: string,
): Promise<DmMessage[]> {
  const q = new URLSearchParams()
  if (before) q.set('before', before)
  const res = await fetch(`${API}/conversations/${encodeURIComponent(conversationId)}?${q}`, apiFetchInit({ headers: authHeaders(), cache: 'no-store' }))
  const data = await res.json()
  if (!res.ok || !data?.success) return []
  return Array.isArray(data.data?.messages) ? data.data.messages : []
}

export async function openConversationWithUser(
  userId: string,
): Promise<{ conversationId: string } | null> {
  const res = await fetch(`${API}/open`, apiFetchInit({
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId }),
  }))
  const data = await res.json()
  if (!res.ok || !data?.success || !data?.data?.conversationId) return null
  return { conversationId: data.data.conversationId as string }
}

export async function sendDirectMessage(params: {
  conversationId?: string
  recipientId?: string
  body: string
}): Promise<{ conversationId: string; message: DmMessage } | null> {
  const res = await fetch(`${API}/send`, apiFetchInit({
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  }))
  const data = await res.json()
  if (!res.ok || !data?.success) return null
  return data.data as { conversationId: string; message: DmMessage }
}
