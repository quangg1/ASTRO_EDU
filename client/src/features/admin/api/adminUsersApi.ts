/**
 * Admin user-management API.
 *
 * Endpoints are mounted on the auth gateway (`/api/admin/users`) because users
 * are an auth-owned resource, but the operations themselves are admin-domain
 * concerns (role/status changes). Consumers should go through
 * `features/admin/public` rather than importing this file directly.
 *
 * Session helpers (`getToken`) are pulled deep from the auth domain — this is
 * the documented exception for cross-domain primitives in DOMAIN_MAP §3 and
 * avoids a barrel cycle (auth/public re-exports the auth Zustand store).
 */
import { getAuthBase } from '@/lib/apiConfig'
import { getToken } from '@/features/auth/api/authApi'

const AUTH_BASE = getAuthBase()

function authFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    cache: 'no-store',
    credentials: 'omit',
    ...init,
    headers: { ...(init?.headers || {}) },
  })
}

export type UserRole = 'student' | 'teacher' | 'moderator' | 'admin'
export type AccountStatus = 'active' | 'deactivated'

export interface AdminUser {
  id: string
  email: string | null
  displayName: string
  avatar: string | null
  provider: string
  role: string
  accountStatus: AccountStatus
  deactivatedAt: string | null
  deactivatedByUserId: string | null
  deactivationReason: string
  restoredAt: string | null
  createdAt: string
}

export async function fetchAdminUsers(): Promise<{ success: boolean; data?: AdminUser[]; error?: string }> {
  const token = getToken()
  if (!token) return { success: false, error: 'Not signed in' }
  const res = await authFetch(`${AUTH_BASE}/api/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return { success: true, data: data.data }
  return { success: false, error: data.error || 'Lỗi tải danh sách' }
}

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  const token = getToken()
  if (!token) return { success: false, error: 'Not signed in' }
  const res = await authFetch(`${AUTH_BASE}/api/admin/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role }),
  })
  const data = await res.json()
  if (data.success && data.user) return { success: true, user: data.user }
  return { success: false, error: data.error || 'Cập nhật role thất bại' }
}

export async function updateUserStatus(
  userId: string,
  accountStatus: AccountStatus,
  reason?: string
): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  const token = getToken()
  if (!token) return { success: false, error: 'Not signed in' }
  const res = await authFetch(`${AUTH_BASE}/api/admin/users/${encodeURIComponent(userId)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ accountStatus, reason }),
  })
  const data = await res.json()
  if (data.success && data.user) return { success: true, user: data.user }
  return { success: false, error: data.error || 'Cập nhật trạng thái tài khoản thất bại' }
}

export async function deleteUserPermanently(
  userId: string,
  confirmEmail: string,
  reason: string
): Promise<{ success: boolean; error?: string; message?: string; emailSent?: boolean; code?: string }> {
  const token = getToken()
  if (!token) return { success: false, error: 'Not signed in' }
  const res = await authFetch(`${AUTH_BASE}/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ confirmEmail, reason }),
  })
  const data = await res.json()
  if (data.success) {
    return { success: true, message: data.message, emailSent: data.emailSent }
  }
  return {
    success: false,
    error: data.error || 'Xóa tài khoản thất bại',
    code: data.code,
  }
}
