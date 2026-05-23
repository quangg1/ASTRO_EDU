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
