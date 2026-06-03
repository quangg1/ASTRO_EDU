'use client'

import { stereographicScreenPercent } from './skyScreenProject'
import type { SkyViewState } from './skyViewState'
import { SKY_FOV_DEFAULT_DEG } from './skyVisuals'

type Props = {
  dir: [number, number, number] | null
  view: SkyViewState
  fovDeg?: number
  aspect?: number
  /** Đường kính vòng (% chiều rộng viewport). */
  sizePct?: number
}

export function SkySelectionRingOverlay({
  dir,
  view,
  fovDeg = SKY_FOV_DEFAULT_DEG,
  aspect = 1,
  sizePct = 5.5,
}: Props) {
  if (!dir) return null
  const p = stereographicScreenPercent(dir, view, fovDeg, aspect)
  if (!p) return null

  return (
    <div
      className="pointer-events-none absolute z-40"
      style={{
        left: `${p.leftPct}%`,
        top: `${p.topPct}%`,
        width: `${sizePct}%`,
        height: `${sizePct}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="absolute inset-0 rounded-full border-2 border-cyan-300/95 shadow-[0_0_10px_rgba(34,211,238,0.65)]" />
      <div
        className="absolute inset-0 animate-ping rounded-full border border-cyan-400/50"
        style={{ animationDuration: '2.2s' }}
      />
    </div>
  )
}
