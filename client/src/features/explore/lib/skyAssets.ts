/**
 * Static sky assets — paths under `client/public/sky/` (synced to CDN prefix `/sky/`).
 * Resolve with `getSkyAssetUrl()` → `getStaticAssetUrl()` when `NEXT_PUBLIC_MEDIA_CDN` is set.
 * See `public/sky/README.md` and `docs/MEDIA_CLOUD.md`.
 */
import { getStaticAssetUrl } from '@/lib/apiConfig'

export const SKY_ASSET_PREFIX = '/sky' as const

/** Stellarium pack: `bahia_de_cadiz/` — spherical PNG + transparent sky. */
export const SKY_BAHIA_CADIZ_LANDSCAPE_PATH = '/sky/bahia_de_cadiz/bahia.png' as const

export const SKY_MILKYWAY_PATHS = [
  '/sky/milkyway.png',
  '/sky/milkyway.webp',
  '/sky/milkyway.jpg',
] as const

export const SKY_HIP_BRIGHT_PATH = '/sky/data/hip-bright.json' as const

export const SKY_WESTERN_INDEX_PATH = '/sky/western_sky_culture/index.json' as const

export const SKY_WESTERN_CULTURE_BASE_PATH = '/sky/western_sky_culture/' as const

export const SKY_LANDSCAPE_HINT =
  'Đặt panorama 360° (2:1) tại client/public/sky/landscape.webp — sync `sky/` lên CDN; xem public/sky/README.md'

/** Path `/sky/...` → CDN hoặc same-origin `public/sky` khi dev không set CDN. */
export function getSkyAssetUrl(path: string): string {
  const raw = String(path || '').trim()
  if (!raw) return raw
  if (/^https?:\/\//i.test(raw)) return raw
  const normalized = raw.startsWith('/') ? raw : `${SKY_ASSET_PREFIX}/${raw.replace(/^\//, '')}`
  return getStaticAssetUrl(normalized)
}

export function getSkyLandscapeUrls(): string[] {
  return [getSkyAssetUrl(SKY_BAHIA_CADIZ_LANDSCAPE_PATH)]
}

export function getSkyMilkywayUrls(): string[] {
  return SKY_MILKYWAY_PATHS.map((p) => getSkyAssetUrl(p))
}

export function getSkyHipBrightUrl(): string {
  return getSkyAssetUrl(SKY_HIP_BRIGHT_PATH)
}

export function getSkyWesternIndexUrl(): string {
  return getSkyAssetUrl(SKY_WESTERN_INDEX_PATH)
}

/** `illustrations/orion.webp` → full URL for panel / `<img>`. */
export function getSkyWesternIllustrationUrl(file: string | undefined): string | undefined {
  if (!file?.trim()) return undefined
  const name = file.split('/').pop() ?? file
  return getSkyAssetUrl(`${SKY_WESTERN_CULTURE_BASE_PATH}${name}`)
}
