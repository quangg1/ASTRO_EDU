export type ShowcaseStoryCamera = {
  distance: number
  az: number
  el: number
}

export type ShowcaseStoryWaypoint = {
  entityId?: string
  focusPlanetName?: string
  camera?: ShowcaseStoryCamera
  captionVi: string
  durationSec?: number
}

export type ShowcaseStoryCampaign = {
  id: string
  title: string
  subtitle: string
  detail: string
  targetPlanetName: string
  unlockEntityId?: string
  waypoints?: ShowcaseStoryWaypoint[]
}

export const DEFAULT_STORY_WAYPOINT_SEC = 8
export const STORY_COST_GEM = 40
export const ORBIT_COST_GEM = 55
