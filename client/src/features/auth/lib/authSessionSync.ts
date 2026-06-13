import { usesCookieAuth } from '@/lib/apiRequestInit'
import { clearToken, fetchMe, type AuthUser } from '../api/authApi'
import { useAuthStore } from '../stores/useAuthStore'

export const SESSION_COOKIE_FAILED_MSG =
  'Phiên đăng nhập không lưu được trên trình duyệt (cookie). Hãy đăng xuất, xóa cookie site cũ, đăng nhập lại — hoặc báo admin kiểm tra CLIENT_URL trên API.'

export const SESSION_EXPIRED_MSG = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'

/** Map lỗi API auth sang copy tiếng Việt — tránh hiện raw «Thiếu token». */
export function mapAuthApiError(raw: string | undefined | null): string {
  const s = String(raw || '').trim()
  if (!s) return SESSION_EXPIRED_MSG
  if (/thiếu token|missing token|token không hợp lệ|session expired|not signed in/i.test(s)) {
    return SESSION_EXPIRED_MSG
  }
  return s
}

let unauthorizedHandledAt = 0

/** 401 từ API — xóa user client (cookie HttpOnly do server clear khi cần). */
export function handleAuthUnauthorized(): void {
  if (typeof window === 'undefined') return
  const now = Date.now()
  if (now - unauthorizedHandledAt < 1500) return
  unauthorizedHandledAt = now
  clearToken()
  useAuthStore.getState().setUser(null)
  window.dispatchEvent(new CustomEvent('galaxies-auth-signed-out'))
}

/**
 * Web cookie auth: sau login/register phải gọi /auth/me — nếu fail thì cookie không gắn (CORS/CLIENT_URL).
 */
export async function verifyCookieSessionAfterAuth(fallbackUser?: AuthUser | null): Promise<{
  ok: boolean
  user: AuthUser | null
  error?: string
}> {
  if (!usesCookieAuth()) {
    return { ok: Boolean(fallbackUser), user: fallbackUser ?? null }
  }
  const me = await fetchMe()
  if (me.success && me.user) {
    return { ok: true, user: me.user }
  }
  handleAuthUnauthorized()
  return {
    ok: false,
    user: null,
    error: me.error ? mapAuthApiError(me.error) : SESSION_COOKIE_FAILED_MSG,
  }
}

export function isUnauthorizedResponse(status: number, error?: string | null): boolean {
  if (status === 401) return true
  return /thiếu token|missing token|token không hợp lệ/i.test(String(error || ''))
}
