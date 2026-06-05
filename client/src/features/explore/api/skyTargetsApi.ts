import { getApiPathBase } from '@/lib/apiConfig'
import type { SkyExploreTarget } from '../lib/exploreTargets'
import { SKY_EXPLORE_SEED, SKY_EXPLORE_SEED_VERSION } from '../data/skyExploreSeed'
import type { SkyTargetContentDTO } from '../lib/mergeSkyTargetContent'

export type SkyTargetsResponse = {
  version: number
  attribution?: string
  targets: SkyExploreTarget[]
  contentById?: Record<string, SkyTargetContentDTO>
  source?: 'api' | 'bundled'
}

const API = `${getApiPathBase()}/explore/sky-targets`

export function getBundledSkyExploreTargets(): SkyTargetsResponse {
  return {
    version: SKY_EXPLORE_SEED_VERSION,
    targets: SKY_EXPLORE_SEED,
    source: 'bundled',
  }
}

export async function fetchSkyExploreTargets(): Promise<SkyTargetsResponse> {
  try {
    const res = await fetch(API, { cache: 'no-store' })
    if (!res.ok) throw new Error(`sky_targets_${res.status}`)
    const data = (await res.json()) as SkyTargetsResponse
    if (!Array.isArray(data.targets) || data.targets.length === 0) {
      return getBundledSkyExploreTargets()
    }
    return { ...data, source: 'api' }
  } catch {
    return getBundledSkyExploreTargets()
  }
}
