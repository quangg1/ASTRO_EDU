'use client'

import type { ReactNode } from 'react'
import { clsx } from 'clsx'
import { BookOpen, ChevronsLeft, ChevronsRight, History, Orbit, Sparkles, Stars, Weight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { ResolvedNasaCatalogItem } from '@/lib/mergeShowcaseCatalog'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import type { ShowcasePanelBlockDTO, ShowcasePanelConfigDTO } from '@/features/content3d/showcase/public'
import { entityHasFossilsTab } from '@/app/studio/showcase-entities/entityHistoryCapability'

type LessonLink = { lessonId: string; title: string; href: string }
type ConceptChip = { id: string; title?: string | null }
type TabId = 'overview' | 'physical' | 'sky'

export type ShowcaseSatellitePickerItem = {
  id: string
  name: string
  active: boolean
}

import type { ShowcaseStoryViewModel } from '@/app/explore/hooks/useExploreShowcaseGamification'

export type ShowcaseGamificationStrip = {
  gemBalance: number
  storyCost?: number
  orbitCost?: number
  storyUnlocked?: boolean
  orbitUnlocked?: boolean
  planetStories?: ShowcaseStoryViewModel[]
  unlockPending?: 'story' | 'orbit' | null
  showOrbitUnlock?: boolean
  onUnlockStory?: (unlockEntityId: string) => void
  onUnlockOrbit?: (entityId: string) => void
  onPlayStory?: (storyId: string) => void
}

const TAB_META: Record<
  TabId,
  { icon: typeof BookOpen; hint: (ctx: { blocks: number; concepts: number; lessons: number }) => string }
> = {
  overview: {
    icon: BookOpen,
    hint: ({ blocks, concepts }) =>
      concepts > 0 ? `${concepts} khái niệm` : blocks > 0 ? `${blocks} mục` : 'Tổng quan',
  },
  physical: {
    icon: Weight,
    hint: ({ blocks }) => (blocks > 0 ? `${blocks} chỉ số` : 'Vật lý'),
  },
  sky: {
    icon: Stars,
    hint: ({ blocks, lessons }) =>
      lessons > 0 ? `${lessons} bài học` : blocks > 0 ? `${blocks} mục` : 'Bầu trời',
  },
}

const GROUP_LABEL_VI: Record<string, string> = {
  planets_moons: 'HÀNH TINH · VỆ TINH',
  dwarf_asteroids: 'HÀNH TINH LÙN · TIỂU HÀNH TINH',
  comets: 'SAO CHỔI',
  spacecraft: 'TÀU VŨ TRỤ',
}

function formatGroupLabel(group: string | undefined): string {
  if (!group) return 'THỰC THỂ SHOWCASE'
  return GROUP_LABEL_VI[group] || group.replace(/_/g, ' · ').toUpperCase()
}

function firstTextBlock(blocks: ShowcasePanelBlockDTO[] | undefined): { title?: string; body?: string } | null {
  if (!Array.isArray(blocks)) return null
  for (const block of blocks) {
    if (block?.body?.trim()) return { title: block.title, body: block.body.trim() }
    if (block?.title?.trim() && block.type === 'text') return { title: block.title, body: block.title.trim() }
  }
  return null
}

export function ShowcaseEntityPanel({
  item,
  orbit: _orbit,
  museumLabelVi,
  conceptChips,
  learningLinks,
  panelConfig,
  gamification,
  hasDeepHistory,
  onOpenDeepHistory,
  satelliteChildren = [],
  hostPlanetName,
  activeEntityId,
  onSelectSatellite,
  learningStepsSlot,
  conceptChipsSlot,
  crossViewSlot,
}: {
  item: ResolvedNasaCatalogItem | null
  orbit: ShowcaseOrbitEntity | null
  museumLabelVi: string
  conceptChips: ConceptChip[]
  learningLinks: LessonLink[]
  panelConfig?: ShowcasePanelConfigDTO
  gamification?: ShowcaseGamificationStrip | null
  hasDeepHistory?: boolean
  onOpenDeepHistory?: () => void
  /** Vệ tinh quanh `hostPlanetName` — chọn từ panel thay vì bắt trong 3D. */
  satelliteChildren?: ShowcaseSatellitePickerItem[]
  hostPlanetName?: string | null
  activeEntityId?: string | null
  onSelectSatellite?: (entityId: string) => void
  /** Explore: bước học + chip concept (trên tabs). */
  learningStepsSlot?: ReactNode
  conceptChipsSlot?: ReactNode
  /** Explore: chuyển sang La bàn chòm sao / hệ Mặt Trời. */
  crossViewSlot?: ReactNode
}) {
  const tabs = useMemo(() => {
    const next: Array<{ id: TabId; label: string }> = []
    const wanted = Array.isArray(panelConfig?.tabs) ? panelConfig?.tabs : null
    const include = (id: TabId) => !!wanted && wanted.includes(id)
    const lbl = panelConfig?.tabLabels || {}
    if (include('overview')) next.push({ id: 'overview', label: String(lbl.overview || 'Tổng quan') })
    if (include('physical')) next.push({ id: 'physical', label: String(lbl.physical || 'Vật lý') })
    if (include('sky')) next.push({ id: 'sky', label: String(lbl.sky || 'Bầu trời') })
    return next
  }, [panelConfig?.tabs, panelConfig?.tabLabels])

  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const safeTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0]?.id ?? 'overview'

  const tabCounts = useMemo(
    () => ({
      overview: (panelConfig?.overviewBlocks || []).length,
      physical: (panelConfig?.physicalBlocks || []).length,
      sky: (panelConfig?.skyBlocks || []).length,
    }),
    [panelConfig?.overviewBlocks, panelConfig?.physicalBlocks, panelConfig?.skyBlocks],
  )

  useEffect(() => {
    setActiveTab('overview')
  }, [item?.id])

  if (panelCollapsed) {
    return (
      <button
        type="button"
        data-explore-tour="explore-panel-expand"
        onClick={() => setPanelCollapsed(false)}
        className="fixed left-4 top-24 z-[24] flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.12] bg-[rgba(8,10,16,0.88)] text-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
        aria-label="Mở panel thông tin"
        title="Mở panel"
      >
        <ChevronsRight className="h-5 w-5" strokeWidth={1.75} />
      </button>
    )
  }

  const badge = String(panelConfig?.stateBadge || '').trim()
  const overviewLead = firstTextBlock(panelConfig?.overviewBlocks)
  const subtitle = badge || museumLabelVi || overviewLead?.title || ''
  const description =
    item?.museumBlurbVi?.trim() ||
    overviewLead?.body ||
    (safeTab === 'overview' ? '' : '')

  const isEarth = item ? entityHasFossilsTab(item.id) : false
  const showDeepHistory = Boolean(hasDeepHistory && onOpenDeepHistory && item)

  return (
    <aside
      data-explore-tour="explore-panel"
      className="fixed left-4 top-24 z-[24] flex max-h-[calc(100vh-7rem)] w-[min(392px,calc(100vw-1.5rem))] min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-[rgba(8,10,16,0.82)] shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-xl"
    >
      <header className="shrink-0 px-5 pb-4 pt-5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ds-accent shadow-[0_0_10px_var(--color-accent)]" />
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.22em] text-ds-accent">
            {formatGroupLabel(item?.group)}
          </p>
        </div>
        <h2 className="mt-2 font-[family-name:var(--font-heading)] text-[2rem] font-bold uppercase leading-[0.95] tracking-tight text-white">
          {item?.displayName || 'Chưa chọn'}
        </h2>
        {subtitle ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-white/50">{subtitle}</p>
        ) : null}
      </header>

      {satelliteChildren.length > 0 && hostPlanetName ? (
        <div className="shrink-0 border-b border-white/[0.06] px-5 pb-2.5">
          <div className="mb-1.5 flex items-center gap-2">
            <Orbit className="h-3.5 w-3.5 text-ds-accent" strokeWidth={1.75} />
            <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/45">
              {hostPlanetName} · vệ tinh
            </p>
          </div>
          <div className="flex max-h-[4.25rem] flex-wrap gap-1 overflow-y-auto pr-0.5">
            {satelliteChildren.map((child) => {
              const selected = child.active || activeEntityId === child.id
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => onSelectSatellite?.(child.id)}
                  className={clsx(
                    'rounded-lg border px-2.5 py-1.5 text-left transition',
                    selected
                      ? 'border-ds-accent-strong bg-ds-accent-soft text-white shadow-[inset_0_0_0_1px_var(--color-accent-strong)]'
                      : 'border-white/[0.1] bg-ds-surface/50 text-white/75 hover:border-white/25 hover:bg-white/[0.08]',
                  )}
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.08em]">{child.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {tabs.length > 0 ? (
        <div
          className="shrink-0 border-b border-white/[0.06] bg-[rgba(8,10,16,0.92)] px-5 py-2.5"
          data-explore-tour="explore-panel-tabs"
        >
          <div className="mb-2 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setPanelCollapsed(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.1] text-white/50 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white/85"
              aria-label="Thu gọn panel"
              title="Thu panel"
            >
              <ChevronsLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
          <div
            className={clsx(
              'grid gap-2',
              tabs.length >= 3 ? 'grid-cols-3' : tabs.length === 2 ? 'grid-cols-2' : 'grid-cols-1',
            )}
          >
            {tabs.map((tab) => {
              const active = tab.id === safeTab
              const meta = TAB_META[tab.id]
              const Icon = meta.icon
              const hint = meta.hint({
                blocks: tabCounts[tab.id],
                concepts: conceptChips.length,
                lessons: learningLinks.length,
              })
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'group rounded-xl border px-2 py-2 text-left transition',
                    active
                      ? 'border-ds-accent-strong bg-ds-accent-soft shadow-[inset_0_0_0_1px_var(--color-accent-strong)]'
                      : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]',
                  )}
                >
                  <Icon
                    className={clsx(
                      'mb-2 h-3.5 w-3.5',
                      active ? 'text-ds-accent' : 'text-white/35 group-hover:text-white/55',
                    )}
                    strokeWidth={1.75}
                  />
                  <p
                    className={clsx(
                      'text-[9px] font-medium uppercase tracking-[0.14em]',
                      active ? 'text-ds-accent' : 'text-white/40',
                    )}
                  >
                    {tab.label}
                  </p>
                  <p className={clsx('mt-0.5 truncate text-[11px] font-semibold', active ? 'text-white' : 'text-white/70')}>
                    {hint}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-b border-white/[0.06] px-5 py-2">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setPanelCollapsed(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.1] text-white/50 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white/85"
              aria-label="Thu gọn panel"
              title="Thu panel"
            >
              <ChevronsLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}

      <section className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-5 py-3">
        {crossViewSlot ? <div className="shrink-0">{crossViewSlot}</div> : null}
        {learningStepsSlot ? <div className="shrink-0">{learningStepsSlot}</div> : null}

        {safeTab === 'overview' && description ? (
          <p className="text-[13px] leading-relaxed text-white/72">{description}</p>
        ) : null}

        {safeTab === 'overview' ? (
          <>
            {(panelConfig?.overviewBlocks || []).map((b, idx) => (
              <PanelBlock key={b.id || `${b.type}-${idx}`} block={b} />
            ))}
            {conceptChipsSlot ??
              (conceptChips.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {conceptChips.slice(0, 8).map((c) => (
                    <span
                      key={c.id}
                      className="rounded-lg border border-white/[0.08] bg-ds-surface/50 px-2 py-1 text-[10px] text-white/55"
                    >
                      {c.title || c.id}
                    </span>
                  ))}
                </div>
              ) : null)}
          </>
        ) : null}

        {safeTab === 'physical' ? (
          <div className="space-y-2.5">
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
                className="block rounded-xl border border-white/[0.08] bg-ds-surface/50 px-3 py-2.5 text-sm text-ds-accent transition hover:border-ds-accent-strong hover:bg-ds-accent-soft"
              >
                {row.title}
              </a>
            ))}
          </div>
        ) : null}

        {tabs.length === 0 &&
        !(panelConfig?.overviewBlocks || []).length &&
        !(panelConfig?.physicalBlocks || []).length &&
        !(panelConfig?.skyBlocks || []).length &&
        !description ? (
          <p className="text-[12px] text-white/45">
            Chưa có nội dung panel. Thêm trong Studio → Panel content.
          </p>
        ) : null}
      </section>

      {gamification && item ? (
        <div className="shrink-0 space-y-2.5 border-t border-white/[0.06] px-5 py-3">
          <div className="flex items-center justify-between text-[11px] text-white/45">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-ds-accent" strokeWidth={1.75} />
              Gem của bạn
            </span>
            <span className="tabular-nums font-semibold text-ds-accent">{gamification.gemBalance}</span>
          </div>

          {gamification.showOrbitUnlock && gamification.orbitUnlocked === false ? (
            <button
              type="button"
              disabled={gamification.unlockPending === 'orbit'}
              onClick={() => gamification.onUnlockOrbit?.(item.id)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/35 bg-amber-950/30 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-900/35 disabled:opacity-50"
            >
              <Orbit className="h-3.5 w-3.5" strokeWidth={1.75} />
              Mở quỹ đạo · {gamification.orbitCost ?? 55} gem
            </button>
          ) : null}

          {gamification.planetStories && gamification.planetStories.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/40">
                Story tour
              </p>
              {gamification.planetStories.map((story) => (
                <div
                  key={story.id}
                  className="rounded-xl border border-white/[0.08] bg-ds-surface/40 px-3 py-2.5"
                >
                  <p className="text-[11px] font-semibold text-white">{story.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-white/45">{story.detail}</p>
                  {story.storyUnlocked ? (
                    <button
                      type="button"
                      disabled={!story.hasWaypoints}
                      onClick={() => gamification.onPlayStory?.(story.id)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-ds-accent-strong bg-ds-accent-soft px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ds-accent transition hover:brightness-110 disabled:opacity-40"
                    >
                      <BookOpen className="h-3 w-3" strokeWidth={1.75} />
                      {story.hasWaypoints ? 'Phát tour' : 'Sắp có'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        gamification.unlockPending === 'story' || !story.hasWaypoints
                      }
                      onClick={() => gamification.onUnlockStory?.(story.unlockEntityId)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/75 transition hover:bg-white/[0.06] disabled:opacity-40"
                    >
                      <Sparkles className="h-3 w-3 text-ds-accent" strokeWidth={1.75} />
                      Mở story · {story.storyCost} gem
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {showDeepHistory ? (
        <div className="shrink-0 px-5 pb-4 pt-1">
          <button
            type="button"
            data-explore-tour="explore-deep-history"
            onClick={onOpenDeepHistory}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ds-accent px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ds-accent-fg shadow-[0_8px_28px_color-mix(in_srgb,var(--color-accent)_35%,transparent)] transition hover:brightness-110 active:scale-[0.99]"
          >
            <History className="h-4 w-4" strokeWidth={2} />
            Lịch sử sâu
          </button>
          {isEarth ? (
            <p className="mt-2 text-center text-[10px] leading-snug text-white/40">
              Hóa thạch theo từng thời kỳ — mở cùng timeline, không tách riêng.
            </p>
          ) : null}
        </div>
      ) : null}

      <footer
        data-explore-tour="explore-panel-lessons"
        className="flex shrink-0 items-center justify-between gap-2 border-t border-white/[0.06] px-5 py-2.5"
      >
        <p className="text-[10px] text-white/35">
          {learningLinks.length} bài trên lộ trình của bạn
        </p>
        {learningLinks[0] ? (
          <a
            href={learningLinks[0].href}
            className="rounded-lg border border-ds-accent-strong px-2.5 py-1 text-[11px] font-medium text-ds-accent transition hover:bg-ds-accent-soft"
          >
            Lộ trình học →
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
      ? 'rounded-xl border border-transparent bg-transparent p-1'
      : variant === 'solid'
        ? 'rounded-xl border p-3'
        : 'rounded-xl border border-white/[0.08] bg-ds-surface/50 p-3'
  const textAlignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
  const style: React.CSSProperties = {
    backgroundColor: block.style?.bgColor || undefined,
    borderColor: block.style?.borderColor || undefined,
    color: block.style?.textColor || undefined,
  }
  const accent = block.style?.accentColor || 'var(--color-accent)'

  if (block.type === 'image' && block.imageUrl) {
    return (
      <div className={`${baseClass} ${textAlignClass}`} style={style}>
        {block.title ? <p className="mb-2 text-[10px] uppercase tracking-wider text-white/45">{block.title}</p> : null}
        <img
          src={block.imageUrl}
          alt={block.title || 'panel image'}
          className="h-32 w-full rounded-lg border border-white/[0.08] object-cover"
        />
        {block.body ? <p className="mt-2 text-[12px] leading-relaxed text-white/60">{block.body}</p> : null}
      </div>
    )
  }

  if (block.type === 'chart' && Array.isArray(block.points) && block.points.length > 0) {
    const max = Math.max(...block.points.map((p: { label: string; value: number }) => Number(p.value || 0)), 1)
    return (
      <div className={`${baseClass} ${textAlignClass}`} style={style}>
        {block.title ? <p className="mb-2 text-[10px] uppercase tracking-wider text-white/45">{block.title}</p> : null}
        <div className="space-y-2">
          {block.points.map((p: { label: string; value: number }) => (
            <div key={`${p.label}-${p.value}`}>
              <div className="flex justify-between text-[11px] text-white/55">
                <span>{p.label}</span>
                <span className="font-semibold text-white">{p.value}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: accent,
                    width: `${Math.max(4, Math.min(100, (Number(p.value) / max) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        {block.body ? <p className="mt-2 text-[12px] leading-relaxed text-white/60">{block.body}</p> : null}
      </div>
    )
  }

  if (block.type === 'text' || block.body || block.title) {
    return (
      <div className={`${baseClass} ${textAlignClass}`} style={style}>
        {block.title ? (
          <p className="text-[10px] uppercase tracking-wider text-white/45">{block.title}</p>
        ) : null}
        {block.body ? <p className="mt-1 text-[13px] leading-relaxed text-white/80">{block.body}</p> : null}
      </div>
    )
  }

  return null
}
