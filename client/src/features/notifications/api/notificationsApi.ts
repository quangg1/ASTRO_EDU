import { getToken } from '@/features/auth/public'
import { getApiPathBase } from '@/lib/apiConfig'

const BASE = getApiPathBase()

function authHeaders(): HeadersInit {
  const token = getToken()
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`
  return h
}

export interface AppNotification {
  id: string
  type: string
  titleVi: string
  bodyVi: string
  href: string | null
  readAt: string | null
  createdAt: string
  metadata: Record<string, unknown>
}

export async function fetchNotifications(params?: {
  limit?: number
  unreadOnly?: boolean
}): Promise<AppNotification[]> {
  const q = new URLSearchParams()
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.unreadOnly) q.set('unreadOnly', '1')
  const res = await fetch(`${BASE}/notifications?${q.toString()}`, { headers: authHeaders() })
  const data = await res.json()
  if (data?.success && Array.isArray(data.data)) return data.data as AppNotification[]
  return []
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const res = await fetch(`${BASE}/notifications/unread-count`, { headers: authHeaders() })
  const data = await res.json()
  if (data?.success && data.data?.count != null) return Number(data.data.count) || 0
  return 0
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const res = await fetch(`${BASE}/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    headers: authHeaders(),
  })
  const data = await res.json()
  return Boolean(data?.success)
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const res = await fetch(`${BASE}/notifications/read-all`, {
    method: 'POST',
    headers: authHeaders(),
  })
  const data = await res.json()
  return Boolean(data?.success)
}
