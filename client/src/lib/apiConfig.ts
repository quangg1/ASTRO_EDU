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

/** Base URL for media: /upload, /files */
export function getMediaBase(): string {
  return UNIFIED_BASE || process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:3002'
}
