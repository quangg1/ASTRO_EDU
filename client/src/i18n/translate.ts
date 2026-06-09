import type { Locale, MessageTree } from './types'
import { enMessages } from './locales/en'
import { viMessages } from './locales/vi'

const CATALOG: Record<Locale, MessageTree> = {
  vi: viMessages,
  en: enMessages,
}

function getByPath(tree: MessageTree, path: string): string | undefined {
  const parts = path.split('.')
  let cur: string | MessageTree = tree
  for (const part of parts) {
    if (typeof cur !== 'object' || cur == null || !(part in cur)) return undefined
    cur = cur[part]
  }
  return typeof cur === 'string' ? cur : undefined
}

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key]
    return v == null ? `{${key}}` : String(v)
  })
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
  fallback?: string,
): string {
  const primary = getByPath(CATALOG[locale], key)
  if (primary) return interpolate(primary, vars)
  if (locale !== 'vi') {
    const viFallback = getByPath(CATALOG.vi, key)
    if (viFallback) return interpolate(viFallback, vars)
  }
  return fallback ?? key
}

export function translateApiError(
  locale: Locale,
  code: string | null | undefined,
  serverMessage?: string | null,
): string | undefined {
  if (!code) return serverMessage?.trim() || undefined
  const key = `errors.${code}`
  const mapped = getByPath(CATALOG[locale], key)
  if (mapped) return mapped
  return serverMessage?.trim() || undefined
}
