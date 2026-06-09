import { getToken } from '@/features/auth/public'
import { getApiPathBase } from '@/lib/apiConfig'
import { apiClientHeaders } from '@/lib/apiClientHeaders'
import type { Comment, Post } from '@/features/community/api/communityApi'

const BASE = getApiPathBase()

function authHeaders(): HeadersInit {
  return apiClientHeaders()
}

export type ReportReason = 'spam' | 'harassment' | 'off-topic' | 'misinformation' | 'copyright' | 'other'

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam / quảng cáo',
  harassment: 'Quấy rối / xúc phạm',
  'off-topic': 'Không đúng chủ đề',
  misinformation: 'Thông tin sai lệch',
  copyright: 'Vi phạm bản quyền',
  other: 'Khác',
}

export type ModerationQueueItem = {
  report: {
    _id: string
    targetType: 'post' | 'comment'
    targetId: string
    reason: string
    details?: string
    status: string
    createdAt: string
    reporterName?: string
  }
  targetType: 'post' | 'comment'
  target: (Post | Comment) & { isHidden?: boolean }
  post: {
    _id: string
    title: string
    forumSlug?: string
    forumTitle?: string
  } | null
}

export async function submitCommunityReport(body: {
  targetType: 'post' | 'comment'
  targetId: string
  reason: ReportReason
  details?: string
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BASE}/community/mod/reports`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (json.success) return { success: true }
  return { success: false, error: json.error || 'Không gửi được báo cáo' }
}

export async function fetchModerationQueue(opts?: {
  status?: string
  limit?: number
}): Promise<{
  items: ModerationQueueItem[]
  stats: { openReports: number; hiddenPosts: number; hiddenComments: number }
}> {
  const params = new URLSearchParams()
  if (opts?.status) params.set('status', opts.status)
  if (opts?.limit) params.set('limit', String(opts.limit))
  const qs = params.toString()
  const res = await fetch(`${BASE}/community/mod/queue${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
    cache: 'no-store',
  })
  const json = await res.json()
  if (json.success && json.data) {
    return { items: json.data.items || [], stats: json.data.stats || { openReports: 0, hiddenPosts: 0, hiddenComments: 0 } }
  }
  return { items: [], stats: { openReports: 0, hiddenPosts: 0, hiddenComments: 0 } }
}

export async function resolveModerationReport(
  reportId: string,
  status: 'resolved' | 'dismissed',
  resolutionNote?: string,
): Promise<boolean> {
  const res = await fetch(`${BASE}/community/mod/reports/${reportId}/resolve`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ status, resolutionNote }),
  })
  const json = await res.json()
  return Boolean(json.success)
}

export async function issueModerationWarning(body: {
  userId: string
  message: string
  relatedReportId?: string
  postId?: string
}): Promise<boolean> {
  const res = await fetch(`${BASE}/community/mod/warn`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  const json = await res.json()
  return Boolean(json.success)
}

export async function setPostHidden(postId: string, hidden: boolean): Promise<boolean> {
  const res = await fetch(`${BASE}/community/mod/posts/${postId}/hidden`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ hidden }),
  })
  const json = await res.json()
  return Boolean(json.success)
}

export async function setCommentHidden(commentId: string, hidden: boolean): Promise<boolean> {
  const res = await fetch(`${BASE}/community/mod/comments/${commentId}/hidden`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ hidden }),
  })
  const json = await res.json()
  return Boolean(json.success)
}

export async function deleteCommentAsMod(commentId: string): Promise<boolean> {
  const res = await fetch(`${BASE}/community/mod/comments/${commentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const json = await res.json()
  return Boolean(json.success)
}
