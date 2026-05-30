import ENV from '@galaxies/shared/envNames'
import type { GalaxiesPublicRuntimeConfig } from '@/lib/runtimePublicConfig'

function trimEndSlash(s: string): string {
  return s.replace(/\/$/, '')
}

function normalizeApiBase(raw: string): string {
  let s = trimEndSlash(raw.trim())
  if (!s) return ''
  if (s.toLowerCase().endsWith('/api')) {
    s = trimEndSlash(s.slice(0, -'/api'.length))
  }
  return s
}

/** Server-only: read env at request time (Render runtime), not only build-time inlining. */
function buildRuntimePublicConfig(): GalaxiesPublicRuntimeConfig {
  const fromApi = trimEndSlash(process.env[ENV.NEXT_PUBLIC_API_BASE_URL] ?? '')
  const fromMedia = trimEndSlash(process.env[ENV.MEDIA_SERVICE_URL] ?? '')
  const apiBase = normalizeApiBase(fromApi || fromMedia)
  const mediaCdn = trimEndSlash(process.env[ENV.NEXT_PUBLIC_MEDIA_CDN] ?? '')
  return { apiBase, mediaCdn }
}

/**
 * Inline script must run before client chunks that call getApiPathBase() at import time.
 */
export function RuntimePublicConfigScript() {
  const payload = JSON.stringify(buildRuntimePublicConfig()).replace(/</g, '\\u003c')
  return (
    <script
      id="galaxies-public-config"
      dangerouslySetInnerHTML={{
        __html: `window.__GALAXIES_PUBLIC_CONFIG__=${payload};`,
      }}
    />
  )
}
