'use client'

import { clsx } from 'clsx'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/stores/planetNarrativeStore'
import {
  CONFIDENCE_VI,
  DetailShell,
  SectionTitle,
  StatRow,
  tempRange,
  VOL_VI,
  WATER_VI,
} from '@/features/content3d/narrative/ui/narrativeDetailShared'

export function NarrativeBeatDetailLeft({ entityLabel }: { entityLabel: string }) {
  const beat = usePlanetNarrativeStore((s) => s.currentBeat)
  const showInfoPanel = usePlanetNarrativeStore((s) => s.showInfoPanel)
  const accent = beat.accentColor || '#ea580c'

  if (!showInfoPanel) return null

  const geoLabel = [beat.environment.eon, beat.environment.era, beat.environment.period]
    .filter(Boolean)
    .join(' · ')

  return (
    <DetailShell accent={accent}>
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>
          Deep History · Telemetry
        </p>
        <div className="mt-2 flex items-start gap-3">
          <span className="text-3xl leading-none">{beat.icon}</span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{entityLabel}</p>
            <h2 className="truncate text-lg font-semibold text-white">{beat.name}</h2>
            <p className="text-[11px] text-slate-400">{beat.ageLabelVi}</p>
          </div>
        </div>
        <span
          className={clsx(
            'mt-2 inline-block rounded px-2 py-0.5 text-[9px]',
            beat.environment.confidence === 'consensus'
              ? 'bg-emerald-500/20 text-emerald-200'
              : beat.environment.confidence === 'model'
                ? 'bg-amber-500/20 text-amber-100'
                : 'bg-violet-500/20 text-violet-100',
          )}
        >
          {CONFIDENCE_VI[beat.environment.confidence]}
        </span>
      </div>

      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-3 [scrollbar-gutter:stable]">
        <SectionTitle accent={accent}>Điều kiện bề mặt</SectionTitle>
        <StatRow label="Nhiệt độ bề mặt" value={tempRange(beat)} accent={accent} />
        <StatRow label="Nước lỏng" value={WATER_VI[beat.environment.liquidWater]} accent={accent} />
        <StatRow label="Hoạt động núi lửa" value={VOL_VI[beat.environment.volcanism]} accent={accent} />
        {beat.environment.dustActivity != null ? (
          <StatRow label="Bão bụi" value={`Mức ${beat.environment.dustActivity}/3`} accent={accent} />
        ) : null}
        {beat.environment.dayLengthHours != null ? (
          <StatRow
            label="Một ngày"
            value={`${beat.environment.dayLengthHours.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giờ`}
            accent={accent}
          />
        ) : null}

        {geoLabel ? (
          <>
            <SectionTitle accent={accent}>Phân vị địa chất</SectionTitle>
            <p className="text-[12px] leading-snug text-slate-300">{geoLabel}</p>
          </>
        ) : null}

        <SectionTitle accent={accent}>Tóm tắt giai đoạn</SectionTitle>
        <p className="text-[12px] leading-relaxed text-slate-300">{beat.panel.descriptionVi}</p>
        {beat.panel.compareNoteVi ? (
          <p className="mt-2 text-[11px] italic leading-snug text-slate-500">{beat.panel.compareNoteVi}</p>
        ) : null}
      </div>
    </DetailShell>
  )
}
