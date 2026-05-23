'use client'

import { useEffect } from 'react'
import { useSceneCommandStore } from '@/features/content3d/earth/public'
import type { Fossil } from '@/types'

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] gap-x-2 gap-y-0.5 text-[11px] leading-snug sm:grid-cols-[6.5rem_1fr]">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-slate-100">{String(value)}</span>
    </div>
  )
}

function fossilDetailRows(f: Fossil) {
  const paleoLat = f.paleolat ?? f.lat
  const paleoLng = f.paleolng ?? f.lng
  const paleoCoords =
    paleoLat != null && paleoLng != null
      ? `${Number(paleoLat).toFixed(3)}, ${Number(paleoLng).toFixed(3)}`
      : undefined
  const presentCoords =
    f.lat != null && f.lng != null ? `${Number(f.lat).toFixed(3)}, ${Number(f.lng).toFixed(3)}` : undefined
  const periodEra = [f.period, f.era].filter(Boolean).join(' · ') || undefined

  return (
    <>
      <Row label="Ngành (phylum)" value={f.phylum} />
      <Row label="Lớp" value={f.class} />
      <Row label="Bộ" value={f.order} />
      <Row label="Họ" value={f.family} />
      <Row label="Chi" value={f.genus} />
      <Row label="Kỷ / Hệ" value={periodEra} />
      <Row label="Tuổi (Ma)" value={`${f.minMa} – ${f.maxMa}`} />
      <Row label="Vĩ độ / Kinh độ (paleo)" value={paleoCoords} />
      <Row label="Vĩ độ / Kinh độ (hiện tại)" value={presentCoords} />
      <Row label="Mảng cổ" value={f.geoplate != null ? String(f.geoplate) : undefined} />
      <Row label="Vùng cổ địa lý" value={f.paleoRegionName} />
      <Row label="Môi trường" value={f.environment} />
    </>
  )
}

/**
 * Chi tiết hóa thạch neo trong cột phải Earth History — tránh chồng FAB / panel dưới.
 * Hiện khi có hóa thạch đang chọn và `fossilDetailOpen` (nhấn chấm hoặc nhãn tên trên globe).
 */
export function FossilDetailDock() {
  const focusedFossil = useSceneCommandStore((s) => s.focusedFossil)
  const fossilDetailOpen = useSceneCommandStore((s) => s.fossilDetailOpen)
  const setFossilDetailOpen = useSceneCommandStore((s) => s.setFossilDetailOpen)
  const clearAllGlobeFossilUi = useSceneCommandStore((s) => s.clearAllGlobeFossilUi)

  useEffect(() => {
    if (!fossilDetailOpen || !focusedFossil) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setFossilDetailOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fossilDetailOpen, focusedFossil, setFossilDetailOpen])

  if (!fossilDetailOpen || !focusedFossil) return null

  const f = focusedFossil

  return (
    <section
      className="flex max-h-[min(38vh,280px)] min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-ds-card border border-cyan-500/30 bg-[#070d14]/95 shadow-lg backdrop-blur-md"
      role="region"
      aria-label="Chi tiết hóa thạch"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-white/10 px-3 py-2">
        <h3 className="min-w-0 flex-1 text-xs font-semibold leading-snug text-cyan-100">{f.name}</h3>
        <button
          type="button"
          onClick={() => setFossilDetailOpen(false)}
          className="shrink-0 rounded-lg border border-white/15 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10"
          aria-label="Thu gọn chi tiết (giữ chọn trên globe)"
        >
          Thu gọn
        </button>
      </div>

      <div className="min-h-0 flex-1 touch-pan-y space-y-1.5 overflow-y-auto overscroll-y-contain px-3 py-2 [scrollbar-gutter:stable]">
        {fossilDetailRows(f)}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={() => clearAllGlobeFossilUi()}
          className="rounded-lg border border-rose-400/35 bg-rose-950/25 px-2.5 py-1.5 text-[10px] text-rose-100 hover:bg-rose-950/40"
        >
          Bỏ chọn trên globe
        </button>
        <p className="text-[9px] text-slate-500">Esc · thu gọn</p>
      </div>
    </section>
  )
}

/** Giữ alias nếu còn import cũ. */
export const FossilDetailOverlay = FossilDetailDock
