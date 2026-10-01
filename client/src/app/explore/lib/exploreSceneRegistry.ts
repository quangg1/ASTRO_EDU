import type { ScenePreset } from '@/components/3d/scene-host/scenePreset'
import {
  EARTH_SCENE_PRESET,
  PLANET_HISTORY_SCENE_PRESET,
  SHOWCASE_SCENE_PRESET,
} from '@/components/3d/scenePresets'

/**
 * Các cảnh của Explore và cách chúng được dựng. Trước đây là một chuỗi ternary
 * trong ExploreSceneCanvas; thêm cảnh mới = thêm một dòng ở đây + một nhánh render.
 *
 * - `shared`: chạy trong Canvas dùng chung (giữ WebGL context khi đổi cảnh).
 * - `own`: cảnh tự có Canvas (bầu trời: camera trực giao + lớp nhãn DOM riêng).
 */
export type ExploreSceneId = 'sky' | 'earth' | 'earth-history' | 'planet-history' | 'showcase'

export type ExploreSceneEntry =
  | { id: ExploreSceneId; canvas: 'own' }
  | { id: ExploreSceneId; canvas: 'shared'; preset: ScenePreset }

export const EXPLORE_SCENES: Record<ExploreSceneId, ExploreSceneEntry> = {
  sky: { id: 'sky', canvas: 'own' },
  earth: { id: 'earth', canvas: 'shared', preset: EARTH_SCENE_PRESET },
  // Cùng preset với 'earth' nên chuyển qua lại không dựng lại cảnh Trái Đất.
  'earth-history': { id: 'earth-history', canvas: 'shared', preset: EARTH_SCENE_PRESET },
  'planet-history': { id: 'planet-history', canvas: 'shared', preset: PLANET_HISTORY_SCENE_PRESET },
  showcase: { id: 'showcase', canvas: 'shared', preset: SHOWCASE_SCENE_PRESET },
}

export function resolveExploreSceneId(input: {
  exploreView: string
  sceneMode: string
  planetHistoryEntityId: string | null | undefined
  hasEarthHistoryStage: boolean
  hasPlanetGlobe: boolean
}): ExploreSceneId {
  if (input.exploreView === 'sky') return 'sky'
  if (input.sceneMode === 'earth') return 'earth'
  if (input.sceneMode === 'planet-history') {
    if (input.planetHistoryEntityId === 'planet-earth' && input.hasEarthHistoryStage) return 'earth-history'
    if (input.hasPlanetGlobe) return 'planet-history'
  }
  return 'showcase'
}
