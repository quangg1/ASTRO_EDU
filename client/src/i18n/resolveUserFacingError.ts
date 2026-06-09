import { getStoredLocale } from './localeStorage'
import { translate, translateApiError } from './translate'

export function resolveUserFacingError(
  code?: string | null,
  serverMessage?: string | null,
): string | undefined {
  const locale = getStoredLocale()
  return translateApiError(locale, code, serverMessage) ?? (serverMessage?.trim() || undefined)
}

export function mapApiErrorMessage(code?: string | null, serverMessage?: string | null): string {
  return resolveUserFacingError(code, serverMessage) ?? translate(getStoredLocale(), 'errors.genericError')
}
