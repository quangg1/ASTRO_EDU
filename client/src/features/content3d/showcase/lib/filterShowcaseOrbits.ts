import type { ShowcaseOrbitEntity } from './showcaseCatalogRuntime'
import { resolveShowcaseOrbitParentPlanetName } from './showcaseCatalogRuntime'

/** Quỹ đạo luôn hiển thị — không cần unlock orbit (Phase B). */
const ALWAYS_VISIBLE_ORBIT_IDS = new Set(['moon-luna'])

export type ShowcaseUnlockFlags = {
  story?: boolean
  orbit?: boolean
}

export function isShowcaseOrbitAlwaysVisible(entityId: string): boolean {
  const id = String(entityId || '').trim()
  if (!id) return false
  if (id.startsWith('planet-')) return true
  return ALWAYS_VISIBLE_ORBIT_IDS.has(id)
}

export function entityNeedsOrbitUnlock(entityId: string): boolean {
  return !isShowcaseOrbitAlwaysVisible(entityId)
}

/**
 * Ẩn quỹ đạo premium khi user đã đăng nhập và chưa unlock orbit cho entity đó.
 * Khách (không gate) và hành tinh + Mặt Trăng cơ bản luôn hiện.
 */
export function filterShowcaseOrbitsForUser(
  entities: ShowcaseOrbitEntity[],
  unlockByEntityId: Map<string, ShowcaseUnlockFlags> | null,
  applyGate: boolean,
): ShowcaseOrbitEntity[] {
  if (!applyGate || !unlockByEntityId) return entities
  return entities.filter((e) => {
    if (isShowcaseOrbitAlwaysVisible(e.id)) return true
    return unlockByEntityId.get(e.id)?.orbit === true
  })
}

/**
 * Entity đang chọn từ danh mục/panel luôn được render tạm — kể cả chưa unlock quỹ đạo (gem).
 * Bao gồm hệ parent (vệ tinh cùng hành tinh) để hiện quỹ đạo đúng ngữ cảnh.
 */
export function expandVisibleOrbitEntitiesForFocus(
  mergedEntities: ShowcaseOrbitEntity[],
  gatedEntities: ShowcaseOrbitEntity[],
  focusEntityId: string | null | undefined,
  extraAllowIds: string[] = [],
): ShowcaseOrbitEntity[] {
  const allowed = new Set(gatedEntities.map((e) => String(e.id || '').trim()).filter(Boolean))
  for (const raw of extraAllowIds) {
    const id = String(raw || '').trim()
    if (id) allowed.add(id)
  }

  const focusId = String(focusEntityId || '').trim()
  if (focusId) {
    allowed.add(focusId)
    const focus = mergedEntities.find((e) => e.id === focusId)
    if (focus) {
      const parentShowcaseId = String(focus.parentShowcaseEntityId || focus.parentId || '').trim()
      if (parentShowcaseId) allowed.add(parentShowcaseId)

      const parentPlanet = resolveShowcaseOrbitParentPlanetName(focus)
      if (parentPlanet) {
        for (const e of mergedEntities) {
          if (resolveShowcaseOrbitParentPlanetName(e) === parentPlanet) allowed.add(e.id)
        }
      }
    }
  }

  return mergedEntities.filter((e) => allowed.has(e.id))
}

export function resolveStoryUnlockEntityId(story: {
  unlockEntityId?: string
  targetPlanetName?: string
}): string {
  const explicit = String(story.unlockEntityId || '').trim()
  if (explicit) return explicit
  const planet = String(story.targetPlanetName || '').trim()
  if (!planet) return ''
  return `planet-${planet.toLowerCase()}`
}
