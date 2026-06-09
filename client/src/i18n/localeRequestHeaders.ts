import { getStoredLocale } from './localeStorage'
import type { Locale } from './types'

export function localeAcceptLanguage(locale?: Locale): string {
  const loc = locale ?? (typeof window !== 'undefined' ? getStoredLocale() : 'vi')
  return loc === 'en' ? 'en,vi;q=0.9' : 'vi,en;q=0.8'
}
