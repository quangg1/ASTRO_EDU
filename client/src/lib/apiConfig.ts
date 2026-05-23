import ENV from '@galaxies/shared/envNames'
import { devError } from '@/lib/devLog'
import { readEnv } from '@/lib/readEnv'
import { userMessages } from '@/lib/userMessages'

/**
 * URL backend từ biến môi trường — xem `shared/envNames.js` và `.env.local.example`.
 */
function trimEndSlash(s: string): string {
  return s.replace(/\/$/, '')
}

function normalizeUnifiedEnvBase(raw: string): string {
  let s = trimEndSlash(raw.trim())
  if (s.toLowerCase().endsWith('/api')) {
    s = trimEndSlash(s.slice(0, -'/api'.length))
  }
  return s
}

const UNIFIED_BASE =
  typeof process !== 'undefined'
    ? normalizeUnifiedEnvBase(readEnv(ENV.NEXT_PUBLIC_API_BASE_URL))
    : ''

function devProxyApiOrigin(): string {
  return trimEndSlash(readEnv(ENV.API_PROXY_TARGET))
}

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function isSameBrowserOriginAs(baseNoTrailingSlash: string): boolean {
  if (!isBrowser()) return false
  try {
    const u = new URL(baseNoTrailingSlash, window.location.origin)
    return u.origin === window.location.origin
  } catch {
    return false
  }
}

function looksLikeMisconfiguredNextDevApiOrigin(candidate: string): boolean {
  try {
    const u = new URL(candidate)
    if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return false
    const p = u.port === '' ? (u.protocol === 'https:' ? '443' : '80') : u.port
    return p === '3000'
  } catch {
    return false
  }
}

function resolveMisconfiguredUnifiedBaseForSSR(): string | null {
  if (process.env.NODE_ENV !== 'development') return null
  if (isBrowser()) return null
  if (UNIFIED_BASE && looksLikeMisconfiguredNextDevApiOrigin(UNIFIED_BASE)) {
    const proxy = devProxyApiOrigin()
    return proxy || null
  }
  return null
}

function resolveMisconfiguredLegacyForSSR(resolvedFullApiBase: string): string | null {
  if (process.env.NODE_ENV !== 'development') return null
  if (isBrowser()) return null
  try {
    const u = new URL(resolvedFullApiBase)
    const originLike = `${u.protocol}//${u.host}`
    if (looksLikeMisconfiguredNextDevApiOrigin(originLike)) {
      const proxy = devProxyApiOrigin()
      return proxy ? `${proxy}/api` : null
    }
  } catch {
    /* ignore */
  }
  return null
}

function missingApiBaseError(): never {
  devError('apiConfig', {
    hint: 'Set NEXT_PUBLIC_API_BASE_URL and/or API_PROXY_TARGET — see client/.env.local.example',
  })
  throw new Error(userMessages.loadDataFailed)
}

export function getApiBase(): string {
  return UNIFIED_BASE || ''
}

export function getAuthBase(): string {
  if (UNIFIED_BASE) {
    if (process.env.NODE_ENV === 'development' && isSameBrowserOriginAs(UNIFIED_BASE)) {
      return ''
    }
    const ssrRedirect = resolveMisconfiguredUnifiedBaseForSSR()
    if (ssrRedirect) return ssrRedirect
    return UNIFIED_BASE
  }
  const legacy = trimEndSlash(readEnv('NEXT_PUBLIC_AUTH_URL'))
  if (legacy) return legacy
  if (process.env.NODE_ENV === 'development' && isBrowser()) return ''
  const proxy = devProxyApiOrigin()
  if (proxy) return proxy
  missingApiBaseError()
}

export function getUnifiedBase(): string {
  if (UNIFIED_BASE) {
    if (process.env.NODE_ENV === 'development' && isSameBrowserOriginAs(UNIFIED_BASE)) {
      return ''
    }
    const ssrRedirect = resolveMisconfiguredUnifiedBaseForSSR()
    if (ssrRedirect) return ssrRedirect
    return UNIFIED_BASE
  }
  if (process.env.NODE_ENV === 'development' && isBrowser()) return ''
  const proxy = devProxyApiOrigin()
  if (proxy) return proxy
  missingApiBaseError()
}

function resolveLegacyApiUrl(): string | null {
  const courses = readEnv('NEXT_PUBLIC_COURSES_URL')
  const t = trimEndSlash(courses)
  if (t) return t

  const legacy = readEnv('NEXT_PUBLIC_API_URL')
  const l = trimEndSlash(legacy)
  if (!l) return null
  return l.endsWith('/api') ? l : `${l}/api`
}

export function getApiPathBase(): string {
  if (UNIFIED_BASE) {
    if (process.env.NODE_ENV === 'development' && isSameBrowserOriginAs(UNIFIED_BASE)) {
      return ''
    }
    const ssrRedirect = resolveMisconfiguredUnifiedBaseForSSR()
    if (ssrRedirect) return `${ssrRedirect}/api`
    return `${UNIFIED_BASE}/api`
  }
  const resolved = resolveLegacyApiUrl()
  if (resolved) {
    if (process.env.NODE_ENV === 'development' && isSameBrowserOriginAs(resolved.replace(/\/api\/?$/, ''))) {
      return ''
    }
    const ssrLegacy = resolveMisconfiguredLegacyForSSR(resolved)
    if (ssrLegacy) return ssrLegacy
    return resolved
  }
  if (process.env.NODE_ENV === 'development' && isBrowser()) {
    return ''
  }
  const proxy = devProxyApiOrigin()
  if (proxy) return `${proxy}/api`
  missingApiBaseError()
}

export function getEarthHistoryApiPathBase(): string {
  const dedicated = readEnv(ENV.NEXT_PUBLIC_EARTH_HISTORY_API_URL)
  const d = trimEndSlash(dedicated)
  if (d) return d.endsWith('/api') ? d : `${d}/api`
  return getApiPathBase()
}

export function getMediaBase(): string {
  if (UNIFIED_BASE) {
    if (process.env.NODE_ENV === 'development' && isSameBrowserOriginAs(UNIFIED_BASE)) {
      return ''
    }
    const ssrRedirect = resolveMisconfiguredUnifiedBaseForSSR()
    if (ssrRedirect) return ssrRedirect
    return UNIFIED_BASE
  }
  const legacy = trimEndSlash(readEnv('NEXT_PUBLIC_MEDIA_URL'))
  if (legacy) return legacy
  if (process.env.NODE_ENV === 'development' && isBrowser()) return ''
  const proxy = devProxyApiOrigin()
  if (proxy) return proxy
  missingApiBaseError()
}

export function getMediaCdnBase(): string {
  return readEnv(ENV.NEXT_PUBLIC_MEDIA_CDN)
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
