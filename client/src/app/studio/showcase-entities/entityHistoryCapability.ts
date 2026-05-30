/** Deep History CMS + Explore viewer — generic mọi entity; chỉ fossil là ngoại lệ Earth. */

import { entityHasDeepHistorySync } from '@/app/explore/lib/exploreDeepHistoryAvailability'

const FOSSILS_ENTITY_ID = 'planet-earth'

/** Tab Hóa thạch — ngoại lệ duy nhất (Earth). */
export function entityHasFossilsTab(entityId: string): boolean {
  return String(entityId || '').trim() === FOSSILS_ENTITY_ID
}

export function entitySupportsHistory(_entityId: string): boolean {
  return true
}

/** Chỉ entity có beats (preset hoặc DB) mới mở Deep History trên Explore. */
export function entityHasExploreHistoryViewer(entityId: string): boolean {
  return entityHasDeepHistorySync(entityId)
}

export function entityExploreHref(entityId: string): string {
  const id = String(entityId || '').trim()
  return `/explore?entity=${encodeURIComponent(id)}&history=1`
}
