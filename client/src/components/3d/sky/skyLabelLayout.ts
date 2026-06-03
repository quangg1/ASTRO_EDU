import { stereographicScreenPercent } from './skyScreenProject'
import type { SkyLabel } from './SkyLabelsOverlay'
import type { SkyViewState } from './skyViewState'

export type LabelCandidate = SkyLabel & {
  priority: number
  mag?: number
  altDeg?: number
}

type Box = { left: number; top: number; right: number; bottom: number }

function overlaps(a: Box, b: Box, pad = 0.4): boolean {
  return !(
    a.right + pad < b.left ||
    a.left - pad > b.right ||
    a.bottom + pad < b.top ||
    a.top - pad > b.bottom
  )
}

function labelBox(
  leftPct: number,
  topPct: number,
  w: number,
  h: number,
  above = true,
): Box {
  const half = w / 2
  const top = above ? topPct - h - 1 : topPct + 1
  return {
    left: leftPct - half,
    right: leftPct + half,
    top,
    bottom: top + h,
  }
}

/** Ngưỡng mag theo FOV — góc rộng chỉ nhãn vật thể lớn. */
export function maxLabelMagForFov(fovDeg: number, emphasis: SkyLabel['emphasis']): number {
  if (emphasis === 'body') return fovDeg >= 130 ? 2.5 : 4
  if (emphasis === 'constellation') return fovDeg >= 110 ? 99 : 99
  if (fovDeg >= 130) return 0.8
  if (fovDeg >= 105) return 1.6
  if (fovDeg >= 85) return 2.2
  return 3.2
}

export function layoutSkyLabels(
  candidates: LabelCandidate[],
  view: SkyViewState,
  fovDeg: number,
  aspect = 1,
  allowBelowHorizon = false,
): SkyLabel[] {
  const sorted = [...candidates].sort((a, b) => b.priority - a.priority)
  const placed: SkyLabel[] = []
  const boxes: Box[] = []

  for (const c of sorted) {
    if (c.altDeg != null && c.altDeg < 0 && !allowBelowHorizon) continue

    if (c.selected) {
      const p = stereographicScreenPercent(c.dir, view, fovDeg, aspect)
      if (!p) continue
      placed.push({ ...c, altDeg: c.altDeg })
      boxes.push(labelBox(p.leftPct, p.topPct, 14, 4, true))
      continue
    }

    const maxMag = maxLabelMagForFov(fovDeg, c.emphasis)
    if (c.mag != null && c.mag > maxMag && c.emphasis !== 'constellation') continue
    if (c.altDeg != null && c.altDeg < 8 && c.emphasis !== 'body') continue

    const p = stereographicScreenPercent(c.dir, view, fovDeg, aspect)
    if (!p) continue

    const w = c.emphasis === 'body' ? 11 : c.text.length > 8 ? 13 : 9
    const h = 3.2
    const box = labelBox(p.leftPct, p.topPct, w, h, true)
    if (boxes.some((b) => overlaps(box, b))) continue

    boxes.push(box)
    placed.push({
      id: c.id,
      text: c.text,
      dir: c.dir,
      emphasis: c.emphasis,
      selected: false,
      altDeg: c.altDeg,
    })
  }

  return placed
}
