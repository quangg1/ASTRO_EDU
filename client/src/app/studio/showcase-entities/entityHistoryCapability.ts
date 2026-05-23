/** Deep History CMS + Explore viewer — generic mọi entity; chỉ fossil là ngoại lệ Earth. */

const FOSSILS_ENTITY_ID = 'planet-earth'

/** Tab Hóa thạch — ngoại lệ duy nhất (Earth). */
export function entityHasFossilsTab(entityId: string): boolean {
  return String(entityId || '').trim() === FOSSILS_ENTITY_ID
}

export function entitySupportsHistory(_entityId: string): boolean {
  return true
}

/** Mọi entity showcase có thể mở Deep History trên Explore (globe + timeline + pin). */
export function entityHasExploreHistoryViewer(_entityId: string): boolean {
  return true
}

export function entityExploreHref(entityId: string): string {
  const id = String(entityId || '').trim()
  return `/explore?entity=${encodeURIComponent(id)}&history=1`
}
