/**
 * When using the merged API (services/api), set NEXT_PUBLIC_API_BASE_URL
 * to the API root (e.g. http://localhost:3002). All auth, courses, payment,
 * community, media requests will use this base.
 */
const UNIFIED_BASE = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_BASE_URL : ''

export function getApiBase(): string {
  return UNIFIED_BASE || ''
}

/** Base URL for auth routes: /auth/* */
export function getAuthBase(): string {
  return UNIFIED_BASE || process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3002'
}

/** Base URL gốc (không /api). */
export function getUnifiedBase(): string {
  return UNIFIED_BASE || 'http://localhost:3002'
}

/** Base URL for API routes (/api/...). Mặc định 3002 (API gộp) khi không set. */
export function getApiPathBase(): string {
  if (UNIFIED_BASE) return `${UNIFIED_BASE}/api`
  return process.env.NEXT_PUBLIC_COURSES_URL || 'http://localhost:3002/api'
}

/** Base URL for media: /upload, /files (API-served uploads) */
export function getMediaBase(): string {
  return UNIFIED_BASE || process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:3002'
}

/** Base URL for static assets on CDN (models, textures, images, course-media). No trailing slash. */
export function getMediaCdnBase(): string {
  return (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MEDIA_CDN) || ''
}

/**
 * Resolve static asset path to full URL when CDN is set.
 * Use for /models/, /textures/, /images/, /course-media/.
 * @param path - e.g. "/models/foo.glb" or "/textures/paleo/paleo_000.jpg"
 */
export function getStaticAssetUrl(path: string): string {
  if (!path) return path
  const base = getMediaCdnBase()
  return base ? base.replace(/\/$/, '') + path : path
}

/**
 * Resolve any media URL for display: full URL → as-is; /files/* → API base; else → static CDN.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/files/')) return getMediaBase() + url
  return getStaticAssetUrl(url)
}
