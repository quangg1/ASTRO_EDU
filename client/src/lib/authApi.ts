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
    return { success: true, user: data.user }
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
  createdAt: string
}

export async function fetchAdminUsers(): Promise<{ success: boolean; data?: AdminUser[]; error?: string }> {
  const token = getToken()
  if (!token) return { success: false, error: 'Not signed in' }
  const res = await authFetch(`${AUTH_BASE}/auth/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return { success: true, data: data.data }
  return { success: false, error: data.error || 'Lỗi tải danh sách' }
}

export type UserRole = 'student' | 'teacher' | 'moderator' | 'admin'

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  const token = getToken()
  if (!token) return { success: false, error: 'Not signed in' }
  const res = await authFetch(`${AUTH_BASE}/auth/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role }),
  })
  const data = await res.json()
  if (data.success && data.user) return { success: true, user: data.user }
  return { success: false, error: data.error || 'Cập nhật role thất bại' }
}
