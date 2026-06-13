/**
 * Core auth API + token storage.
 *
 * Web: HttpOnly cookie `galaxies_session` (không lưu JWT trong localStorage).
 * Native app: Bearer token trong secure storage.
 */
import { getAuthBase } from '@/lib/apiConfig'
import { apiRequestInit, usesCookieAuth } from '@/lib/apiRequestInit'
import { setSecureToken, clearSecureToken, isNativeApp } from '@/lib/hybrid/mobileNative'
import { useAuthStore } from '../stores/useAuthStore'

const AUTH_BASE = getAuthBase()

export interface AuthUser {
  id: string
  email: string | null
  displayName: string
  avatar: string | null
  provider: string
  role?: 'student' | 'teacher' | 'moderator' | 'admin'
  adminScopes?: string[]
  accountStatus?: 'active' | 'deactivated'
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: AuthUser
  error?: string
  code?: string
}

export type RegisterStartResponse =
  | {
      success: true
      needsVerification: true
      email: string
      message?: string
      emailSent?: boolean
      devVerificationCode?: string
      devHint?: string
    }
  | { success: true; token: string; user: AuthUser }
  | { success: false; error: string; code?: string }

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

function nativeClientHeader(): Record<string, string> {
  return isNativeApp() ? { 'X-Galaxies-Client': 'native' } : {}
}

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const base = apiRequestInit(init)
  const headers = { ...(base.headers as Record<string, string>), ...nativeClientHeader() }
  return fetch(url, { ...base, headers })
}

export function getUserFromStoredToken(): AuthUser | null {
  if (!usesCookieAuth()) {
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
  return null
}

/** Web: dựa vào user đã hydrate; native: JWT trong storage. */
export function hasClientSession(): boolean {
  if (!usesCookieAuth()) return Boolean(getToken())
  return Boolean(useAuthStore.getState().user)
}

export function getToken(): string | null {
  if (typeof window === 'undefined' || usesCookieAuth()) return null
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  if (!isTokenFormatValid(token)) {
    localStorage.removeItem(TOKEN_KEY)
    return null
  }
  return token
}

export function setToken(token: string): void {
  if (typeof window === 'undefined' || usesCookieAuth()) return
  if (!isTokenFormatValid(token)) return
  localStorage.setItem(TOKEN_KEY, token)
  setSecureToken(token).catch(() => {})
  window.dispatchEvent(new CustomEvent('galaxies-auth-signed-in'))
}

export function clearToken(): void {
  if (typeof window === 'undefined') return
  if (!usesCookieAuth()) {
    localStorage.removeItem(TOKEN_KEY)
    clearSecureToken().catch(() => {})
  }
}

export async function logout(): Promise<void> {
  try {
    await authFetch(`${AUTH_BASE}/auth/logout`, { method: 'POST' })
  } catch {
    /* ignore */
  }
  clearToken()
}

function persistLoginToken(data: { token?: string; user?: AuthUser }): void {
  if (usesCookieAuth()) {
    if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY)
    return
  }
  if (data.token) setToken(data.token)
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await authFetch(`${AUTH_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (data.success && data.user) {
    persistLoginToken(data)
    return { success: true, token: data.token, user: data.user }
  }
  return { success: false, error: data.error || 'Đăng nhập thất bại', code: data.code }
}

export async function register(
  email: string,
  password: string,
  displayName?: string
): Promise<RegisterStartResponse> {
  const res = await authFetch(`${AUTH_BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  })
  const data = await res.json()
  if (data.success && data.needsVerification) {
    return {
      success: true,
      needsVerification: true,
      email: data.email || email.trim().toLowerCase(),
      message: data.message,
      emailSent: data.emailSent,
      devVerificationCode: data.devVerificationCode,
      devHint: data.devHint,
    }
  }
  if (data.success && data.user) {
    persistLoginToken(data)
    return { success: true, token: data.token || '', user: data.user }
  }
  return { success: false, error: data.error || 'Đăng ký thất bại', code: data.code }
}

export async function verifyRegistrationEmail(
  email: string,
  code: string
): Promise<AuthResponse> {
  const res = await authFetch(`${AUTH_BASE}/auth/register/verify-email`, {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
  const data = await res.json()
  if (data.success && data.user) {
    persistLoginToken(data)
    return { success: true, token: data.token, user: data.user }
  }
  return { success: false, error: data.error || 'Mã xác nhận không hợp lệ', code: data.code }
}

export async function resendRegistrationVerification(email: string): Promise<{
  success: boolean
  error?: string
  devVerificationCode?: string
  devHint?: string
}> {
  const res = await authFetch(`${AUTH_BASE}/auth/register/resend-verification`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  const data = await res.json()
  if (data.success) {
    return {
      success: true,
      devVerificationCode: data.devVerificationCode,
      devHint: data.devHint,
    }
  }
  return { success: false, error: data.error || 'Không gửi lại được mã' }
}

export async function fetchMe(): Promise<AuthResponse> {
  if (!usesCookieAuth() && !getToken()) {
    return { success: false, error: 'Not signed in' }
  }
  const res = await authFetch(`${AUTH_BASE}/auth/me`)
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

export async function loginWithFirebaseIdToken(idToken: string): Promise<AuthResponse> {
  const res = await authFetch(`${AUTH_BASE}/auth/firebase`, {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  })
  const data = await res.json()
  if (data.success && data.user) {
    persistLoginToken(data)
    return { success: true, token: data.token, user: data.user }
  }
  return { success: false, error: data.error || 'Đăng nhập Firebase thất bại' }
}

export async function updateProfile(data: { displayName?: string; avatar?: string }): Promise<AuthResponse> {
  if (!usesCookieAuth() && !getToken()) return { success: false, error: 'Not signed in' }
  const res = await authFetch(`${AUTH_BASE}/auth/me`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (json.success && json.user) return { success: true, user: json.user }
  return { success: false, error: json.error || 'Cập nhật thất bại' }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
  if (!usesCookieAuth() && !getToken()) return { success: false, error: 'Not signed in' }
  const res = await authFetch(`${AUTH_BASE}/auth/change-password`, {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  const json = await res.json()
  if (json.success) return { success: true }
  return { success: false, error: json.error || 'Đổi mật khẩu thất bại' }
}

export async function forgotPassword(email: string): Promise<{ success: boolean; error?: string; resetLink?: string }> {
  const res = await authFetch(`${AUTH_BASE}/auth/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  const data = await res.json()
  if (data.success) return { success: true, resetLink: data.resetLink }
  return { success: false, error: data.error || 'Gửi yêu cầu thất bại' }
}

export async function resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
  const res = await authFetch(`${AUTH_BASE}/auth/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })
  const data = await res.json()
  if (data.success) return { success: true }
  return { success: false, error: data.error || 'Đặt lại mật khẩu thất bại' }
}

export async function deactivateMyAccount(reason?: string): Promise<{ success: boolean; error?: string }> {
  if (!usesCookieAuth() && !getToken()) return { success: false, error: 'Not signed in' }
  const res = await authFetch(`${AUTH_BASE}/auth/me`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  })
  const data = await res.json()
  if (data.success) {
    await logout()
    return { success: true }
  }
  return { success: false, error: data.error || 'Ngừng hoạt động tài khoản thất bại' }
}
