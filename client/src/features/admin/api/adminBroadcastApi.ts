import { getApiPathBase } from '@/lib/apiConfig'
import { apiClientHeaders, apiFetchInit } from '@/lib/apiClientHeaders'

const BASE = `${getApiPathBase()}/admin`

function authHeaders(): HeadersInit {
  return apiClientHeaders()
}

export type BroadcastRole = 'student' | 'teacher' | 'moderator' | 'admin'

export async function sendAdminBroadcast(payload: {
  titleVi: string
  bodyVi?: string
  href?: string
  roles?: BroadcastRole[] | null
}): Promise<{ success: boolean; recipientCount?: number; error?: string }> {
  const res = await fetch(`${BASE}/notifications/broadcast`, apiFetchInit({
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      titleVi: payload.titleVi,
      bodyVi: payload.bodyVi ?? '',
      href: payload.href?.trim() || undefined,
      roles: payload.roles?.length ? payload.roles : undefined,
    }),
  }))
  const json = await res.json().catch(() => ({}))
  if (json.success && json.data) {
    return { success: true, recipientCount: Number(json.data.recipientCount) || 0 }
  }
  return { success: false, error: json.error || 'Không gửi được thông báo' }
}
