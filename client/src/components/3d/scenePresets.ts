import { useSceneCommandStore } from '@/features/content3d/earth/public'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/public'
import { useShowcaseStore } from '@/features/content3d/showcase/public'
import type { ScenePreset } from './scene-host/scenePreset'

/**
 * Preset của từng cảnh 3D — file nhẹ (không kéo three/scene code) để Explore
 * chọn cảnh mà không phải tải trước mọi cảnh.
 */

export const EARTH_SCENE_PRESET: ScenePreset = {
  id: 'earth',
  camera: { position: [0, 5, 25], fov: 60, near: 0.006 },
  background: '#000000',
  toneMappingExposure: 1,
  raycast: { points: 0.42, line: 1 },
  onPointerMissed: () => useSceneCommandStore.getState().clearAllGlobeFossilUi(),
}

export const PLANET_HISTORY_SCENE_PRESET: ScenePreset = {
  id: 'planet-history',
  camera: { position: [0, 4, 22], fov: 58, near: 0.02 },
  background: '#100818',
  toneMappingExposure: 1.28,
  onPointerMissed: () => usePlanetNarrativeStore.getState().setSelectedSiteId(null),
}

export const SHOWCASE_SCENE_PRESET: ScenePreset = {
  id: 'showcase',
  camera: { position: [0, 19, 58], fov: 45 },
  background: '#000000',
  toneMappingExposure: 1.24,
  onPointerMissed: () => useShowcaseStore.getState().setFocusedEntity(null),
}
