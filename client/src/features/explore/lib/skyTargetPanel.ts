import type { SkyExploreTarget } from './exploreTargets'
import { getSkyAssetUrl, getSkyWesternIllustrationUrl } from './skyAssets'

/** Ảnh minh họa chòm — từ target hoặc slug IAU western skyculture. */
export function resolveSkyTargetIllustrationUrl(
  target: SkyExploreTarget | null,
): string | null {
  if (!target) return null
  if (target.illustrationUrl) {
    const u = target.illustrationUrl
    if (u.startsWith('/sky/')) return getSkyAssetUrl(u)
    return u
  }
  if (target.kind !== 'constellation') return null
  const slug = target.id.replace(/^constellation-western-/, '')
  if (!slug) return null
  return getSkyWesternIllustrationUrl(`${slug}.webp`) ?? null
}

export function skyTargetStarStats(target: SkyExploreTarget | null): {
  starCount: number
  brightestMag: number | null
  lineCount: number
} {
  const nodes = target?.starNodes ?? []
  const mags = nodes.map((n) => n.mag).filter(Number.isFinite)
  return {
    starCount: nodes.length,
    brightestMag: mags.length ? Math.min(...mags) : null,
    lineCount: target?.edges?.length ?? 0,
  }
}

export function skyTargetSubtitle(target: SkyExploreTarget | null): string {
  if (!target) return ''
  if (target.kind === 'body') {
    return target.nameEn ?? 'Thiên thể hệ Mặt Trời'
  }
  const en = target.nameEn?.trim()
  const iau = target.iauCode?.trim()
  if (en && iau) return `${en} · IAU ${iau}`
  if (en) return en
  if (iau) return `IAU ${iau}`
  return 'Chòm sao phương Tây (IAU 88)'
}
