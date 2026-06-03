'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  buildShowcaseEntityHierarchy,
  SHOWCASE_GROUP_LABELS,
  type ShowcaseEntityGroup,
  type ShowcaseEntityHierarchyNode,
} from '@/app/studio/showcase-entities/showcaseEntityHierarchy'
import { useShowcaseStore } from '@/features/content3d/showcase/public'
import type { ShowcaseEntityContentDTO } from '@/features/content3d/showcase/public'
import type { ResolvedNasaCatalogItem } from '@/lib/mergeShowcaseCatalog'
import { NASA_SHOWCASE_ITEMS } from '@/lib/showcaseEntities'

type Props = {
  open: boolean
  activeEntityId: string
  resolvedCatalog: ResolvedNasaCatalogItem[]
  showcaseContent: ShowcaseEntityContentDTO[]
  onSelect: (entityId: string, source: string, syncPlanet?: boolean) => void
  onClose: () => void
}

const GROUP_ORDER: ShowcaseEntityGroup[] = [
  'planets_moons',
  'dwarf_asteroids',
  'comets',
  'spacecraft',
]

function shouldSyncSolarPlanet(group: ShowcaseEntityGroup, entityId: string): boolean {
  if (group !== 'planets_moons') return false
  return entityId.startsWith('planet-') || entityId.startsWith('moon-')
}

function EntityPickButton({
  node,
  active,
  indent = 0,
  onPick,
}: {
  node: ShowcaseEntityHierarchyNode
  active: boolean
  indent?: number
  onPick: (node: ShowcaseEntityHierarchyNode) => void
}) {
  return (
    <button
      type="button"
      onPointerEnter={() => useShowcaseStore.getState().setPreloadGroup(node.group)}
      onPointerLeave={() => useShowcaseStore.getState().setPreloadGroup(null)}
      onClick={() => onPick(node)}
      className={`flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${
        active
          ? 'bg-cyan-500/20 text-cyan-50 ring-1 ring-cyan-400/35'
          : 'text-slate-200/90 hover:bg-white/10'
      }`}
      style={{ paddingLeft: `${8 + indent * 14}px` }}
    >
      <span className="min-w-0 flex-1 truncate">{node.label}</span>
      <span className="shrink-0 font-mono text-[10px] text-slate-500">{node.entityId}</span>
    </button>
  )
}

function PlanetsMoonsSection({
  nodes,
  activeEntityId,
  onPick,
}: {
  nodes: ShowcaseEntityHierarchyNode[]
  activeEntityId: string
  onPick: (node: ShowcaseEntityHierarchyNode) => void
}) {
  const planets = useMemo(
    () => nodes.filter((n) => n.entityId.startsWith('planet-')),
    [nodes],
  )
  const children = useMemo(
    () => nodes.filter((n) => !n.entityId.startsWith('planet-')),
    [nodes],
  )

  const childrenByParent = useMemo(() => {
    const map = new Map<string, ShowcaseEntityHierarchyNode[]>()
    for (const child of children) {
      const key = child.parentId || '__orphan__'
      const list = map.get(key) || []
      list.push(child)
      map.set(key, list)
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.label.localeCompare(b.label, 'vi'))
    }
    return map
  }, [children])

  const orphanChildren = childrenByParent.get('__orphan__') || []

  return (
    <div className="space-y-4">
      <div>
        <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-200/80">
          Hành tinh
        </p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {planets.map((node) => (
            <EntityPickButton
              key={node.entityId}
              node={node}
              active={node.entityId === activeEntityId}
              onPick={onPick}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
          Vệ tinh & entity quỹ đạo
        </p>
        <div className="space-y-3">
          {planets.map((planet) => {
            const kids = childrenByParent.get(planet.entityId) || []
            if (kids.length === 0) return null
            return (
              <div
                key={planet.entityId}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-1 py-1.5"
              >
                <p className="px-2 pb-1 text-[11px] font-medium text-slate-300">{planet.label}</p>
                <ul className="space-y-0.5">
                  {kids.map((node) => (
                    <li key={node.entityId}>
                      <EntityPickButton
                        node={node}
                        active={node.entityId === activeEntityId}
                        indent={1}
                        onPick={onPick}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          {orphanChildren.length > 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-1 py-1.5">
              <p className="px-2 pb-1 text-[11px] font-medium text-slate-400">Khác (không gắn hành tinh)</p>
              <ul className="space-y-0.5">
                {orphanChildren.map((node) => (
                  <li key={node.entityId}>
                    <EntityPickButton
                      node={node}
                      active={node.entityId === activeEntityId}
                      onPick={onPick}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function ExploreShowcaseMenu({
  open,
  activeEntityId,
  resolvedCatalog,
  showcaseContent,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const rowsById = useMemo(
    () => new Map(showcaseContent.map((r) => [r.entityId, r])),
    [showcaseContent],
  )

  const catalogItems = useMemo(() => {
    if (resolvedCatalog.length > 0) {
      return resolvedCatalog.map((c) => ({
        id: c.id,
        name: c.name,
        group: c.group,
        linkedPlanetName: c.linkedPlanetName,
      }))
    }
    return NASA_SHOWCASE_ITEMS
  }, [resolvedCatalog])

  const hierarchy = useMemo(
    () => buildShowcaseEntityHierarchy(catalogItems, rowsById),
    [catalogItems, rowsById],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return hierarchy
    return hierarchy.filter(
      (n) => n.label.toLowerCase().includes(q) || n.entityId.toLowerCase().includes(q),
    )
  }, [hierarchy, query])

  const grouped = useMemo(() => {
    const map = new Map<ShowcaseEntityGroup, ShowcaseEntityHierarchyNode[]>()
    for (const g of GROUP_ORDER) map.set(g, [])
    for (const node of filtered) {
      const list = map.get(node.group) || []
      list.push(node)
      map.set(node.group, list)
    }
    return map
  }, [filtered])

  const handlePick = (node: ShowcaseEntityHierarchyNode) => {
    onSelect(node.entityId, 'explore-entity-menu', shouldSyncSolarPlanet(node.group, node.entityId))
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed top-28 left-0 right-0 bottom-0 z-[28] bg-black/50 backdrop-blur-[2px] pointer-events-auto"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="absolute left-1/2 top-3 flex max-h-[calc(100%-1rem)] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 flex-col rounded-2xl border border-white/10 bg-ds-base/98 shadow-2xl pointer-events-auto"
        role="dialog"
        aria-label="Chọn vật thể khám phá"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-300">
              Danh mục vật thể
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              Chọn hành tinh riêng, vệ tinh / tàu ở mục bên dưới
            </p>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc id…"
            className="w-[min(200px,36vw)] rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-slate-200 hover:bg-white/10"
          >
            Đóng
          </button>
        </div>

        <div className="overflow-y-auto px-2 py-2">
          {GROUP_ORDER.map((group) => {
            const nodes = grouped.get(group) || []
            if (nodes.length === 0) return null

            if (group === 'planets_moons') {
              return (
                <section key={group} className="mb-4">
                  <p className="sticky top-0 z-[1] mb-2 bg-ds-base/95 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                    {SHOWCASE_GROUP_LABELS[group]}
                  </p>
                  <PlanetsMoonsSection
                    nodes={nodes}
                    activeEntityId={activeEntityId}
                    onPick={handlePick}
                  />
                </section>
              )
            }

            return (
              <section key={group} className="mb-3 last:mb-0">
                <p className="sticky top-0 z-[1] bg-ds-base/95 px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                  {SHOWCASE_GROUP_LABELS[group]}
                </p>
                <ul className="space-y-0.5">
                  {nodes.map((node) => (
                    <li key={node.entityId}>
                      <EntityPickButton
                        node={node}
                        active={node.entityId === activeEntityId}
                        onPick={handlePick}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">Không có kết quả.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
