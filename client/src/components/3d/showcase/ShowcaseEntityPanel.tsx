'use client'

import { useMemo, useState } from 'react'
import type { ResolvedNasaCatalogItem } from '@/lib/mergeShowcaseCatalog'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import type { ShowcasePanelConfigDTO } from '@/lib/showcaseEntitiesApi'

type LessonLink = { lessonId: string; title: string; href: string }
type ConceptChip = { id: string; title?: string | null }
type TabId = 'overview' | 'physical' | 'sky'

function formatNumber(v: number, digits = 1): string {
  if (!Number.isFinite(v)) return 'N/A'
  return v.toLocaleString('en-US', { maximumFractionDigits: digits })
}

function deriveStateBadge(item: ResolvedNasaCatalogItem | null, orbit: ShowcaseOrbitEntity | null): string {
  if (!item) return 'No active entity selected'
  if (item.group === 'spacecraft') return 'Mission data active · Follow timeline in learning path'
  const periodDays = Number(orbit?.orbitalElements?.periodDays ?? orbit?.periodDays ?? 0)
  if (Number.isFinite(periodDays) && periodDays > 0) {
    return `Orbital period ${formatNumber(periodDays, 1)} days · JPL-synced trajectory`
  }
  const e = Number(orbit?.orbitalElements?.e ?? orbit?.orbitEccentricity ?? 0)
  if (Number.isFinite(e) && e > 0) {
    return `Eccentricity ${formatNumber(e, 3)} · Stable orbital solution`
  }
  return `Catalog entity active · ${item.group.replace('_', ' ')}`
}

export function ShowcaseEntityPanel({
  item,
  orbit,
  museumLabelVi,
  conceptChips,
  learningLinks,
  panelConfig,
}: {
  item: ResolvedNasaCatalogItem | null
  orbit: ShowcaseOrbitEntity | null
  museumLabelVi: string
  conceptChips: ConceptChip[]
  learningLinks: LessonLink[]
  panelConfig?: ShowcasePanelConfigDTO
}) {
  const tabs = useMemo(() => {
    const next: Array<{ id: TabId; label: string }> = []
    const wanted = Array.isArray(panelConfig?.tabs) ? panelConfig?.tabs : null
    const include = (id: TabId) => !!wanted && wanted.includes(id)
    const lbl = panelConfig?.tabLabels || {}
    if (include('overview')) next.push({ id: 'overview', label: String(lbl.overview || 'Overview') })
    if (include('physical')) next.push({ id: 'physical', label: String(lbl.physical || 'Physical') })
    if (include('sky')) next.push({ id: 'sky', label: String(lbl.sky || 'Sky') })
    return next
  }, [panelConfig?.tabs, panelConfig?.tabLabels])

  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const safeTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0]?.id ?? 'overview'
  const badge = String(panelConfig?.stateBadge || '').trim()

  return (
    <aside className="fixed left-4 top-24 z-[24] w-[min(340px,calc(100vw-1.5rem))] max-h-[calc(100vh-7rem)] rounded-xl border border-[#2a3447] bg-[#0b0f16]/94 shadow-[0_12px_42px_rgba(0,0,0,0.55)] backdrop-blur-sm flex flex-col min-h-0">
      <header className="shrink-0 border-b border-white/10 px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#7d8ca8]">{item?.group.replace('_', ' · ') || 'showcase entity'}</p>
        <h2 className="mt-1 text-2xl font-semibold text-[#e5e7eb] leading-none">{item?.displayName || 'No selection'}</h2>
        {badge ? (
          <div className="mt-2 inline-flex max-w-full items-center rounded-md border border-[#9f7d2a] bg-[#3b2a08]/30 px-2 py-1">
            <span className="truncate text-[10px] text-[#f6cc6d]">{badge}</span>
          </div>
        ) : null}
      </header>

      {tabs.length > 0 ? (
        <nav className="shrink-0 border-b border-white/10 px-3">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const active = tab.id === safeTab
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-[11px] uppercase tracking-[0.12em] border-b transition ${
                    active
                      ? 'text-[#f8f2df] border-[#f0c35d]'
                      : 'text-[#7f8ca3] border-transparent hover:text-[#cdd6e7]'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </nav>
      ) : null}

      <section className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
        {safeTab === 'overview' ? (
          <>
            {(panelConfig?.overviewBlocks || []).map((b, idx) => (
              <PanelBlock key={b.id || `${b.type}-${idx}`} block={b} />
            ))}
            {conceptChips.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {conceptChips.slice(0, 8).map((c) => (
                  <span key={c.id} className="rounded border border-white/12 bg-white/5 px-2 py-1 text-[11px] text-slate-300">
                    {c.title || c.id}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {safeTab === 'physical' ? (
          <div className="space-y-3">
            {(panelConfig?.physicalBlocks || []).map((b, idx) => (
              <PanelBlock key={b.id || `${b.type}-${idx}`} block={b} />
            ))}
          </div>
        ) : null}

        {safeTab === 'sky' ? (
          <div className="space-y-2">
            {(panelConfig?.skyBlocks || []).map((b, idx) => (
              <PanelBlock key={b.id || `${b.type}-${idx}`} block={b} />
            ))}
            {learningLinks.map((row) => (
              <a
                key={row.lessonId}
                href={row.href}
                className="block rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-cyan-200 hover:bg-white/[0.08]"
              >
                {row.title}
              </a>
            ))}
          </div>
        ) : null}
        {tabs.length === 0 ? (
          <p className="text-[12px] text-slate-500">Panel content is empty. Configure this entity in Studio → Panel content.</p>
        ) : null}
      </section>

      <footer className="shrink-0 border-t border-white/10 px-4 py-2.5 flex items-center justify-between gap-2">
        <p className="text-[10px] text-slate-500">
          {learningLinks.length} lessons in your path
        </p>
        {learningLinks[0] ? (
          <a
            href={learningLinks[0].href}
            className="rounded-lg border border-[#f0c35d] px-3 py-1.5 text-[12px] text-[#f4cd76] hover:bg-[#f0c35d]/10"
          >
            open in learning path →
          </a>
        ) : null}
      </footer>
    </aside>
  )
}

function PanelBlock({ block }: { block: NonNullable<ShowcasePanelConfigDTO>['overviewBlocks'][number] }) {
  if (!block) return null
  const variant = block.style?.variant || 'glass'
  const align = block.style?.align || 'left'
  const baseClass =
    variant === 'minimal'
      ? 'rounded-lg border border-transparent bg-transparent p-1.5'
      : variant === 'solid'
        ? 'rounded-lg border p-2'
        : 'rounded-lg border border-white/10 bg-white/[0.03] p-2'
  const textAlignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
  const style: React.CSSProperties = {
    backgroundColor: block.style?.bgColor || undefined,
    borderColor: block.style?.borderColor || undefined,
    color: block.style?.textColor || undefined,
  }
  const accent = block.style?.accentColor || 'rgba(34,211,238,0.85)'
  if (block.type === 'image' && block.imageUrl) {
    return (
      <div className={`${baseClass} ${textAlignClass}`} style={style}>
        {block.title ? <p className="mb-2 text-[11px] text-slate-300">{block.title}</p> : null}
        <img src={block.imageUrl} alt={block.title || 'panel image'} className="w-full h-32 object-cover rounded border border-white/10" />
        {block.body ? <p className="mt-2 text-[11px] text-slate-400">{block.body}</p> : null}
      </div>
    )
  }
  if (block.type === 'chart' && Array.isArray(block.points) && block.points.length > 0) {
    const max = Math.max(...block.points.map((p) => Number(p.value || 0)), 1)
    return (
      <div className={`${baseClass} ${textAlignClass}`} style={style}>
        {block.title ? <p className="mb-2 text-[11px] text-slate-300">{block.title}</p> : null}
        <div className="space-y-1.5">
          {block.points.map((p) => (
            <div key={`${p.label}-${p.value}`} className="text-[10px]">
              <div className="flex justify-between text-slate-400">
                <span>{p.label}</span>
                <span>{p.value}</span>
              </div>
              <div className="h-1.5 rounded bg-white/10 overflow-hidden">
                <div className="h-full" style={{ backgroundColor: accent, width: `${Math.max(4, Math.min(100, (Number(p.value) / max) * 100))}%` }} />
              </div>
            </div>
          ))}
        </div>
        {block.body ? <p className="mt-2 text-[11px] text-slate-400">{block.body}</p> : null}
      </div>
    )
  }
  if (block.type === 'text' || block.body || block.title) {
    return (
      <div className={`${baseClass} ${textAlignClass}`} style={style}>
        {block.title ? <p className="text-[11px] text-slate-300">{block.title}</p> : null}
        {block.body ? <p className="mt-1 text-[12px] text-slate-300 leading-relaxed">{block.body}</p> : null}
      </div>
    )
  }
  return null
}
