import { getAuthBase } from './apiConfig'
import { setSecureToken, clearSecureToken } from './hybrid/mobileNative'
const AUTH_BASE = getAuthBase()

export interface AuthUser {
  id: string
  email: string | null
  displayName: string
  avatar: string | null
  provider: string
  role?: 'student' | 'teacher' | 'moderator' | 'admin'
  accountStatus?: 'active' | 'deactivated'
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: AuthUser
  error?: string
}

const TOKEN_KEY = 'galaxies_token'

function isTokenFormatValid(token: string): boolean {
  return token.split('.').length === 3 && token.length > 20
}

function decodeBase64Url(segment: string): string | null {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    return atob(padded)
  } catch {
    return null
  }
}

export function getUserFromStoredToken(): AuthUser | null {
  const token = getToken()
  if (!token || typeof window === 'undefined') return null
  const payloadSegment = token.split('.')[1]
  const decoded = payloadSegment ? decodeBase64Url(payloadSegment) : null
  if (!decoded) return null

  try {
    const payload = JSON.parse(decoded) as {
      sub?: string
      email?: string | null
      displayName?: string
      avatar?: string | null
      provider?: string
      role?: AuthUser['role']
      exp?: number
    }
    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      clearToken()
      return null
    }
    if (!payload.sub) return null
    return {
      id: payload.sub,
      email: payload.email || null,
      displayName: payload.displayName || payload.email?.split('@')[0] || 'Người dùng',
      avatar: payload.avatar || null,
      provider: payload.provider || 'local',
      role: payload.role || 'student',
    }
  } catch {
    return null
  }
}

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    cache: 'no-store',
    credentials: 'omit',
    ...init,
    headers: {
      ...(init?.headers || {}),
    },
  })
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  if (!isTokenFormatValid(token)) {
    localStorage.removeItem(TOKEN_KEY)
    return null
  }
  return token
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  if (!isTokenFormatValid(token)) return
  localStorage.setItem(TOKEN_KEY, token)
  setSecureToken(token).catch(() => {})
}

export function clearToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  clearSecureToken().catch(() => {})
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await authFetch(`${AUTH_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (data.success && data.token) {
    setToken(data.token)
    return { success: true, token: data.token, user: data.user }
  }
  return { success: false, error: data.error || 'Đăng nhập thất bại' }
}

export async function register(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResponse> {
  const res = await authFetch(`${AUTH_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  })
  const data = await res.json()
  if (data.success && data.token) {
    setToken(data.token)
    return { success: true, token: data.token, user: data.user }
  }
  return { success: false, error: data.error || 'Đăng ký thất bại' }
}

export async function fetchMe(): Promise<AuthResponse> {
  const token = getToken()
  if (!token) return { success: false, error: 'Not signed in' }
  const res = await authFetch(`${AUTH_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (data.success && data.user) {
    if (typeof data.token === 'string' && data.token) {
      setToken(data.token)
    }
    return { success: true, user: data.user, token: typeof data.token === 'string' ? data.token : undefined }
  }
  clearToken()
  return { success: false, error: data.error || 'Session expired' }
}

/** Đăng nhập sau khi Firebase `signInWithPopup` — server verify ID token và gộp user theo email. */
export async function loginWithFirebaseIdToken(idToken: string): Promise<AuthResponse> {
  const res = await authFetch(`${AUTH_BASE}/auth/firebase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  const data = await res.json()
  if (data.success && data.token) {
    setToken(data.token)
    return { success: true, token: data.token, user: data.user }
  }
  return { success: false, error: data.error || 'Đăng nhập Firebase thất bại' }
}

export async function updateProfile(data: { displayName?: string; avatar?: string }): Promise<AuthResponse> {
  const token = getToken()
  if (!token) return { success: false, error: 'Not signed in' }
  const res = await authFetch(`${AUTH_BASE}/auth/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (json.success && json.user) return { success: true, user: json.user }
  return { success: false, error: json.error || 'Cập nhật thất bại' }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
  const token = getToken()
  if (!token) return { success: false, error: 'Not signed in' }
  const res = await authFetch(`${AUTH_BASE}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  const json = await res.json()
  if (json.success) return { success: true }
  return { success: false, error: json.error || 'Đổi mật khẩu thất bại' }
}

export async function forgotPassword(email: string): Promise<{ success: boolean; error?: string; resetLink?: string }> {
  const res = await authFetch(`${AUTH_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await res.json()
  if (data.success) return { success: true, resetLink: data.resetLink }
  return { success: false, error: data.error || 'Gửi yêu cầu thất bại' }
}

export async function resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
  const res = await authFetch(`${AUTH_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  })
  const data = await res.json()
  if (data.success) return { success: true }
  return { success: false, error: data.error || 'Đặt lại mật khẩu thất bại' }
}

export interface AdminUser {
  id: string
  email: string | null
  displayName: string
  avatar: string | null
  provider: string
  role: string
  accountStatus: 'active' | 'deactivated'
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

export type UserRole = 'student' | 'teacher' | 'moderator' | 'admin'
export type AccountStatus = 'active' | 'deactivated'

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

export interface TeacherApplication {
  id: string
  userId: string
  status: 'pending' | 'approved' | 'rejected'
  bio: string
  organization: string
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

export async function submitTeacherApplication(body: {
  bio: string
  organization?: string
}): Promise<{ success: boolean; application?: TeacherApplication; error?: string; code?: string }> {
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
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending'
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

export async function reviewTeacherApplication(
  applicationId: string,
  action: 'approve' | 'reject',
  note?: string
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

export async function deactivateMyAccount(reason?: string): Promise<{ success: boolean; error?: string }> {
  const token = getToken()
  if (!token) return { success: false, error: 'Not signed in' }
  const res = await authFetch(`${AUTH_BASE}/auth/me`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason }),
  })
  const data = await res.json()
  if (data.success) {
    clearToken()
    return { success: true }
  }
  return { success: false, error: data.error || 'Ngừng hoạt động tài khoản thất bại' }
}
