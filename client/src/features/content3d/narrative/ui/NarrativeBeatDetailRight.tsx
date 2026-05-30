'use client'

import { clsx } from 'clsx'
import { EARTH_SEA_LEVEL_PRESSURE_PA } from '@/features/content3d/narrative/types'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/stores/planetNarrativeStore'
import { NarrativeSiteDetailSection } from '@/features/content3d/narrative/ui/NarrativeSiteDetailSection'
import {
  compactPressureLine,
  DetailShell,
  formatPaVkPa,
  pctMnbc,
  SectionTitle,
  StatRow,
} from '@/features/content3d/narrative/ui/narrativeDetailShared'

const PRESSURE_BASIS_VI = {
  measured_global_average: 'Đo trực tiếp / vệ tinh (TB bề mặt).',
  model_range: 'Khoảng từ mô hình và ràng buộc địa chất.',
  hypothesis_range: 'Kịch bản sớm — khoảng rộng, còn tranh luận.',
} as const

export function NarrativeBeatDetailRight({ entityLabel }: { entityLabel: string }) {
  const beat = usePlanetNarrativeStore((s) => s.currentBeat)
  const showInfoPanel = usePlanetNarrativeStore((s) => s.showInfoPanel)
  const toggleInfoPanel = usePlanetNarrativeStore((s) => s.toggleInfoPanel)
  const selectedSiteId = usePlanetNarrativeStore((s) => s.selectedSiteId)
  const setSelectedSiteId = usePlanetNarrativeStore((s) => s.setSelectedSiteId)
  const sites = usePlanetNarrativeStore((s) => s.sites)
  const site = selectedSiteId ? (sites.find((x) => x.id === selectedSiteId) ?? null) : null
  const accent = beat.accentColor || '#ea580c'

  if (!showInfoPanel) {
    return (
      <button
        type="button"
        onClick={toggleInfoPanel}
        className="w-full shrink-0 rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-slate-200 backdrop-blur-md hover:border-white/30"
      >
        ⓘ Mở chi tiết giai đoạn
      </button>
    )
  }

  if (site) {
    return (
      <DetailShell accent={accent}>
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Địa điểm</span>
          <button
            type="button"
            onClick={() => setSelectedSiteId(null)}
            className="rounded border border-white/25 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10"
          >
            ← Giai đoạn
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NarrativeSiteDetailSection site={site} beat={beat} onClose={() => setSelectedSiteId(null)} />
        </div>
      </DetailShell>
    )
  }

  const rep = beat.environment.surfacePressureRepresentativePa
  const lo = beat.environment.surfacePressureLowPa
  const hi = beat.environment.surfacePressureHighPa
  const o2 = beat.environment.o2Percent
  const co2 = beat.environment.co2Ppm

  return (
    <DetailShell
      accent={accent}
      className="[box-shadow:none]"
      style={{ boxShadow: `inset -3px 0 0 ${accent}`, borderColor: `${accent}40` }}
    >
      <div
        className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3"
        style={{ ['--beat-accent' as string]: accent }}
      >
        <SectionTitle accent={accent}>Khí quyển & biến cố</SectionTitle>
        <button
          type="button"
          onClick={toggleInfoPanel}
          aria-label="Ẩn panel"
          className="rounded border border-white/25 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-3 [scrollbar-gutter:stable]">
        <p className="mb-3 text-[11px] leading-snug text-slate-400">{PRESSURE_BASIS_VI[beat.environment.surfacePressureBasis]}</p>
        <StatRow label="Áp suất đại diện" value={formatPaVkPa(rep)} accent={accent} />
        {typeof lo === 'number' && typeof hi === 'number' && hi > lo ? (
          <StatRow
            label="Khoảng áp suất"
            value={`${formatPaVkPa(lo)} – ${formatPaVkPa(hi)}`}
            accent={accent}
          />
        ) : null}
        <StatRow label="% so MNBC Trái Đất" value={`~${pctMnbc(rep)}%`} accent={accent} />

        {(o2 != null || co2 != null) && (
          <>
            <SectionTitle accent={accent}>Thành phần khí (ước)</SectionTitle>
            {o2 != null ? <StatRow label="O₂" value={`${o2}%`} accent={accent} /> : null}
            {co2 != null ? (
              <StatRow label="CO₂" value={`${co2.toLocaleString('vi-VN')} ppm`} accent={accent} />
            ) : null}
          </>
        )}

        <p className="mt-2 text-[11px] leading-snug text-slate-500">{compactPressureLine(beat)}</p>
        <p className="mt-2 border-t border-white/10 pt-2 text-[10px] leading-snug text-slate-600">
          MNBC Trái Đất: {EARTH_SEA_LEVEL_PRESSURE_PA.toLocaleString('vi-VN')} Pa · {beat.panel.pressureCitationVi}
        </p>

        {(beat.panel.surfaceTempNoteVi || beat.panel.environmentNoteVi) && (
          <>
            <SectionTitle accent={accent}>Ghi chú môi trường</SectionTitle>
            {beat.panel.surfaceTempNoteVi ? (
              <p className="text-[12px] leading-snug text-slate-300">{beat.panel.surfaceTempNoteVi}</p>
            ) : null}
            <p className="mt-2 text-[12px] leading-snug text-slate-400">{beat.panel.environmentNoteVi}</p>
          </>
        )}

        {beat.majorEvents.length > 0 ? (
          <>
            <SectionTitle accent={accent}>Biến cố ({beat.majorEvents.length})</SectionTitle>
            <ul className="space-y-2">
              {beat.majorEvents.map((ev, i) => (
                <li
                  key={`${ev.title}-${i}`}
                  className={clsx(
                    'rounded-lg border px-3 py-2 text-[12px]',
                    ev.tone === 'warning'
                      ? 'border-amber-500/35 bg-amber-500/10'
                      : ev.tone === 'highlight'
                        ? 'border-cyan-500/30 bg-cyan-500/[0.08]'
                        : 'border-white/10 bg-white/[0.03]',
                  )}
                >
                  <div className="font-medium text-slate-100">{ev.title}</div>
                  <div className="mt-1 leading-snug text-slate-400">{ev.summary}</div>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <p className="mt-4 text-[11px] leading-snug text-slate-500">
          Chạm ghim trên {entityLabel} để zoom và xem chi tiết địa điểm.
        </p>
      </div>
    </DetailShell>
  )
}
