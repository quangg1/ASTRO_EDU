import type { SkyEphemerisBody } from '@/features/explore/lib/skyEphemeris'
import type { SkyExploreTarget } from '@/features/explore/public'
import {
  equatorialToSceneVector,
  type SkyObserver,
} from '@/features/explore/lib/skyObserver'
import {
  clampViewAltRad,
  SKY_VIEW_ALT_MAX,
  wrapViewAzRad,
  type SkyViewState,
} from './skyViewState'

type CatalogLabeled = {
  id: string
  dir: [number, number, number]
}

function catalogEntryTargetId(starId: string): string {
  if (starId.startsWith('hip-')) return `star-${starId}`
  if (starId.startsWith('star-')) return starId
  return starId
}

/** Đặt tâm màn hình hướng tới vector trên celestial sphere (không đổi FOV). */
export function skyViewStateFromSceneDirection(dir: [number, number, number]): SkyViewState {
  const y = Math.max(-1, Math.min(1, dir[1]))
  const altRad = Math.asin(y)
  const cosAlt = Math.cos(altRad)
  let azRad = 0
  if (Math.abs(cosAlt) > 1e-5) {
    azRad = Math.atan2(dir[0], -dir[2])
  }

  const viewAltRad =
    altRad >= 0
      ? clampViewAltRad(Math.min(SKY_VIEW_ALT_MAX, Math.max(0.32, altRad * 0.88)))
      : clampViewAltRad(altRad)

  return {
    viewAzRad: wrapViewAzRad(azRad),
    viewAltRad,
  }
}

export function resolveSkyTargetSceneDirection(
  targetId: string,
  ctx: {
    targets: SkyExploreTarget[]
    ephemerisBodies: SkyEphemerisBody[]
    catalogLabeled: CatalogLabeled[]
    observer: SkyObserver
  },
): [number, number, number] | null {
  const id = String(targetId || '').trim()
  if (!id) return null

  const fromTarget = ctx.targets.find((t) => t.id === id)
  if (fromTarget) {
    return equatorialToSceneVector(fromTarget.raDeg, fromTarget.decDeg, ctx.observer)
  }

  const body = ctx.ephemerisBodies.find((b) => b.id === id)
  if (body) {
    return equatorialToSceneVector(body.raDeg, body.decDeg, ctx.observer)
  }

  for (const star of ctx.catalogLabeled) {
    const mapped = catalogEntryTargetId(star.id)
    if (star.id === id || mapped === id) return star.dir
  }

  return null
}
