/**
 * Unified API (`services/api`): set `NEXT_PUBLIC_API_BASE_URL` to the API root
 * (no trailing slash), e.g. `http://localhost:3002`.
 * Client calls use `${base}/api/...` for REST and `${base}/auth/...` for auth.
 */
function trimEndSlash(s: string): string {
  return s.replace(/\/$/, '')
}

const UNIFIED_BASE =
  typeof process !== 'undefined' ? trimEndSlash((process.env.NEXT_PUBLIC_API_BASE_URL || '').trim()) : ''

export function getApiBase(): string {
  return UNIFIED_BASE || ''
}

/** Base URL for auth routes: `/auth/*` */
export function getAuthBase(): string {
  if (UNIFIED_BASE) return UNIFIED_BASE
  return trimEndSlash((process.env.NEXT_PUBLIC_AUTH_URL || '').trim()) || 'http://localhost:3002'
}

/** API host root without `/api` — same as `NEXT_PUBLIC_API_BASE_URL` or sensible default. */
export function getUnifiedBase(): string {
  return UNIFIED_BASE || 'http://localhost:3002'
}

function resolveLegacyApiUrl(): string | null {
  const courses = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_COURSES_URL : '') || ''
  const t = trimEndSlash(courses.trim())
  if (t) return t

  const legacy = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : '') || ''
  const l = trimEndSlash(legacy.trim())
  if (!l) return null
  return l.endsWith('/api') ? l : `${l}/api`
}

/**
 * Base URL for `/api/...` routes (includes `/api` suffix).
 * Prefer `NEXT_PUBLIC_API_BASE_URL`; else `NEXT_PUBLIC_COURSES_URL` or `NEXT_PUBLIC_API_URL`.
 */
export function getApiPathBase(): string {
  if (UNIFIED_BASE) return `${UNIFIED_BASE}/api`
  const resolved = resolveLegacyApiUrl()
  if (resolved) return resolved
  return 'http://localhost:3002/api'
}

/**
 * Fossils / phyla / earth-history JSON under the same unified `/api` prefix.
 * Optional `NEXT_PUBLIC_EARTH_HISTORY_API_URL` if those routes are hosted elsewhere
 * (must be the `/api` prefix or full origin that should receive `/fossils`, `/phyla`, `/earth-history`).
 */
export function getEarthHistoryApiPathBase(): string {
  const dedicated =
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_EARTH_HISTORY_API_URL : '') || ''
  const d = trimEndSlash(dedicated.trim())
  if (d) return d.endsWith('/api') ? d : `${d}/api`
  return getApiPathBase()
}

/** Base URL for media: `/upload`, `/files` (served by unified API). */
export function getMediaBase(): string {
  return UNIFIED_BASE || trimEndSlash((process.env.NEXT_PUBLIC_MEDIA_URL || '').trim()) || 'http://localhost:3002'
}

/** CDN root for static assets (models, textures). No trailing slash. */
export function getMediaCdnBase(): string {
  return (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MEDIA_CDN) || ''
}

export function getStaticAssetUrl(path: string): string {
  if (!path) return path
  const base = getMediaCdnBase()
  return base ? base.replace(/\/$/, '') + path : path
}

export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/files/')) return getMediaBase() + url
  return getStaticAssetUrl(url)
}
