import type { ShowcaseEntityContentDTO } from '@/features/content3d/showcase/public'
import type { NasaCatalogItem } from '@/lib/showcaseEntities'

export type ShowcaseEntityGroup =
  | 'planets_moons'
  | 'dwarf_asteroids'
  | 'comets'
  | 'spacecraft'

export type ShowcaseEntityHierarchyNode = {
  entityId: string
  label: string
  depth: number
  group: ShowcaseEntityGroup
  parentId: string
}

const GROUP_ORDER: ShowcaseEntityGroup[] = [
  'planets_moons',
  'dwarf_asteroids',
  'comets',
  'spacecraft',
]

export const SHOWCASE_GROUP_LABELS: Record<ShowcaseEntityGroup, string> = {
  planets_moons: 'Hành tinh & vệ tinh',
  dwarf_asteroids: 'Hành tinh lùn & tiểu hành tinh',
  comets: 'Sao chổi',
  spacecraft: 'Tàu vũ trụ',
}

const PLANET_ORDER = [
  'Mercury',
  'Venus',
  'Earth',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
]

const DWARF_ORDER = ['Pluto', 'Ceres', 'Eris', 'Haumea', 'Makemake']

export function inferShowcaseEntityGroup(entityId: string): ShowcaseEntityGroup {
  const id = String(entityId || '').trim()
  if (id.startsWith('planet-') || id.startsWith('moon-')) return 'planets_moons'
  if (id.startsWith('dwarf-') || id.startsWith('asteroid-')) return 'dwarf_asteroids'
  if (id.startsWith('comet-')) return 'comets'
  if (id.startsWith('sc-')) return 'spacecraft'
  return 'planets_moons'
}

export function resolveShowcaseParentEntityId(
  catalog: Pick<NasaCatalogItem, 'id' | 'linkedPlanetName'> | null | undefined,
  row?: Pick<ShowcaseEntityContentDTO, 'parentId' | 'parentPlanetName'> | null,
): string {
  const pid = String(row?.parentId || '').trim()
  if (pid) return pid
  const lp = String(catalog?.linkedPlanetName || row?.parentPlanetName || '').trim()
  if (lp) return `planet-${lp.toLowerCase()}`
  return ''
}

function planetSortKey(name: string): number {
  const i = PLANET_ORDER.indexOf(name)
  return i >= 0 ? i : 99
}

function dwarfSortKey(name: string): number {
  const i = DWARF_ORDER.indexOf(name)
  return i >= 0 ? i : 50
}

function compareCatalogNames(a: string, b: string): number {
  return a.localeCompare(b, 'en', { sensitivity: 'base' })
}

/**
 * Flat list theo thứ bậc: nhóm → hành tinh cha → vệ tinh/con (depth 1).
 */
export function buildShowcaseEntityHierarchy(
  catalog: NasaCatalogItem[],
  rowsById?: Map<string, ShowcaseEntityContentDTO>,
): ShowcaseEntityHierarchyNode[] {
  type Node = {
    entityId: string
    name: string
    group: ShowcaseEntityGroup
    parentId: string
  }

  const nodes: Node[] = catalog.map((c) => {
    const entityId = String(c.id || '').trim()
    const row = rowsById?.get(entityId)
    const group = (String(c.group || inferShowcaseEntityGroup(entityId)) as ShowcaseEntityGroup) || 'planets_moons'
    return {
      entityId,
      name: row?.nameVi?.trim() || c.name || entityId,
      group,
      parentId: resolveShowcaseParentEntityId(c, row),
    }
  })

  const byGroup = new Map<ShowcaseEntityGroup, Node[]>()
  for (const g of GROUP_ORDER) byGroup.set(g, [])
  for (const n of nodes) {
    const list = byGroup.get(n.group) || []
    list.push(n)
    byGroup.set(n.group, list)
  }

  const out: ShowcaseEntityHierarchyNode[] = []

  for (const group of GROUP_ORDER) {
    const list = byGroup.get(group) || []
    if (list.length === 0) continue

    if (group === 'planets_moons') {
      const planets = list.filter((n) => n.entityId.startsWith('planet-'))
      const others = list.filter((n) => !n.entityId.startsWith('planet-'))
      planets.sort((a, b) => {
        const ka = planetSortKey(a.name)
        const kb = planetSortKey(b.name)
        if (ka !== kb) return ka - kb
        return compareCatalogNames(a.name, b.name)
      })
      const childrenByParent = new Map<string, Node[]>()
      for (const n of others) {
        const pid = n.parentId || ''
        const bucket = childrenByParent.get(pid) || []
        bucket.push(n)
        childrenByParent.set(pid, bucket)
      }
      for (const [, kids] of childrenByParent) {
        kids.sort((a, b) => compareCatalogNames(a.name, b.name))
      }
      for (const planet of planets) {
        out.push({
          entityId: planet.entityId,
          label: planet.name,
          depth: 0,
          group,
          parentId: '',
        })
        const kids = childrenByParent.get(planet.entityId) || []
        for (const child of kids) {
          out.push({
            entityId: child.entityId,
            label: child.name,
            depth: 1,
            group,
            parentId: planet.entityId,
          })
        }
      }
      const orphans = others.filter((n) => {
        const pid = n.parentId
        return !pid || !planets.some((p) => p.entityId === pid)
      })
      for (const o of orphans) {
        if (out.some((x) => x.entityId === o.entityId)) continue
        out.push({
          entityId: o.entityId,
          label: o.name,
          depth: 0,
          group,
          parentId: o.parentId,
        })
      }
      continue
    }

    if (group === 'dwarf_asteroids') {
      const dwarfs = list.filter((n) => n.entityId.startsWith('dwarf-'))
      const rest = list.filter((n) => !n.entityId.startsWith('dwarf-'))
      dwarfs.sort((a, b) => {
        const ka = dwarfSortKey(a.name)
        const kb = dwarfSortKey(b.name)
        if (ka !== kb) return ka - kb
        return compareCatalogNames(a.name, b.name)
      })
      const childrenByParent = new Map<string, Node[]>()
      for (const n of rest) {
        const pid = n.parentId || ''
        const bucket = childrenByParent.get(pid) || []
        bucket.push(n)
        childrenByParent.set(pid, bucket)
      }
      for (const [, kids] of childrenByParent) {
        kids.sort((a, b) => compareCatalogNames(a.name, b.name))
      }
      for (const dwarf of dwarfs) {
        out.push({ entityId: dwarf.entityId, label: dwarf.name, depth: 0, group, parentId: '' })
        const kids = childrenByParent.get(dwarf.entityId) || []
        for (const child of kids) {
          out.push({
            entityId: child.entityId,
            label: child.name,
            depth: 1,
            group,
            parentId: dwarf.entityId,
          })
        }
      }
      const orphans = rest.filter((n) => !out.some((x) => x.entityId === n.entityId))
      for (const o of orphans.sort((a, b) => compareCatalogNames(a.name, b.name))) {
        out.push({
          entityId: o.entityId,
          label: o.name,
          depth: 0,
          group,
          parentId: o.parentId,
        })
      }
      continue
    }

    list.sort((a, b) => compareCatalogNames(a.name, b.name))
    for (const n of list) {
      out.push({
        entityId: n.entityId,
        label: n.name,
        depth: 0,
        group,
        parentId: n.parentId,
      })
    }
  }

  return out
}

export function sortShowcaseEntityRowsHierarchical(
  rows: ShowcaseEntityContentDTO[],
  catalog: NasaCatalogItem[],
): ShowcaseEntityContentDTO[] {
  const byId = new Map(rows.map((r) => [r.entityId, r]))
  const hierarchy = buildShowcaseEntityHierarchy(catalog, byId)
  const ordered: ShowcaseEntityContentDTO[] = []
  const seen = new Set<string>()
  for (const node of hierarchy) {
    const row = byId.get(node.entityId)
    if (row) {
      ordered.push(row)
      seen.add(node.entityId)
    }
  }
  for (const row of rows) {
    if (!seen.has(row.entityId)) ordered.push(row)
  }
  return ordered
}

export function formatHierarchyOptionLabel(node: ShowcaseEntityHierarchyNode): string {
  const indent = node.depth > 0 ? '　↳ ' : ''
  return `${indent}${node.label} (${node.entityId})`
}
