import type { SkyViewState } from './skyViewState'
import { stereographicScreenPercent } from './skyScreenProject'
import { SKY_FOV_DEG } from './skyVisuals'

export type SkyPickCandidate = {
  id: string
  dir: [number, number, number]
  /** Bán kính hit-test trên màn hình (% đường kính đĩa). */
  hitRadiusPct?: number
}

/**
 * Chọn đối tượng gần điểm click nhất trên đĩa fisheye.
 */
export function pickNearestSkyObject(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  view: SkyViewState,
  candidates: SkyPickCandidate[],
  fovDeg = SKY_FOV_DEG,
): string | null {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const halfW = rect.width / 2
  const halfH = rect.height / 2
  const aspect = halfW / halfH
  const clipX = (clientX - cx) / halfW
  const clipY = (clientY - cy) / halfH
  const px = clipX * aspect
  const py = clipY
  if (px * px + py * py > 1) return null

  const clickLeftPct = 50 + clipX * 50
  const clickTopPct = 50 + clipY * 50

  let bestId: string | null = null
  let bestDist = Infinity

  for (const c of candidates) {
    const p = stereographicScreenPercent(c.dir, view, fovDeg, aspect)
    if (!p) continue
    const dx = p.leftPct - clickLeftPct
    const dy = p.topPct - clickTopPct
    const dist = Math.hypot(dx, dy)
    const hit = c.hitRadiusPct ?? (c.id.startsWith('planet-') ? 3.2 : 2.4)
    if (dist <= hit && dist < bestDist) {
      bestDist = dist
      bestId = c.id
    }
  }

  return bestId
}
