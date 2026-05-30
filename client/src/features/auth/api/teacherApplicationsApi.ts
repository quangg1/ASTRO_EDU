/**
 * Teacher-application API surface.
 */
import { getAuthBase } from '@/lib/apiConfig'
import { getToken } from './authApi'

const AUTH_BASE = getAuthBase()

function authFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    cache: 'no-store',
    credentials: 'omit',
    ...init,
    headers: { ...(init?.headers || {}) },
  })
}

export interface TeacherApplication {
  id: string
  userId: string
  status: 'pending' | 'approved' | 'rejected'
  applicationEmail: string
  fullName: string
  phone: string
  headline: string
  city: string
  organizationRole: string
  teachingLevels: string[]
  bio: string
  organization: string
  expertise: string[]
  education: string
  yearsExperience: number | null
  website: string
  linkedin: string
  avatarUrl: string | null
  cvUrl: string | null
  cvFileName: string
  certificateUrl: string | null
  certificateFileName: string
  cvReviewedAt: string | null
  cvReviewedByUserId: string | null
  reviewedAt: string | null
  reviewedByUserId: string | null
  reviewNote: string
  createdAt: string
  updatedAt: string
}

export interface TeacherApplicationWithUser extends TeacherApplication {
  user: {
    id: string
    email: string | null
    displayName: string
    role: string
  } | null
}

export type TeacherApplicationSubmitBody = {
  fullName: string
  phone: string
  headline: string
  city?: string
  organization: string
  organizationRole?: string
  teachingLevels?: string[]
  expertise: string | string[]
  education: string
  yearsExperience?: number | string
  website?: string
  linkedin?: string
  avatarUrl?: string
  bio: string
  cvUrl: string
  cvFileName?: string
  certificateUrl?: string
  certificateFileName?: string
}

export async function submitTeacherApplication(
  body: TeacherApplicationSubmitBody,
): Promise<{ success: boolean; application?: TeacherApplication; error?: string; code?: string }> {
  const token = getToken()
  if (!token) return { success: false, error: 'Chưa đăng nhập' }
  const res = await authFetch(`${AUTH_BASE}/auth/teacher-application`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.success && data.application) return { success: true, application: data.application }
  return { success: false, error: data.error || 'Gửi đơn thất bại', code: data.code }
}

export async function fetchMyTeacherApplicationStatus(): Promise<{
  success: boolean
  pending?: TeacherApplication | null
  last?: TeacherApplication | null
  error?: string
}> {
  const token = getToken()
  if (!token) return { success: false, error: 'Chưa đăng nhập' }
  const res = await authFetch(`${AUTH_BASE}/auth/teacher-application/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (data.success) {
    return { success: true, pending: data.pending ?? null, last: data.last ?? null }
  }
  return { success: false, error: data.error || 'Không tải được trạng thái' }
}

export async function fetchAdminTeacherApplications(
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
): Promise<{ success: boolean; data?: TeacherApplicationWithUser[]; error?: string }> {
  const token = getToken()
  if (!token) return { success: false, error: 'Not signed in' }
  const q = status === 'all' ? 'all' : status
  const res = await authFetch(`${AUTH_BASE}/api/admin/teacher-applications?status=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return { success: true, data: data.data }
  return { success: false, error: data.error || 'Lỗi tải đơn' }
}

export async function markTeacherApplicationCvReviewed(
  applicationId: string,
): Promise<{ success: boolean; application?: TeacherApplication; error?: string }> {
  const token = getToken()
  if (!token) return { success: false, error: 'Not signed in' }
  const res = await authFetch(
    `${AUTH_BASE}/api/admin/teacher-applications/${encodeURIComponent(applicationId)}/cv-reviewed`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  const data = await res.json()
  if (data.success && data.application) return { success: true, application: data.application }
  return { success: false, error: data.error || 'Xác nhận CV thất bại' }
}

export async function reviewTeacherApplication(
  applicationId: string,
  action: 'approve' | 'reject',
  note?: string,
): Promise<{ success: boolean; application?: TeacherApplication; error?: string }> {
  const token = getToken()
  if (!token) return { success: false, error: 'Not signed in' }
  const res = await authFetch(`${AUTH_BASE}/api/admin/teacher-applications/${encodeURIComponent(applicationId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, note: note ?? '' }),
  })
  const data = await res.json()
  if (data.success && data.application) return { success: true, application: data.application }
  return { success: false, error: data.error || 'Xử lý đơn thất bại' }
}
