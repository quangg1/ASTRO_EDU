/** Earth simulator scene + playback orchestration + static deep-time timeline (offline fallback). */
export { usePlaybackStore } from './stores/playbackStore'
export { useSceneCommandStore } from './stores/sceneCommandStore'
export { useEarthHistoryStore } from './stores/earthHistoryStore'
export { earthHistoryData, getStageById, getStageByTime } from './lib/earthHistoryData'
export { findStageByTime, findStageById } from './lib/earthHistoryHelpers'
export type {
  EarthStage,
  MajorEvent,
  Lifeform,
  LifeInfo,
  ClimateInfo,
  ContinentalInfo,
  Fossil,
  FossilStats,
} from './lib/earthHistoryTypes'
export { fetchFossilsForStage } from './api/earthApi'
export { loadEarthStages } from './lib/loadEarthStages'
export { useExploreStageFossils, useCourseStageFossils } from './hooks/useStageFossils'
export {
  PALEOMAP_AGES_IN_WEB,
  getClosestPaleoAge,
  hasPaleoTexture,
  getPaleoTexturePath,
} from './lib/paleoTextureMap'
export { applyGlobeTextureQuality } from './lib/planetTextureQuality'
export { STAGE_HOTSPOTS, getHotspotsForTime } from './lib/stageHotspots'
export type { StageHotspot } from './lib/stageHotspots'
export {
  ICONIC_ORGANISMS_BY_STAGE,
  getIconicOrganismsByStageId,
  getIconicOrganismsForStage,
} from './lib/iconicOrganisms'
export type { IconicOrganism } from './lib/iconicOrganisms'
export { PHYLUM_INFO, getPhylumColor, getPhylumInfo } from './lib/fossilPhyla'
export type { PhylumInfo, PhylumMetadataMap } from './lib/fossilPhyla'
export { Timeline } from './ui/Timeline'
export { InfoPanel } from './ui/InfoPanel'
export { FossilPanel } from './ui/FossilPanel'
export { FossilDetailDock, FossilDetailOverlay } from './ui/FossilDetailOverlay'
export { Controls } from './ui/Controls'
export { FeaturedOrganisms } from './ui/FeaturedOrganisms'
