'use client'

import { stereographicScreenPercent } from './skyScreenProject'
import type { SkyViewState } from './skyViewState'
import { SKY_FOV_DEFAULT_DEG } from './skyVisuals'

export type SkyLabel = {
  id: string
  text: string
  dir: [number, number, number]
  emphasis?: 'star' | 'body' | 'cardinal' | 'constellation'
  selected?: boolean
  /** Độ cao thực (°) — ẩn nhãn khi alt < 0. */
  altDeg?: number
}

type Props = {
  labels: SkyLabel[]
  view: SkyViewState
  fovDeg?: number
  /** width / height — khớp đĩa stereographic trên canvas. */
  aspect?: number
  /** Khi landscape mờ — cho nhãn sao dưới chân trời. */
  allowBelowHorizon?: boolean
}

export function SkyLabelsOverlay({
  labels,
  view,
  fovDeg = SKY_FOV_DEFAULT_DEG,
  aspect = 1,
  allowBelowHorizon = false,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {labels.map((lb) => {
        if (lb.altDeg != null && lb.altDeg < 0 && !allowBelowHorizon) return null
        const p = stereographicScreenPercent(lb.dir, view, fovDeg, aspect)
        if (!p) return null
        const selected = lb.selected ?? lb.emphasis !== 'cardinal'
        const nearHorizon =
          lb.altDeg != null && lb.altDeg >= 0 && lb.altDeg < 12
        const belowFade =
          lb.altDeg != null && lb.altDeg < 0
            ? Math.max(0.22, 1 + lb.altDeg / 28)
            : 1
        const fade =
          (nearHorizon && lb.altDeg != null
            ? Math.max(0.15, lb.altDeg / 12)
            : 1) * belowFade
        return (
          <span
            key={lb.id}
            className={
              lb.emphasis === 'cardinal'
                ? 'absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-bold tracking-wide text-red-500 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]'
                : selected
                  ? 'absolute -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold tracking-tight text-amber-50 drop-shadow-[0_1px_4px_rgba(0,0,0,1)]'
                  : 'absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-white/90'
            }
            style={{
              left: `${p.leftPct}%`,
              top: `${p.topPct}%`,
              opacity: fade,
              zIndex: nearHorizon ? 5 : 20,
              transform:
                lb.emphasis === 'cardinal'
                  ? 'translate(-50%, -50%)'
                  : `translate(-50%, calc(-100% - ${selected ? 6 : 4}px))`,
            }}
          >
            {lb.text}
          </span>
        )
      })}
    </div>
  )
}
