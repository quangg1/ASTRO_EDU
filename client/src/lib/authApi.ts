import { getAuthBase } from './apiConfig'
const AUTH_BASE = getAuthBase()

export interface AuthUser {
  id: string
  email: string | null
  displayName: string
  avatar: string | null
  provider: string
  role?: 'student' | 'teacher' | 'admin'
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: AuthUser
  error?: string
}

const TOKEN_KEY = 'galaxies_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_BASE}/auth/login`, {
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
  const res = await fetch(`${AUTH_BASE}/auth/register`, {
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
  if (!token) return { success: false, error: 'Chưa đăng nhập' }
  const res = await fetch(`${AUTH_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (data.success && data.user) {
    return { success: true, user: data.user }
  }
  clearToken()
  return { success: false, error: data.error || 'Phiên đăng nhập hết hạn' }
}

export function getGoogleAuthUrl(): string {
  return `${AUTH_BASE}/auth/google`
}

export function getFacebookAuthUrl(): string {
  return `${AUTH_BASE}/auth/facebook`
}

export async function updateProfile(data: { displayName?: string; avatar?: string }): Promise<AuthResponse> {
  const token = getToken()
  if (!token) return { success: false, error: 'Chưa đăng nhập' }
  const res = await fetch(`${AUTH_BASE}/auth/me`, {
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
  if (!token) return { success: false, error: 'Chưa đăng nhập' }
  const res = await fetch(`${AUTH_BASE}/auth/change-password`, {
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
  const res = await fetch(`${AUTH_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await res.json()
  if (data.success) return { success: true, resetLink: data.resetLink }
  return { success: false, error: data.error || 'Gửi yêu cầu thất bại' }
}

export async function resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_BASE}/auth/reset-password`, {
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
  if (!token) return { success: false, error: 'Chưa đăng nhập' }
  const res = await fetch(`${AUTH_BASE}/auth/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return { success: true, data: data.data }
  return { success: false, error: data.error || 'Lỗi tải danh sách' }
}
