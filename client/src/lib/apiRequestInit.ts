import { getToken } from '@/features/auth/public'
import { isNativeApp } from '@/lib/hybrid/mobileNative'
import { localeAcceptLanguage } from '@/i18n/localeRequestHeaders'

/** Web: HttpOnly cookie. Native app: Bearer từ secure storage. */
export function usesCookieAuth(): boolean {
  if (typeof window === 'undefined') return true
  return !isNativeApp()
}

export function apiClientHeaders(json = true): HeadersInit {
  const headers: Record<string, string> = {
    'Accept-Language': localeAcceptLanguage(),
  }
  if (json) headers['Content-Type'] = 'application/json'
  if (!usesCookieAuth()) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

/** Gộp credentials + auth headers cho mọi fetch tới unified API. */
export function apiRequestInit(init?: RequestInit, json = true): RequestInit {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
  const isBlob = typeof Blob !== 'undefined' && init?.body instanceof Blob
  const useJson = json && !isFormData && !isBlob
  const base = apiClientHeaders(useJson) as Record<string, string>
  const extra = init?.headers
  const merged: Record<string, string> = { ...base }
  if (extra instanceof Headers) {
    extra.forEach((value, key) => {
      merged[key] = value
    })
  } else if (extra && typeof extra === 'object') {
    Object.assign(merged, extra as Record<string, string>)
  }
  if (isFormData || isBlob) {
    delete merged['Content-Type']
  }
  return {
    cache: 'no-store',
    credentials: usesCookieAuth() ? 'include' : 'omit',
    ...init,
    headers: merged,
  }
}

/** fetch() với cookie (web) hoặc Bearer (native). */
export function apiFetch(url: string, init?: RequestInit, json = true): Promise<Response> {
  return fetch(url, apiRequestInit(init, json))
}
