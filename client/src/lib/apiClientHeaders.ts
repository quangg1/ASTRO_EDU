import { getToken } from '@/features/auth/public'
import { localeAcceptLanguage } from '@/i18n/localeRequestHeaders'

export function apiClientHeaders(json = true): HeadersInit {
  const headers: Record<string, string> = {
    'Accept-Language': localeAcceptLanguage(),
  }
  if (json) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}
