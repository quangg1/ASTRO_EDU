/** Showcase 3D catalog / orbit experience surface. */
export { useShowcaseStore } from './stores/showcaseStore'
export type { ShowcaseCameraState, ShowcaseEntityRef } from './types'
export { fetchExploreContextualQuiz } from './api/exploreContextualQuizApi'
export type { ExploreContextualQuizResponse } from './api/exploreContextualQuizApi'
export { buildExploreContextualQuiz } from './lib/buildExploreContextualQuiz'
export * from './lib/showcaseLearningBridge'
export { resolveExplorePanelConfig, deriveExploreStateBadge } from './lib/resolveExplorePanelConfig'
export {
  listShowcaseSatellitesForPlanet,
  resolveShowcaseHostPlanetName,
  resolveShowcaseOrbitPeriodSeconds,
  isShowcaseSatelliteEntity,
} from './lib/showcaseCatalogRuntime'
export {
  PLANET_ACCENT,
  SHOWCASE_DEFAULT_ACCENT,
  resolvePlanetAccent,
} from './lib/planetAccent'
export {
  fetchPublicShowcaseEntityContents,
  fetchEditorShowcaseEntityContents,
  saveShowcaseEntityContents,
  createShowcaseEntity,
  deleteShowcaseEntity,
} from './api/showcaseEntitiesApi'
export type {
  ShowcaseEntityContentDTO,
  ShowcasePanelBlockDTO,
  ShowcasePanelConfigDTO,
  ShowcaseEditorCatalogItem,
  ShowcaseEditorFetchResult,
  CreateShowcaseEntityInput,
} from './api/showcaseEntitiesApi'
export {
  fetchJplShowcaseOrbits,
  syncShowcaseOrbitEntityFromJpl,
} from './api/showcaseOrbitsApi'
export type { ShowcaseJplOrbitDTO } from './api/showcaseOrbitsApi'
export {
  fetchPublicShowcaseCatalogBundle,
  fetchEditorShowcaseCatalogBundle,
  saveShowcaseCatalogBundleEditor,
} from './api/showcaseCatalogApi'
export {
  NASA_SHOWCASE_ITEMS,
  SHOWCASE_ORBIT_ENTITIES,
  hydrateShowcaseCatalogBundle,
  getNasaCatalogItemById,
  resolveShowcaseOrbitParentPlanetName,
} from './lib/showcaseCatalogRuntime'
export type { NasaCatalogItem, NasaStory, ShowcaseOrbitEntity } from './lib/showcaseCatalogRuntime'
export {
  mergeNasaCatalog,
  mergeOrbitEntities,
  buildPlanetShowcaseEntity,
  buildStudioGlobeEntity,
  hasUsableOrbitalElements,
} from './lib/mergeShowcaseCatalog'
export type { ResolvedNasaCatalogItem } from './lib/mergeShowcaseCatalog'
export { planetsData, sunData } from './lib/solarSystemData'
export type { PlanetData } from './lib/solarSystemData'
export { computeOrbitalPosition } from './lib/solarOrbitMath'
