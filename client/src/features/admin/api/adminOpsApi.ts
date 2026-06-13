import { getApiPathBase } from '@/lib/apiConfig'
import { apiClientHeaders, apiFetchInit } from '@/lib/apiClientHeaders'
import type { AdminOrder } from '@/features/payment/api/paymentApi'

const API = getApiPathBase()

function headers(): HeadersInit {
  return apiClientHeaders()
}

async function parse<T>(res: Response): Promise<{ success: boolean; data?: T; error?: string; total?: number; page?: number; limit?: number }> {
  const json = await res.json()
  return json
}

export type Paginated<T> = { items: T[]; total: number; page: number; limit: number }

export type AdminUserDetail = {
  user: {
    id: string
    email: string | null
    displayName: string
    provider?: string
    role: string
    accountStatus: string
    createdAt: string
    deactivationReason?: string
  }
  wallet: {
    balance: number
    totalGemsEarned: number
    learnerTier: { id: string; labelVi: string }
    recentTransactions: { id: string; delta: number; reason: string; createdAt: string }[]
  }
  orders: AdminOrder[]
  catalogEnrollments: {
    id: string
    courseId: string
    courseSlug: string | null
    courseTitle: string | null
    status: string
    enrolledAt: string
  }[]
  cohortEnrollments: {
    id: string
    cohortId: string
    cohortTitle: string | null
    courseSlug: string | null
    joinedAt: string
  }[]
}

export type AdminCourseRow = {
  id: string
  title: string
  slug: string
  published: boolean
  price: number
  currency: string
  isPaid: boolean
  ownerEmail: string | null
  ownerName: string | null
  updatedAt: string
}

export type AdminSystemStatus = {
  api: { ok: boolean; timestamp: string }
  database: { ok: boolean }
  smtp: { configured: boolean }
  newsCrawl: {
    enabled: boolean
    lastRunAt: string | null
    lastResult: Record<string, unknown> | null
    nextDueAt: string | null
    intervalHours: number
  }
  security: { eventsLast24h: number }
}

export type AdminAuditEntry = {
  id: string
  source: string
  action: string
  actionLabel: string
  actorUserId: string | null
  targetId: string | null
  reason: string
  createdAt: string
  payload?: Record<string, unknown>
}

export async function fetchAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const res = await fetch(`${API}/admin/users/${encodeURIComponent(userId)}/detail`, apiFetchInit({ headers: headers() }))
  const data = await parse<AdminUserDetail>(res)
  return data.success && data.data ? data.data : null
}

export async function fetchAdminOrdersList(params: {
  q?: string
  status?: string
  page?: number
  limit?: number
}): Promise<Paginated<AdminOrder>> {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.status) sp.set('status', params.status)
  if (params.page) sp.set('page', String(params.page))
  if (params.limit) sp.set('limit', String(params.limit))
  const res = await fetch(`${API}/admin/orders?${sp}`, apiFetchInit({ headers: headers() }))
  const data = await parse<Paginated<AdminOrder>>(res)
  if (data.success && data.data) return data.data
  return { items: [], total: 0, page: 1, limit: 30 }
}

export async function fetchAdminOrderDetail(txnRef: string): Promise<AdminOrder | null> {
  const res = await fetch(`${API}/admin/orders/${encodeURIComponent(txnRef)}`, apiFetchInit({ headers: headers() }))
  const data = await parse<AdminOrder>(res)
  return data.success && data.data ? data.data : null
}

export async function patchAdminOrderNote(txnRef: string, adminNote: string): Promise<boolean> {
  const res = await fetch(`${API}/admin/orders/${encodeURIComponent(txnRef)}/note`, apiFetchInit({
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ adminNote }),
  }))
  const data = await parse(res)
  return Boolean(data.success)
}

export async function cancelAdminOrder(txnRef: string, reason?: string): Promise<boolean> {
  const res = await fetch(`${API}/admin/orders/${encodeURIComponent(txnRef)}/cancel`, apiFetchInit({
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ reason }),
  }))
  const data = await parse(res)
  return Boolean(data.success)
}

export async function refundAdminOrder(txnRef: string, reason: string, revokeAccess = true): Promise<boolean> {
  const res = await fetch(`${API}/admin/orders/${encodeURIComponent(txnRef)}/refund`, apiFetchInit({
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ reason, revokeAccess }),
  }))
  const data = await parse(res)
  return Boolean(data.success)
}

export async function grantCatalogEnrollment(body: { userId: string; courseId: string; reason?: string }): Promise<boolean> {
  const res = await fetch(`${API}/admin/enrollments/catalog/grant`, apiFetchInit({
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  }))
  return (await parse(res)).success
}

export async function revokeCatalogEnrollment(body: {
  userId: string
  courseId: string
  reason?: string
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API}/admin/enrollments/catalog/revoke`, apiFetchInit({
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  }))
  const data = await parse(res)
  return { success: data.success, error: data.error }
}

export async function grantCohortEnrollment(body: { userId: string; cohortId: string; reason?: string }): Promise<boolean> {
  const res = await fetch(`${API}/admin/enrollments/cohort/grant`, apiFetchInit({
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  }))
  return (await parse(res)).success
}

export async function revokeCohortEnrollment(body: {
  userId: string
  cohortId: string
  reason?: string
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API}/admin/enrollments/cohort/revoke`, apiFetchInit({
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  }))
  const data = await parse(res)
  return { success: data.success, error: data.error }
}

export async function fetchAdminCoursesList(params: {
  q?: string
  published?: string
  page?: number
}): Promise<Paginated<AdminCourseRow>> {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.published) sp.set('published', params.published)
  if (params.page) sp.set('page', String(params.page))
  const res = await fetch(`${API}/admin/courses?${sp}`, apiFetchInit({ headers: headers() }))
  const data = await parse<Paginated<AdminCourseRow>>(res)
  if (data.success && data.data) return data.data
  return { items: [], total: 0, page: 1, limit: 30 }
}

export async function patchAdminCoursePublished(courseId: string, published: boolean, reason?: string): Promise<boolean> {
  const res = await fetch(`${API}/admin/courses/${encodeURIComponent(courseId)}/published`, apiFetchInit({
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ published, reason }),
  }))
  return (await parse(res)).success
}

export async function fetchAdminSystemStatus(): Promise<AdminSystemStatus | null> {
  const res = await fetch(`${API}/admin/system/status`, apiFetchInit({ headers: headers() }))
  const data = await parse<AdminSystemStatus>(res)
  return data.success && data.data ? data.data : null
}

export async function triggerAdminNewsCrawl(reason?: string): Promise<boolean> {
  const res = await fetch(`${API}/admin/system/news-crawl`, apiFetchInit({
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ reason }),
  }))
  return (await parse(res)).success
}

export async function fetchAdminAuditLog(params: {
  source?: string
  page?: number
}): Promise<Paginated<AdminAuditEntry>> {
  const sp = new URLSearchParams()
  if (params.source) sp.set('source', params.source)
  if (params.page) sp.set('page', String(params.page))
  const res = await fetch(`${API}/admin/audit-log?${sp}`, apiFetchInit({ headers: headers() }))
  const data = await parse<Paginated<AdminAuditEntry>>(res)
  if (data.success && data.data) return data.data
  return { items: [], total: 0, page: 1, limit: 50 }
}

export async function fetchAdminModerationQueue(): Promise<{
  items: unknown[]
  stats: { openReports: number; hiddenPosts: number; hiddenComments: number }
} | null> {
  const res = await fetch(`${API}/admin/moderation/queue?limit=50`, apiFetchInit({ headers: headers() }))
  const data = await parse<{ items: unknown[]; stats: { openReports: number; hiddenPosts: number; hiddenComments: number } }>(res)
  return data.success && data.data ? data.data : null
}
