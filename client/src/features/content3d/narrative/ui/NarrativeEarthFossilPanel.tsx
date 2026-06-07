'use client'

import { clsx } from 'clsx'
import { Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSceneCommandStore } from '@/features/content3d/earth/public'
import { getPhylumColor, getPhylumInfo } from '@/lib/fossilPhyla'
import type { Fossil } from '@/features/content3d/earth/lib/earthHistoryTypes'
import { DetailShell, SectionTitle } from '@/features/content3d/narrative/ui/narrativeDetailShared'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/stores/planetNarrativeStore'

function fossilCoords(f: Fossil): { lat: number; lng: number } | null {
  const lat = f.paleolat ?? f.lat
  const lng = f.paleolng ?? f.lng
  if (lat == null || lng == null) return null
  return { lat, lng }
}

export function NarrativeEarthFossilPanel() {
  const beat = usePlanetNarrativeStore((s) => s.currentBeat)
  const accent = beat.accentColor || '#4ea1ff'
  const [query, setQuery] = useState('')
  const [activePhylum, setActivePhylum] = useState<string | null>(null)

  const {
    fossils,
    fossilStats,
    fossilsLoading,
    showFossils,
    toggleFossils,
    setFlyToTarget,
    setEarthRotationPaused,
    setFocusedFossil,
    setFossilDetailOpen,
  } = useSceneCommandStore()

  const phyla = useMemo(() => {
    if (!fossilStats?.byPhylum) return []
    return Object.entries(fossilStats.byPhylum).sort((a, b) => b[1] - a[1])
  }, [fossilStats?.byPhylum])

  const filtered = useMemo(() => {
    let list = fossils
    if (activePhylum) list = list.filter((f) => (f.phylum || 'Khác') === activePhylum)
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((f) => {
      const hay = [f.name, f.phylum, f.genus, f.family, f.paleoRegionName, f.environment]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [fossils, activePhylum, query])

  const preview = filtered.slice(0, 24)

  const flyToFossil = (f: Fossil) => {
    const coords = fossilCoords(f)
    if (!coords) return
    setFocusedFossil(f)
    setFossilDetailOpen(true)
    setFlyToTarget({ lat: coords.lat, lng: coords.lng, mode: 'single', fossil: f })
    setEarthRotationPaused(true)
  }

  const flyToPhylum = (phylum: string) => {
    if (activePhylum === phylum) {
      setActivePhylum(null)
      setFlyToTarget(null)
      return
    }
    setActivePhylum(phylum)
    const ofPhylum = fossils.filter((f) => (f.phylum || 'Khác') === phylum)
    let sumLat = 0
    let sumLng = 0
    let n = 0
    ofPhylum.forEach((f) => {
      const c = fossilCoords(f)
      if (!c) return
      sumLat += c.lat
      sumLng += c.lng
      n++
    })
    if (n > 0) {
      setFlyToTarget({
        lat: sumLat / n,
        lng: sumLng / n,
        mode: 'phylum',
        phylumFossils: ofPhylum,
      })
      setEarthRotationPaused(true)
    }
  }

  return (
    <DetailShell accent={accent} className="min-h-[12rem] flex-1">
      <div className="shrink-0 border-b border-ds-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>
              Hóa thạch · tra cứu
            </p>
            <p className="mt-0.5 text-[11px] text-ds-muted">{beat.ageLabelVi}</p>
          </div>
          <button
            type="button"
            onClick={toggleFossils}
            className={clsx(
              'rounded-lg border px-2 py-1 text-[10px] uppercase tracking-wider transition',
              showFossils
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                : 'border-ds-border text-ds-muted hover:bg-white/5',
            )}
          >
            {showFossils ? 'Ẩn trên globe' : 'Hiện trên globe'}
          </button>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ds-subtle" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên, ngành, vùng…"
            className="w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-8 pr-3 text-[12px] text-white placeholder:text-gray-500 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
            aria-label="Tìm kiếm hóa thạch"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {fossilsLoading ? (
          <p className="text-[11px] text-ds-subtle">Đang tải hóa thạch thời kỳ…</p>
        ) : !fossilStats || fossilStats.total <= 0 ? (
          <p className="text-[11px] leading-relaxed text-ds-subtle">
            Chưa có mẫu hóa thạch rõ trong khoảng thời gian này. Thử kéo timeline sang kỷ Phanerozoic.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 text-[11px] text-ds-muted">
              <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} />
              <span>
                <strong className="text-slate-100">{fossilStats.total.toLocaleString('vi-VN')}</strong> mẫu ·{' '}
                <strong className="text-slate-100">{phyla.length}</strong> ngành
              </span>
            </div>

            {phyla.length > 0 ? (
              <>
                <SectionTitle accent={accent}>Lọc theo ngành</SectionTitle>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {phyla.slice(0, 8).map(([phylum, count]) => {
                    const active = activePhylum === phylum
                    const color = getPhylumColor(phylum)
                    return (
                      <button
                        key={phylum}
                        type="button"
                        onClick={() => flyToPhylum(phylum)}
                        className={clsx(
                          'rounded-lg border px-2 py-1 text-[10px] transition',
                          active ? 'bg-white/10 text-white' : 'border-ds-border text-ds-muted hover:bg-white/5',
                        )}
                        style={active ? { borderColor: color, boxShadow: `inset 0 0 0 1px ${color}55` } : undefined}
                        title={getPhylumInfo(phylum)?.description}
                      >
                        {phylum} · {count}
                      </button>
                    )
                  })}
                </div>
              </>
            ) : null}

            <SectionTitle accent={accent}>Danh sách</SectionTitle>
            <ul className="space-y-1.5">
              {preview.map((f) => {
                const coords = fossilCoords(f)
                return (
                  <li key={f._id}>
                    <button
                      type="button"
                      disabled={!coords}
                      onClick={() => flyToFossil(f)}
                      className={clsx(
                        'w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-left transition',
                        coords ? 'hover:border-white/20 hover:bg-white/[0.06]' : 'opacity-45 cursor-not-allowed',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[12px] font-medium text-slate-100">{f.name}</span>
                        {f.maxMa != null ? (
                          <span className="shrink-0 text-[10px] tabular-nums text-ds-subtle">
                            {f.maxMa.toFixed(1)} Ma
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[10px] text-ds-subtle">
                        {f.phylum || 'Khác'}
                        {f.paleoRegionName && f.paleoRegionName !== 'Không xác định'
                          ? ` · ${f.paleoRegionName}`
                          : ''}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
            {filtered.length > preview.length ? (
              <p className="mt-2 text-[10px] text-ds-subtle">
                +{filtered.length - preview.length} mẫu — thu hẹp tìm kiếm để xem thêm.
              </p>
            ) : null}
          </>
        )}
      </div>
    </DetailShell>
  )
}
