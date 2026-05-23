'use client'

import { clsx } from 'clsx'
import type {
  NarrativeLiquidWater,
  NarrativePressureBasis,
  NarrativeBeat,
  NarrativeVolcanism,
} from '@/features/content3d/narrative/types'
import { EARTH_SEA_LEVEL_PRESSURE_PA } from '@/features/content3d/narrative/types'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/stores/planetNarrativeStore'
import { NarrativeSiteDetailSection } from '@/features/content3d/narrative/ui/NarrativeSiteDetailSection'

const WATER_VI: Record<NarrativeLiquidWater, string> = {
  none: 'Không / rất ít',
  rare: 'Rất hiếm',
  regional: 'Khu trú',
  widespread: 'Rộng (theo chứng cứ địa hình cổ)',
  unknown: 'Chưa rõ · đang tranh luận',
}

const VOL_VI: Record<NarrativeVolcanism, string> = {
  low: 'Thấp',
  moderate: 'Trung bình',
  high: 'Cao',
  dominant: 'Thống trị bề mặt',
}

const PRESSURE_BASIS_LABEL_VI: Record<NarrativePressureBasis, string> = {
  measured_global_average:
    'Đo được (trực tiếp / vệ tinh / mặt đất hiện đại): NASA Goddard Mars Fact Sheet dùng áp TB bề mặt ~610 Pa.',
  model_range:
    'Không có manomet Sao Hỏa cổ: khoảng Pa được suy ra từ mô hình và ràng buộc địa chất trong tài liệu học — khoảng vẫn tranh luận.',
  hypothesis_range:
    'Giai đoạn rất sớm: chỉ có kịch bản và khoản rất rộng; không được hiểu nhầm là “xác nhận” như Sao Hỏa hiện đại (~610 Pa TB bề mặt).',
}

type InfoPanelLayout = 'overlay' | 'dock'

export function NarrativeInfoPanel({
  layout = 'overlay',
  entityLabel,
}: {
  layout?: InfoPanelLayout
  /** Tên hành tinh / thực thể (Explore truyền từ catalog). */
  entityLabel?: string
}) {
  const beat = usePlanetNarrativeStore((s) => s.currentBeat)
  const showInfoPanel = usePlanetNarrativeStore((s) => s.showInfoPanel)
  const toggleInfoPanel = usePlanetNarrativeStore((s) => s.toggleInfoPanel)
  const selectedSiteId = usePlanetNarrativeStore((s) => s.selectedSiteId)
  const setSelectedSiteId = usePlanetNarrativeStore((s) => s.setSelectedSiteId)
  const sites = usePlanetNarrativeStore((s) => s.sites)
  const site = selectedSiteId ? (sites.find((x) => x.id === selectedSiteId) ?? null) : null
  if (!showInfoPanel) {
    return (
      <button
        type="button"
        onClick={toggleInfoPanel}
        className={clsx(
          'rounded-ds-control border border-ds-border bg-ds-overlay px-3 py-2 text-xs text-ds-text shadow-lg backdrop-blur-md hover:border-ds-border-strong',
          layout === 'dock' ? 'w-full shrink-0 text-center' : 'fixed right-3 top-20 z-20',
        )}
        aria-label="Mở panel Deep History"
      >
        ⓘ Thông tin
      </button>
    )
  }

  const accent = beat.accentColor || '#ea580c'

  const shell = site ? (
    <div className="narrative-panel-enter flex min-h-0 flex-1 flex-col overflow-hidden rounded-ds-card border border-ds-border bg-ds-overlay shadow-xl backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-end border-b border-ds-border px-3 py-2">
        <button
          type="button"
          onClick={toggleInfoPanel}
          aria-label="Đóng panel"
          className="rounded border border-white/25 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10"
        >
          ✕
        </button>
      </div>
      <NarrativeSiteDetailSection site={site} beat={beat} onClose={() => setSelectedSiteId(null)} />
    </div>
  ) : (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-ds-card border border-ds-border bg-ds-overlay shadow-xl backdrop-blur-md narrative-panel-enter">
      <HeroCard beat={beat} onClose={toggleInfoPanel} />

      <div className="min-h-0 flex-1 touch-pan-y space-y-2.5 overflow-y-auto overscroll-y-contain px-3.5 pb-3 [scrollbar-gutter:stable]">
        <p className="text-[12px] leading-snug text-slate-400">{compactPressureLine(beat)}</p>

<section className="flex flex-wrap gap-2">
          <Badge label="Nhiệt độ bề mặt" value={tempRange(beat)} accent={accent} />
          <Badge label="Nước lỏng (định tính)" value={WATER_VI[beat.environment.liquidWater]} accent={accent} />
          <Badge label="Hoạt động núi lửa" value={VOL_VI[beat.environment.volcanism]} accent={accent} />
          {beat.environment.dustActivity != null ? (
            <Badge label="Bão bụi (Amazonian)" value={`Mức ${beat.environment.dustActivity}/3`} accent={accent} />
          ) : null}
        </section>

        <details className="rounded-lg border border-white/10 bg-black/[0.12] px-2.5 py-2">
          <summary className="cursor-pointer select-none text-[11px] font-medium text-slate-300">
            Mô tả giai đoạn
          </summary>
          <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
            <p className="text-[13px] leading-relaxed text-ds-text/88">{beat.panel.descriptionVi}</p>
            <p className="text-[12px] italic text-ds-text/70">{beat.panel.compareNoteVi}</p>
          </div>
        </details>

        <details className="rounded-lg border border-white/10 bg-black/[0.12] px-2.5 py-2">
          <summary className="cursor-pointer select-none text-[11px] font-medium text-slate-300">
            Khí quyển & nguồn
          </summary>
          <div className="mt-2">
            <NarrativePressureSection beat={beat} accent={accent} entityLabel={entityLabel} />
          </div>
        </details>

        {(beat.panel.surfaceTempNoteVi || beat.panel.environmentNoteVi) && (
          <details className="rounded-lg border border-white/10 bg-black/[0.12] px-2.5 py-2">
            <summary className="cursor-pointer select-none text-[11px] font-medium text-slate-300">
              Môi trường bề mặt
            </summary>
            <div className="mt-2 space-y-2 border-t border-white/10 pt-2 text-[12px] leading-snug text-slate-400">
              {beat.panel.surfaceTempNoteVi ? <p>{beat.panel.surfaceTempNoteVi}</p> : null}
              <p className="text-ds-text/75">{beat.panel.environmentNoteVi}</p>
            </div>
          </details>
        )}

        {beat.majorEvents && beat.majorEvents.length > 0 ? (
          <details className="rounded-lg border border-white/10 bg-black/[0.12] px-2.5 py-2">
            <summary className="cursor-pointer select-none text-[11px] font-medium text-slate-300">
              Biến cố nổi bật ({beat.majorEvents.length})
            </summary>
            <ul className="mt-2 space-y-2 border-t border-white/10 pt-2">
              {beat.majorEvents.map((ev, i) => (
                <li
                  key={`${ev.title}-${i}`}
                  className={clsx(
                    'rounded-lg border px-3 py-2 text-[12px]',
                    ev.tone === 'warning'
                      ? 'border-amber-500/35 bg-amber-500/10'
                      : ev.tone === 'highlight'
                        ? 'border-cyan-500/30 bg-cyan-500/[0.08]'
                        : 'border-ds-border bg-white/[0.03]',
                  )}
                >
                  <div className="font-medium text-ds-text">{ev.title}</div>
                  <div className="mt-1 leading-snug text-ds-text/78">{ev.summary}</div>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <p className="text-[11px] leading-snug text-slate-500">
          Chạm ghim trên {entityLabel ?? 'quả cầu'} — camera zoom và mở chi tiết địa điểm ở đây.
        </p>

        <footer className="border-t border-white/10 pt-2 text-[10px] leading-snug text-slate-600">
          Dữ liệu địa chất / áp suất theo từng giai đoạn trong Studio · ảnh địa danh từ Photojournal (nếu có).
        </footer>
      </div>
    </div>
  )

  if (layout === 'dock') {
    return (
      <aside className="relative z-0 flex h-full min-h-0 w-full min-w-0 flex-col" style={{ ['--beat-accent' as string]: accent }}>
        {shell}
      </aside>
    )
  }

  return (
    <aside
      className="fixed right-3 top-16 bottom-24 z-20 flex w-[22rem] max-w-[calc(100vw-1.5rem)] flex-col"
      style={{ ['--beat-accent' as string]: accent }}
    >
      {shell}
    </aside>
  )
}

function tempRange(beat: NarrativeBeat): string {
  const a = Math.round(beat.environment.surfaceTempMinC)
  const b = Math.round(beat.environment.surfaceTempMaxC)
  return `${a}…${b} °C`
}

function formatPaVkPa(pa: number): string {
  const paR = Math.round(pa)
  const kPa = pa / 1000
  const kFmt = kPa.toLocaleString('vi-VN', { maximumFractionDigits: kPa >= 100 ? 1 : 3 })
  return `${paR.toLocaleString('vi-VN')} Pa (${kFmt} kPa)`
}

/** Phần trăm áp Sao Hỏa so với MNBC Trái Đất (~ISA 101 325 Pa). */
function pctMnbc(pa: number): string {
  return ((pa / EARTH_SEA_LEVEL_PRESSURE_PA) * 100).toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 5,
  })
}

function compactPressureLine(beat: NarrativeBeat): string {
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

function NarrativePressureSection({
  beat,
  accent,
  entityLabel,
}: {
  beat: NarrativeBeat
  accent: string
  entityLabel?: string
}) {
  const earth = EARTH_SEA_LEVEL_PRESSURE_PA
  const lo = beat.environment.surfacePressureLowPa
  const hi = beat.environment.surfacePressureHighPa
  const hasTopoOrModelRange =
    typeof lo === 'number' &&
    typeof hi === 'number' &&
    hi > lo &&
    (beat.environment.surfacePressureBasis === 'measured_global_average' ||
      beat.environment.surfacePressureBasis === 'model_range' ||
      beat.environment.surfacePressureBasis === 'hypothesis_range')
  const rep = beat.environment.surfacePressureRepresentativePa

  return (
    <section
      className="rounded-lg border px-3 py-2.5"
      style={{ borderColor: `${accent}44`, backgroundColor: `${accent}08` }}
    >
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Áp suất khí quyển (bề mặt)
      </h3>
      <p className="mb-2 text-[11px] leading-snug text-slate-400">{PRESSURE_BASIS_LABEL_VI[beat.environment.surfacePressureBasis]}</p>
      <p className="mb-2 text-[12px] leading-snug text-ds-text/88">
        Tham chiếu Trái Đất mực nước biển chuẩn (MNBC · ISA cổ điển):{' '}
        <span className="font-semibold tabular-nums text-slate-100">{earth.toLocaleString('vi-VN')} Pa</span>{' '}
        (~{(earth / 1000).toLocaleString('vi-VN')} kPa).
      </p>

      {beat.environment.surfacePressureBasis === 'measured_global_average' ? (
        <>
          <p className="text-[13px] leading-snug text-white">
            Áp TB bề mặt{entityLabel ? ` (${entityLabel})` : ''}:{' '}
            <span className="font-mono tabular-nums">{formatPaVkPa(rep)}</span> (~{pctMnbc(rep)}% áp MNBC).
          </p>
          {hasTopoOrModelRange ? (
            <p className="mt-2 text-[12px] leading-snug text-slate-300">
              Theo NASA Fact Sheet — dao động theo độ cao và địa hình khoảng:{' '}
              <span className="font-mono tabular-nums">{formatPaVkPa(lo!)}</span> —{' '}
              <span className="font-mono tabular-nums">{formatPaVkPa(hi!)}</span> (~{pctMnbc(lo!)}% — ~
              {pctMnbc(hi!)}% MNBC).
            </p>
          ) : null}
        </>
      ) : hasTopoOrModelRange ? (
        <>
          <p className="text-[13px] leading-snug text-white">
            Khoảng trong preset (ước theo các mô hình và tài liệu tham khảo phổ):{' '}
            <span className="font-mono tabular-nums">{formatPaVkPa(lo!)}</span> —{' '}
            <span className="font-mono tabular-nums">{formatPaVkPa(hi!)}</span> (~{pctMnbc(lo!)}% — ~
            {pctMnbc(hi!)}% MNBC).
          </p>
          <p className="mt-2 text-[12px] leading-snug text-slate-300">
            Giá trị đại diện của khoảng trong preset:{' '}
            <span className="font-mono tabular-nums font-medium">{formatPaVkPa(rep)}</span> (~
            {pctMnbc(rep)}% MNBC).
          </p>
        </>
      ) : (
        <p className="text-[13px] leading-snug text-white">
          Ước đại điểm: <span className="font-mono tabular-nums">{formatPaVkPa(rep)}</span> (~{pctMnbc(rep)}% MNBC).
        </p>
      )}
      <p className="mt-2 border-t border-white/15 pt-2 text-[11px] leading-snug text-slate-500">
        {beat.panel.pressureCitationVi}
      </p>
    </section>
  )
}

function Badge({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="rounded-lg border px-2.5 py-1.5 text-[11px]"
      style={{ borderColor: `${accent}55`, backgroundColor: `${accent}14` }}
    >
      <div className="text-[9px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-medium text-ds-text">{value}</div>
    </div>
  )
}

function HeroCard({
  beat,
  onClose,
  compact = false,
}: {
  beat: NarrativeBeat
  onClose: () => void
  compact?: boolean
}) {
  return (
    <div
      className={clsx('shrink-0 border-b border-ds-border', compact ? 'px-3.5 py-2' : 'px-3.5 py-4')}
      style={{ borderBottomColor: `${beat.accentColor}55` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={compact ? 'text-xl' : 'text-3xl'}>{beat.icon}</span>
          <h2 className={clsx('font-semibold text-white', compact ? 'mt-1 text-sm' : 'mt-2 text-xl')}>
            {beat.name}
          </h2>
          <p className={clsx('text-slate-400', compact ? 'text-[10px]' : 'text-[12px]')}>{beat.ageLabelVi}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng panel"
          className="rounded border border-white/25 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
