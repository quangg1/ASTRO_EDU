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
