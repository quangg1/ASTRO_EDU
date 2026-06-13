import { getToken } from '@/features/auth/public'
import { isNativeApp } from '@/lib/hybrid/mobileNative'
import { localeAcceptLanguage } from '@/i18n/localeRequestHeaders'
import { apiRequestInit } from '@/lib/apiRequestInit'

export { apiFetch, apiRequestInit, usesCookieAuth } from '@/lib/apiRequestInit'

/** @deprecated Prefer apiFetch / apiRequestInit — chỉ trả headers, không gồm credentials. */
export function apiClientHeaders(json = true): HeadersInit {
  const headers: Record<string, string> = {
    'Accept-Language': localeAcceptLanguage(),
  }
  if (json) headers['Content-Type'] = 'application/json'
  if (typeof window !== 'undefined' && isNativeApp()) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

/** Gộp headers + credentials cho fetch tới unified API. */
export function apiFetchInit(init?: RequestInit, json = true): RequestInit {
  return apiRequestInit(init, json)
}
