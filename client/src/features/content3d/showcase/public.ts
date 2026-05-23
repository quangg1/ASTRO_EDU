/** Showcase 3D catalog / orbit experience surface. */
export { useShowcaseStore } from './stores/showcaseStore'
export type { ShowcaseCameraState, ShowcaseEntityRef } from './types'
// Panel DTOs are part of the public surface so 3D presentational components
// (e.g. ShowcaseEntityPanel) can type their props without reaching into `api/`.
export type { ShowcasePanelBlockDTO, ShowcasePanelConfigDTO } from './api/showcaseEntitiesApi'
export * from './lib/showcaseLearningBridge'
export {
  PLANET_ACCENT,
  SHOWCASE_DEFAULT_ACCENT,
  resolvePlanetAccent,
} from './lib/planetAccent'
