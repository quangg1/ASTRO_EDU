'use client'

import { useEffect, useState } from 'react'
import { NarrativeSiteCoverImage } from '@/features/content3d/narrative/ui/NarrativeSiteCoverImage'
import type { NarrativeSite, NarrativeBeat } from '@/features/content3d/narrative/types'
import { NarrativeCoverImageBadge, resolveNarrativeCoverImageType } from '@/features/content3d/narrative/ui/NarrativeCoverImageBadge'

const KIND_VI: Record<string, string> = {
  volcano: 'Núi lửa',
  canyon: 'Hẻm núi',
  crater: 'Miệng núi lửa / hố',
  plain: 'Đồng bằng / chaos',
  channel: 'Kênh / thung lũng',
  polar: 'Cực',
  landing: 'Điểm hạ cánh',
}

const KIND_ICON: Record<string, string> = {
  volcano: '🌋',
  canyon: '🏜️',
  crater: '🕳️',
  plain: '🪨',
  channel: '〰️',
  polar: '❄️',
  landing: '🛸',
}

const WATER_VI = {
  none: 'Không / rất ít',
  rare: 'Rất hiếm',
  regional: 'Khu trú',
  widespread: 'Rộng',
  unknown: 'Chưa rõ',
} as const

const VOL_VI = {
  low: 'Thấp',
  moderate: 'Trung bình',
  high: 'Cao',
  dominant: 'Thống trị',
} as const

type Props = {
  site: NarrativeSite
  beat: NarrativeBeat
  onClose: () => void
}

/** Một panel thống nhất: địa điểm + bối cảnh thời kỳ (collapsible). */
export function NarrativeSiteDetailSection({ site, beat, onClose }: Props) {
  const paleoStage = beat.environment.surfacePressureBasis !== 'measured_global_average'
  const imageType = resolveNarrativeCoverImageType(site, paleoStage)
  const accent = beat.accentColor || '#ea580c'
  const [stageOpen, setStageOpen] = useState(false)

  useEffect(() => {
    setStageOpen(false)
  }, [site.id])

  return (
    <section
      className="narrative-panel-enter flex min-h-0 flex-1 flex-col overflow-hidden"
      aria-labelledby="narrative-site-detail-title"
    >
      <div className="shrink-0 border-b border-amber-400/35 bg-gradient-to-b from-amber-950/50 via-amber-950/15 to-transparent px-3.5 pt-3 pb-3">
        <SiteHeader site={site} onClose={onClose} />

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-950/40 px-2 py-1 text-amber-100">
            <span aria-hidden>{KIND_ICON[site.kind]}</span>
            {KIND_VI[site.kind]}
          </span>
          <span className="font-mono tabular-nums text-amber-200/80">
            {site.lat.toFixed(2)}°, {site.lng.toFixed(2)}°
          </span>
        </div>

        {site.coverImageUrl ? (
          <div className="relative mt-3 overflow-hidden rounded-xl border border-amber-500/30 bg-black/50 shadow-lg">
            <NarrativeSiteCoverImage url={site.coverImageUrl} alt={site.nameVi} />
          </div>
        ) : null}

        <p className="mt-3 text-[13px] leading-snug text-slate-100/95">{site.blurbVi}</p>
        {imageType ? (
          <div className="mt-2.5">
            <NarrativeCoverImageBadge type={imageType} />
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3.5 py-2 [scrollbar-gutter:stable]">
        <button
          type="button"
          onClick={() => setStageOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/12 bg-black/20 px-3 py-2.5 text-left hover:bg-white/[0.04]"
          aria-expanded={stageOpen}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            Bối cảnh thời kỳ {stageOpen ? '▾' : '▸'}
          </span>
          <span className="truncate text-[11px] text-slate-400">
            {beat.icon} {beat.name}
          </span>
        </button>

        {stageOpen ? (
          <div
            className="mt-2 space-y-2.5 rounded-lg border px-3 py-3"
            style={{ borderColor: `${accent}44`, backgroundColor: `${accent}0c` }}
          >
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Đang xem trên timeline</p>
              <h3 className="mt-0.5 text-base font-semibold text-white">
                {beat.icon} {beat.name}
              </h3>
              <p className="text-[11px] text-slate-400">{beat.ageLabelVi}</p>
            </div>
            <p className="text-[12px] leading-snug text-slate-300">{compactPressureLine(beat)}</p>
            <div className="flex flex-wrap gap-2">
              <MiniBadge label="Núi lửa" value={VOL_VI[beat.environment.volcanism]} accent={accent} />
              <MiniBadge label="Nước lỏng" value={WATER_VI[beat.environment.liquidWater]} accent={accent} />
              <MiniBadge
                label="Nhiệt độ"
                value={`${Math.round(beat.environment.surfaceTempMinC)}…${Math.round(beat.environment.surfaceTempMaxC)} °C`}
                accent={accent}
              />
            </div>
            <p className="text-[12px] leading-relaxed text-ds-text/85">{beat.panel.descriptionVi}</p>
            <p className="text-[11px] italic text-ds-text/65">{beat.panel.compareNoteVi}</p>
          </div>
        ) : (
          <div
            className="mt-2 flex flex-wrap gap-2 rounded-lg border border-white/10 bg-black/15 px-3 py-2.5"
            style={{ borderColor: `${accent}33` }}
          >
            <span className="w-full text-[10px] text-slate-500">
              {beat.icon} {beat.name}
            </span>
            <MiniBadge label="Áp đại diện" value={pressureShort(beat)} accent={accent} />
            <MiniBadge label="Núi lửa" value={VOL_VI[beat.environment.volcanism]} accent={accent} />
          </div>
        )}

        <p className="mt-3 text-[10px] leading-snug text-slate-500">
          Địa điểm này được xem trong bối cảnh thời kỳ bạn đang chọn trên timeline — không phải hai báo cáo tách rời.
        </p>
      </div>
    </section>
  )
}

function SiteHeader({ site, onClose }: { site: NarrativeSite; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <h2 id="narrative-site-detail-title" className="text-lg font-semibold leading-tight text-white">
          {site.nameVi}
        </h2>
        {site.nameEn !== site.nameVi ? (
          <p className="mt-0.5 text-[10px] italic text-slate-500">{site.nameEn}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng chi tiết địa điểm"
        className="shrink-0 rounded-lg border border-amber-400/35 bg-amber-950/40 px-2.5 py-1 text-[11px] text-amber-100 hover:bg-amber-900/50"
      >
        ✕
      </button>
    </div>
  )
}

function MiniBadge({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="rounded-lg border px-2 py-1 text-[10px]"
      style={{ borderColor: `${accent}55`, backgroundColor: `${accent}14` }}
    >
      <div className="text-[8px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-medium text-ds-text">{value}</div>
    </div>
  )
}

function pressureShort(beat: NarrativeBeat): string {
  const rep = Math.round(beat.environment.surfacePressureRepresentativePa)
  if (beat.environment.surfacePressureBasis === 'measured_global_average') {
    return `~${rep.toLocaleString('vi-VN')} Pa`
  }
  return `~${rep.toLocaleString('vi-VN')} Pa (mô hình)`
}

function compactPressureLine(beat: NarrativeBeat): string {
  const rep = beat.environment.surfacePressureRepresentativePa
  const lo = beat.environment.surfacePressureLowPa
  const hi = beat.environment.surfacePressureHighPa
  if (beat.environment.surfacePressureBasis === 'measured_global_average') {
    return `Áp TB bề mặt ~${Math.round(rep).toLocaleString('vi-VN')} Pa (đo được / hiện đại).`
  }
  if (typeof lo === 'number' && typeof hi === 'number' && hi > lo) {
    return `Áp (mô hình): ~${Math.round(lo).toLocaleString('vi-VN')}–${Math.round(hi).toLocaleString('vi-VN')} Pa · đại diện ~${Math.round(rep).toLocaleString('vi-VN')} Pa.`
  }
  return `Áp đại diện ~${Math.round(rep).toLocaleString('vi-VN')} Pa.`
}
