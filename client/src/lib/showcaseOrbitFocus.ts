import { planetsData } from '@/lib/solarSystemData'
import { NASA_SHOWCASE_ITEMS, SHOWCASE_ORBIT_ENTITIES } from '@/lib/showcaseEntities'

/**
 * Which solar-system planet index is the “spatial anchor” for the current catalog selection
 * (for heliocentric orbit fade when zooming in). Null for bodies without a main planet (e.g. lone comet).
 */
export function resolveShowcaseFocusPlanetIndex(
  activeItemId: string | null | undefined,
  selectedIndex: number | null,
): number | null {
  if (!activeItemId) return selectedIndex
  const cat = NASA_SHOWCASE_ITEMS.find((i) => i.id === activeItemId)
  if (cat?.linkedPlanetName) {
    const idx = planetsData.findIndex((p) => p.name === cat.linkedPlanetName)
    if (idx >= 0) return idx
  }
  const ent = SHOWCASE_ORBIT_ENTITIES.find((e) => e.id === activeItemId)
  if (ent?.parentPlanetName) {
    const idx = planetsData.findIndex((p) => p.name === ent.parentPlanetName)
    if (idx >= 0) return idx
  }
  return null
}
