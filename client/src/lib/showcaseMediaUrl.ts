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

/** CMS diffuse/normal/spec/cloud — `Planet` trong ShowcaseScene dùng ShowcaseDiffuseGlobe (orbit layer vẫn bỏ qua mesh planet-*). */
export function planetUsesShowcaseCmsTextures(e: ShowcaseOrbitEntity | null | undefined): boolean {
  if (!e) return false
  const s = (x: unknown) => String(x || '').trim()
  return Boolean(
    s(e.remoteTextureUrl) ||
      s(e.remoteNormalMapUrl) ||
      s(e.remoteSpecularMapUrl) ||
      s(e.remoteCloudMapUrl),
  )
}
