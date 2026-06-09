import type { Locale } from './types'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from './types'

const LOCALE_COOKIE = 'galaxies_locale'

export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (raw === 'en' || raw === 'vi') return raw
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`
  } catch {
    /* ignore */
  }
}
