'use client'

import { useMemo, useState } from 'react'
import type { ResolvedNasaCatalogItem } from '@/lib/mergeShowcaseCatalog'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import type { ShowcasePanelBlockDTO, ShowcasePanelConfigDTO } from '@/features/content3d/showcase/public'

type LessonLink = { lessonId: string; title: string; href: string }
type ConceptChip = { id: string; title?: string | null }
type TabId = 'overview' | 'physical' | 'sky'

export type ShowcaseGamificationStrip = {
  gemBalance: number
  storyUnlocked: boolean
  orbitUnlocked: boolean
  storyCost: number
  orbitCost: number
  onUnlock: (contentType: 'story' | 'orbit') => void | Promise<void>
}

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
  gamification,
}: {
  item: ResolvedNasaCatalogItem | null
  orbit: ShowcaseOrbitEntity | null
  museumLabelVi: string
  conceptChips: ConceptChip[]
  learningLinks: LessonLink[]
  panelConfig?: ShowcasePanelConfigDTO
  gamification?: ShowcaseGamificationStrip | null
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
    <aside className="fixed left-4 top-24 z-[24] w-[min(340px,calc(100vw-1.5rem))] max-h-[calc(100vh-7rem)] rounded-ds-card border border-ds-border-strong bg-ds-overlay shadow-[0_12px_42px_rgba(0,0,0,0.55)] backdrop-blur-sm flex flex-col min-h-0">
      <header className="shrink-0 border-b border-ds-border px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ds-muted">{item?.group.replace('_', ' · ') || 'showcase entity'}</p>
        <h2 className="mt-1 text-2xl font-semibold text-ds-text leading-none">{item?.displayName || 'No selection'}</h2>
        {badge ? (
          <div className="mt-2 inline-flex max-w-full items-center rounded-md border border-ds-accent-strong bg-ds-accent-soft px-2 py-1">
            <span className="truncate text-[10px] text-ds-accent">{badge}</span>
          </div>
        ) : null}
      </header>

      {tabs.length > 0 ? (
        <nav className="shrink-0 border-b border-ds-border px-3">
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
                      ? 'text-ds-text border-ds-accent'
                      : 'text-ds-muted border-transparent hover:text-ds-text'
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
                  <span key={c.id} className="rounded border border-ds-border bg-ds-surface px-2 py-1 text-[11px] text-ds-muted">
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
                className="block rounded-ds-control border border-ds-border bg-ds-surface px-3 py-2 text-sm text-ds-accent hover:bg-ds-elevated"
              >
                {row.title}
              </a>
            ))}
          </div>
        ) : null}
        {tabs.length === 0 ? (
          <p className="text-[12px] text-ds-subtle">Panel content is empty. Configure this entity in Studio → Panel content.</p>
        ) : null}
      </section>

      {gamification && item ? (
        <div className="shrink-0 border-t border-ds-border px-4 py-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-ds-muted">
            <span>Gem của bạn</span>
            <span className="tabular-nums font-medium text-ds-accent">{gamification.gemBalance}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {!gamification.storyUnlocked && gamification.storyCost > 0 ? (
              <button
                type="button"
                onClick={() => void gamification.onUnlock('story')}
                className="rounded-ds-control border border-ds-warning-strong bg-ds-warning-soft px-2.5 py-1.5 text-[11px] text-ds-warning hover:bg-ds-warning-strong"
              >
                Mở story · {gamification.storyCost} gem
              </button>
            ) : null}
            {!gamification.orbitUnlocked && gamification.orbitCost > 0 ? (
              <button
                type="button"
                onClick={() => void gamification.onUnlock('orbit')}
                className="rounded-ds-control border border-ds-info-strong bg-ds-info-soft px-2.5 py-1.5 text-[11px] text-ds-info hover:bg-ds-info-strong"
              >
                Mở orbit · {gamification.orbitCost} gem
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <footer className="shrink-0 border-t border-ds-border px-4 py-2.5 flex items-center justify-between gap-2">
        <p className="text-[10px] text-ds-subtle">
          {learningLinks.length} lessons in your path
        </p>
        {learningLinks[0] ? (
          <a
            href={learningLinks[0].href}
            className="rounded-ds-control border border-ds-accent px-3 py-1.5 text-[12px] text-ds-accent hover:bg-ds-accent-soft"
          >
            open in learning path →
          </a>
        ) : null}
      </footer>
    </aside>
  )
}

function PanelBlock({ block }: { block: ShowcasePanelBlockDTO }) {
  if (!block) return null
  const variant = block.style?.variant || 'glass'
  const align = block.style?.align || 'left'
  const baseClass =
    variant === 'minimal'
      ? 'rounded-ds-control border border-transparent bg-transparent p-1.5'
      : variant === 'solid'
        ? 'rounded-ds-control border p-2'
        : 'rounded-ds-control border border-ds-border bg-ds-surface p-2'
  const textAlignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
  const style: React.CSSProperties = {
    backgroundColor: block.style?.bgColor || undefined,
    borderColor: block.style?.borderColor || undefined,
    color: block.style?.textColor || undefined,
  }
  // Default to live `--color-accent` so chart bars retint per planet via the
  // surface-scene wrapper. Override only when Studio explicitly sets a color.
  const accent = block.style?.accentColor || 'var(--color-accent)'
  if (block.type === 'image' && block.imageUrl) {
    return (
      <div className={`${baseClass} ${textAlignClass}`} style={style}>
        {block.title ? <p className="mb-2 text-[11px] text-ds-muted">{block.title}</p> : null}
        <img src={block.imageUrl} alt={block.title || 'panel image'} className="w-full h-32 object-cover rounded border border-ds-border" />
        {block.body ? <p className="mt-2 text-[11px] text-ds-subtle">{block.body}</p> : null}
      </div>
    )
  }
  if (block.type === 'chart' && Array.isArray(block.points) && block.points.length > 0) {
    const max = Math.max(...block.points.map((p: { label: string; value: number }) => Number(p.value || 0)), 1)
    return (
      <div className={`${baseClass} ${textAlignClass}`} style={style}>
        {block.title ? <p className="mb-2 text-[11px] text-ds-muted">{block.title}</p> : null}
        <div className="space-y-1.5">
          {block.points.map((p: { label: string; value: number }) => (
            <div key={`${p.label}-${p.value}`} className="text-[10px]">
              <div className="flex justify-between text-ds-subtle">
                <span>{p.label}</span>
                <span>{p.value}</span>
              </div>
              <div className="h-1.5 rounded bg-ds-border-strong overflow-hidden">
                <div className="h-full" style={{ backgroundColor: accent, width: `${Math.max(4, Math.min(100, (Number(p.value) / max) * 100))}%` }} />
              </div>
            </div>
          ))}
        </div>
        {block.body ? <p className="mt-2 text-[11px] text-ds-subtle">{block.body}</p> : null}
      </div>
    )
  }
  if (block.type === 'text' || block.body || block.title) {
    return (
      <div className={`${baseClass} ${textAlignClass}`} style={style}>
        {block.title ? <p className="text-[11px] text-ds-muted">{block.title}</p> : null}
        {block.body ? <p className="mt-1 text-[12px] text-ds-text leading-relaxed">{block.body}</p> : null}
      </div>
    )
  }
  return null
}
