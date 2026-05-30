import type { EarthStage } from '@/features/content3d/earth/lib/earthHistoryTypes'
import { earthHistoryData } from '@/features/content3d/earth/lib/earthHistoryData'
import { fetchEarthHistoryStages } from '@/features/content3d/earth/api/earthHistoryApi'
import { narrativeToEarthStages } from '@/features/content3d/narrative/adapters'

const EARTH_ENTITY_ID = 'planet-earth'

/**
 * Load Earth History stages for Explore — planet narrative CMS first, then legacy API, then static fallback.
 * Pure loader (no Zustand) so stores do not import each other.
 */
export async function loadEarthStages(fallback: EarthStage[] = earthHistoryData): Promise<EarthStage[]> {
  try {
    const narrative = await fetchPlanetNarrative(EARTH_ENTITY_ID)
    if (narrative.data?.beats?.length) {
      return narrativeToEarthStages(narrative.data)
    }
    const remote = await fetchEarthHistoryStages()
    if (remote.length > 0) return remote
    return fallback
  } catch {
    return fallback
  }
}

// Lazy import avoids circular module init with planet-narrative API barrel.
async function fetchPlanetNarrative(entityId: string) {
  const { fetchPlanetNarrative: fetch } = await import(
    '@/features/content3d/planet-narrative/api/planetNarrativeApi'
  )
  return fetch(entityId)
}
