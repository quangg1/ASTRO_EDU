import type { CSSProperties, ReactNode } from 'react'
import type {
  NarrativeBeat,
  NarrativeLiquidWater,
  NarrativeVolcanism,
} from '@/features/content3d/narrative/types'
import { EARTH_SEA_LEVEL_PRESSURE_PA } from '@/features/content3d/narrative/types'

export const WATER_VI: Record<NarrativeLiquidWater, string> = {
  none: 'Không / rất ít',
  rare: 'Rất hiếm',
  regional: 'Khu trú',
  widespread: 'Rộng (theo chứng cứ địa hình cổ)',
  unknown: 'Chưa rõ · đang tranh luận',
}

export const VOL_VI: Record<NarrativeVolcanism, string> = {
  low: 'Thấp',
  moderate: 'Trung bình',
  high: 'Cao',
  dominant: 'Thống trị bề mặt',
}

export const CONFIDENCE_VI = {
  consensus: 'Đồng thuận rộng',
  model: 'Mô hình / giả lập',
  hypothesis: 'Giả thuyết',
} as const

export function tempRange(beat: NarrativeBeat): string {
  const a = Math.round(beat.environment.surfaceTempMinC)
  const b = Math.round(beat.environment.surfaceTempMaxC)
  return `${a}…${b} °C`
}

export function formatPaVkPa(pa: number): string {
  const paR = Math.round(pa)
  const kPa = pa / 1000
  const kFmt = kPa.toLocaleString('vi-VN', { maximumFractionDigits: kPa >= 100 ? 1 : 3 })
  return `${paR.toLocaleString('vi-VN')} Pa (${kFmt} kPa)`
}

export function pctMnbc(pa: number): string {
  return ((pa / EARTH_SEA_LEVEL_PRESSURE_PA) * 100).toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 5,
  })
}

export function compactPressureLine(beat: NarrativeBeat): string {
  const rep = beat.environment.surfacePressureRepresentativePa
  const lo = beat.environment.surfacePressureLowPa
  const hi = beat.environment.surfacePressureHighPa
  if (beat.environment.surfacePressureBasis === 'measured_global_average') {
    return `Áp TB ~${Math.round(rep).toLocaleString('vi-VN')} Pa (~${pctMnbc(rep)}% MNBC Trái Đất).`
  }
  if (typeof lo === 'number' && typeof hi === 'number' && hi > lo) {
    return `Áp (mô hình): ~${Math.round(lo).toLocaleString('vi-VN')}–${Math.round(hi).toLocaleString('vi-VN')} Pa · đại diện ~${Math.round(rep).toLocaleString('vi-VN')} Pa.`
  }
  return `Áp đại diện ~${Math.round(rep).toLocaleString('vi-VN')} Pa (~${pctMnbc(rep)}% MNBC).`
}

export function StatRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-white/[0.06] py-2.5 last:border-0"
      style={{ borderColor: `${accent}18` }}
    >
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className="text-right text-[12px] font-medium tabular-nums text-slate-100">{value}</span>
    </div>
  )
}

export function SectionTitle({ children, accent }: { children: ReactNode; accent: string }) {
  return (
    <h3
      className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]"
      style={{ color: accent }}
    >
      {children}
    </h3>
  )
}

export function DetailShell({
  children,
  accent,
  className = '',
  style,
}: {
  children: ReactNode
  accent: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <aside
      className={`flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-black/55 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md ${className}`}
      style={{
        borderColor: `${accent}40`,
        boxShadow: `inset 3px 0 0 ${accent}`,
        ...style,
      }}
    >
      {children}
    </aside>
  )
}
