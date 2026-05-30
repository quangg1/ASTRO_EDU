import { getStaticAssetUrl, resolveMediaUrl } from '@/lib/apiConfig'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'

/** Diffuse/normal/spec/model URLs accepted from CMS — CDN, uploads, hoặc static trong `public`. */
export function isResolvableShowcaseAssetUrl(raw: string | undefined | null): boolean {
  const u = String(raw || '').trim()
  if (!u || u.includes('..')) return false
  if (/^https?:\/\//i.test(u)) return true
  return (
    u.startsWith('/files/') ||
    u.startsWith('/textures/') ||
    u.startsWith('/models/') ||
    u.startsWith('/images/') ||
    u.startsWith('/course-media/')
  )
}

/** Cùng URL diffuse mà `ShowcaseDiffuseGlobe` load — remote CMS ưu tiên, rồi `texturePath` static/CDN. */
export function resolveShowcaseDiffuseTextureUrl(entity: ShowcaseOrbitEntity): string | null {
  const remoteD = String(entity.remoteTextureUrl || '').trim()
  if (remoteD) {
    const resolved = resolveMediaUrl(remoteD)
    return resolved || null
  }
  const path = String(entity.texturePath || '').trim()
  if (path) {
    const resolved = getStaticAssetUrl(path)
    return resolved || null
  }
  return null
}

function hasShowcaseMapSlot(raw: string | undefined | null): boolean {
  const u = String(raw || '').trim()
  return isResolvableShowcaseAssetUrl(u)
}

/** So sánh URL media sau khi resolve (bỏ query) — tránh load cloud trùng diffuse. */
export function showcaseMediaUrlsEquivalent(a: string | undefined | null, b: string | undefined | null): boolean {
  const ra = String(a || '').trim()
  const rb = String(b || '').trim()
  if (!ra || !rb) return false
  const ka = (resolveMediaUrl(ra) || ra).split('?')[0].toLowerCase()
  const kb = (resolveMediaUrl(rb) || rb).split('?')[0].toLowerCase()
  return ka === kb
}

/**
 * Cloud chỉ dùng khi là lớp alpha riêng (vd. mây Trái Đất).
 * Trùng diffuse (hay gặp ở moon) → bỏ qua — tránh che nửa sphere trong preview/Explore.
 */
export function isUsableShowcaseCloudMapUrl(
  cloudRaw: string | undefined | null,
  diffuseRaw: string | undefined | null,
): boolean {
  const cloud = String(cloudRaw || '').trim()
  if (!isResolvableShowcaseAssetUrl(cloud)) return false
  const diffuse = String(diffuseRaw || '').trim()
  if (diffuse && showcaseMediaUrlsEquivalent(cloud, diffuse)) return false
  return true
}

/**
 * `Planet` trong Explore dùng ShowcaseDiffuseGlobe khi có diffuse từ Studio/catalog
 * (không chỉ `remoteTextureUrl` — `texturePath` catalog cũng tính).
 */
export function planetUsesShowcaseCmsTextures(e: ShowcaseOrbitEntity | null | undefined): boolean {
  if (!e) return false
  if (hasShowcaseMapSlot(e.remoteTextureUrl) || hasShowcaseMapSlot(e.texturePath)) return true
  return Boolean(
    hasShowcaseMapSlot(e.remoteNormalMapUrl) ||
      hasShowcaseMapSlot(e.remoteSpecularMapUrl) ||
      hasShowcaseMapSlot(e.remoteCloudMapUrl) ||
      hasShowcaseMapSlot(e.remoteModelUrl) ||
      String(e.modelPath || '').trim().length > 1,
  )
}
