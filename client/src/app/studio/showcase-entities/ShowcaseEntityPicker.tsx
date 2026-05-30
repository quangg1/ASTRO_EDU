'use client'

import { useMemo, useState } from 'react'
import {
  buildShowcaseEntityHierarchy,
  formatHierarchyOptionLabel,
  SHOWCASE_GROUP_LABELS,
  type ShowcaseEntityGroup,
} from '@/app/studio/showcase-entities/showcaseEntityHierarchy'
import type { ShowcaseEditorCatalogItem } from '@/features/content3d/showcase/public'
import type { ShowcaseEntityContentDTO } from '@/features/content3d/showcase/public'
import { NASA_SHOWCASE_ITEMS } from '@/lib/showcaseEntities'
import { planetsData } from '@/lib/solarSystemData'

const CORE_PLANETS = new Set([
  'planet-mercury',
  'planet-venus',
  'planet-earth',
  'planet-mars',
  'planet-jupiter',
  'planet-saturn',
  'planet-uranus',
  'planet-neptune',
])

type Props = {
  selectedId: string
  rows: ShowcaseEntityContentDTO[]
  catalog: ShowcaseEditorCatalogItem[]
  onSelect: (entityId: string) => void
  onCreate: (input: {
    entityId: string
    name: string
    group: ShowcaseEntityGroup
    parentId: string
    linkedPlanetName: string
  }) => Promise<{ ok: boolean; error?: string }>
  onDelete: (entityId: string, cascade: boolean) => Promise<{ ok: boolean; error?: string }>
  busy?: boolean
}

function slugifyId(raw: string, group: ShowcaseEntityGroup): string {
  const base = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!base) return ''
  if (base.startsWith('planet-') || base.startsWith('moon-') || base.startsWith('sc-')) return base
  if (group === 'planets_moons') {
    if (base.startsWith('planet') || base.startsWith('moon')) return base
    return `moon-${base}`
  }
  if (group === 'dwarf_asteroids') {
    if (base.startsWith('dwarf-') || base.startsWith('asteroid-')) return base
    return `asteroid-${base}`
  }
  if (group === 'comets') return base.startsWith('comet-') ? base : `comet-${base}`
  return base.startsWith('sc-') ? base : `sc-${base}`
}

export function ShowcaseEntityPicker({
  selectedId,
  rows,
  catalog,
  onSelect,
  onCreate,
  onDelete,
  busy = false,
}: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newId, setNewId] = useState('')
  const [newGroup, setNewGroup] = useState<ShowcaseEntityGroup>('planets_moons')
  const [newParentId, setNewParentId] = useState('')
  const [localError, setLocalError] = useState('')

  const catalogItems = useMemo(() => {
    if (catalog.length > 0) {
      return catalog.map((c) => ({
        id: c.id,
        name: c.name,
        group: c.group,
        linkedPlanetName: c.linkedPlanetName,
      }))
    }
    return NASA_SHOWCASE_ITEMS.map((c) => ({
      id: c.id,
      name: c.name,
      group: c.group,
      linkedPlanetName: c.linkedPlanetName,
    }))
  }, [catalog])

  const rowsById = useMemo(() => new Map(rows.map((r) => [r.entityId, r])), [rows])

  const hierarchy = useMemo(
    () => buildShowcaseEntityHierarchy(catalogItems, rowsById),
    [catalogItems, rowsById],
  )

  const parentOptions = useMemo(() => {
    const planets = catalogItems.filter((c) => c.id.startsWith('planet-'))
    const dwarfs = catalogItems.filter((c) => c.id.startsWith('dwarf-'))
    return { planets, dwarfs }
  }, [catalogItems])

  const canDelete = selectedId && !CORE_PLANETS.has(selectedId)

  const handleAdd = async () => {
    setLocalError('')
    const name = newName.trim()
    const entityId = slugifyId(newId.trim() || name, newGroup)
    if (!name || !entityId) {
      setLocalError('Cần tên và entityId hợp lệ')
      return
    }
    let linkedPlanetName = ''
    let parentId = newParentId.trim()
    if (parentId.startsWith('planet-')) {
      linkedPlanetName =
        planetsData.find((p) => `planet-${p.name.toLowerCase()}` === parentId)?.name ||
        parentId.replace(/^planet-/, '').replace(/^\w/, (c) => c.toUpperCase())
    }
    const r = await onCreate({ entityId, name, group: newGroup, parentId, linkedPlanetName })
    if (!r.ok) {
      setLocalError(r.error || 'Không tạo được')
      return
    }
    setShowAdd(false)
    setNewName('')
    setNewId('')
    setNewParentId('')
    onSelect(entityId)
  }

  const handleDelete = async () => {
    if (!selectedId || !canDelete) return
    setLocalError('')
    const childCount = hierarchy.filter((n) => n.parentId === selectedId).length
    let cascade = false
    if (childCount > 0) {
      const ok = window.confirm(
        `"${selectedId}" có ${childCount} mục con (vệ tinh / quỹ đạo phụ). Xóa luôn cả con?`,
      )
      if (!ok) return
      cascade = true
    } else if (!window.confirm(`Xóa entity "${selectedId}"?`)) {
      return
    }
    const r = await onDelete(selectedId, cascade)
    if (!r.ok) {
      setLocalError(r.error || 'Không xóa được')
    }
  }

  let lastGroup: ShowcaseEntityGroup | null = null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block flex-1 min-w-[200px] text-xs text-ds-muted">
          Entity
          <select
            value={selectedId}
            disabled={busy}
            onChange={(e) => onSelect(e.target.value)}
            className="studio-field mt-1 font-mono text-[12px]"
          >
            {hierarchy.map((node) => {
              const showGroupHeader = node.group !== lastGroup
              lastGroup = node.group
              return (
                <option key={node.entityId} value={node.entityId}>
                  {showGroupHeader ? `── ${SHOWCASE_GROUP_LABELS[node.group]} ── ` : ''}
                  {formatHierarchyOptionLabel(node)}
                </option>
              )
            })}
          </select>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setShowAdd((v) => !v)
            setLocalError('')
          }}
          className="rounded-md border border-emerald-500/40 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-950/40 disabled:opacity-50"
        >
          + Thêm entity
        </button>
        <button
          type="button"
          disabled={busy || !canDelete}
          onClick={() => void handleDelete()}
          className="rounded-md border border-rose-500/40 px-3 py-2 text-xs text-rose-200 hover:bg-rose-950/40 disabled:opacity-50"
        >
          Xóa
        </button>
      </div>

      {localError ? <p className="text-xs text-rose-300">{localError}</p> : null}

      {showAdd ? (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-3 space-y-2">
          <p className="text-[11px] text-emerald-100/90 uppercase tracking-wide">Entity mới</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="block text-xs text-ds-muted">
              Tên (EN)
              <input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  if (!newId.trim()) setNewId(slugifyId(e.target.value, newGroup))
                }}
                placeholder="Triton"
                className="studio-field mt-1"
              />
            </label>
            <label className="block text-xs text-ds-muted">
              entityId
              <input
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="moon-triton"
                className="studio-field mt-1 font-mono"
              />
            </label>
            <label className="block text-xs text-ds-muted">
              Nhóm
              <select
                value={newGroup}
                onChange={(e) => {
                  const g = e.target.value as ShowcaseEntityGroup
                  setNewGroup(g)
                  setNewId((prev) => slugifyId(prev || newName, g))
                }}
                className="studio-field mt-1"
              >
                {(Object.keys(SHOWCASE_GROUP_LABELS) as ShowcaseEntityGroup[]).map((g) => (
                  <option key={g} value={g}>
                    {SHOWCASE_GROUP_LABELS[g]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-ds-muted">
              Cha (tuỳ chọn)
              <select
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value)}
                className="studio-field mt-1"
              >
                <option value="">— Không —</option>
                <optgroup label="Hành tinh">
                  {parentOptions.planets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Hành tinh lùn">
                  {parentOptions.dwarfs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          </div>
          <p className="text-[10px] text-ds-subtle">
            Gợi ý id: moon-*, planet-*, dwarf-*, asteroid-*, comet-*, sc-*. Prefix tự thêm theo nhóm nếu thiếu.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleAdd()}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              Tạo
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-md border border-ds-border px-3 py-1.5 text-xs text-slate-300"
            >
              Hủy
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
