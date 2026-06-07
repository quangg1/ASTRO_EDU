import * as THREE from 'three'
import { isResolvableShowcaseAssetUrl } from '@/lib/showcaseMediaUrl'
import type { ShowcaseOrbitEntity } from './showcaseCatalogRuntime'
import type { ShowcaseStoryCamera, ShowcaseStoryWaypoint } from './showcaseStoryTypes'

export function showcaseEntityHasModel(entity: ShowcaseOrbitEntity | null | undefined): boolean {
  if (!entity) return false
  if (isResolvableShowcaseAssetUrl(String(entity.remoteModelUrl || ''))) return true
  return String(entity.modelPath || '').trim().length > 1
}

export function resolveCraftModelBodySceneSize(entity: ShowcaseOrbitEntity | null | undefined): number {
  const size = Math.max(0.02, Number(entity?.size ?? 0.04))
  const scale = Math.max(0.05, Number(entity?.modelScale ?? 1))
  // GLB cần lớn hơn tỉ lệ vật lý so với Trái Đất — `satelliteSphereRadius` (~0.01) quá nhỏ để nhìn.
  return Math.max(0.16, size * 4.2 * scale)
}

/** Khoảng cách camera (scene units) để khung mesh — khớp `ShowcaseModelEntityMesh` (size × 2.4 × scale). */
export function resolveShowcaseEntityCloseupDistance(
  entity: ShowcaseOrbitEntity | null | undefined,
  kind: 'craft' | 'moon' | 'comet' | 'planet' | 'default' = 'default',
): number {
  const size = Math.max(0.02, Number(entity?.size ?? 0.04))
  const scale = Math.max(0.05, Number(entity?.modelScale ?? 1))
  const hasModel = showcaseEntityHasModel(entity)
  const entityId = String(entity?.id || '')

  if (hasModel) {
    const bodySize = resolveCraftModelBodySceneSize(entity)
    const meshDiameter = bodySize * 2.4 * 1.35
    return THREE.MathUtils.clamp(meshDiameter * 2.35, 0.22, 0.55)
  }

  if (entityId.startsWith('sc-') || kind === 'craft') {
    return THREE.MathUtils.clamp(Math.max(0.75, size * 38), 0.65, 2.2)
  }
  if (entityId.startsWith('comet-') || kind === 'comet') {
    return THREE.MathUtils.clamp(Math.max(1.2, size * 28), 1.1, 3.6)
  }
  if (entityId.startsWith('moon-') || kind === 'moon') {
    const bodySize = Math.max(0.08, size * 2.1)
    return THREE.MathUtils.clamp(bodySize * 5.5, 1.8, 4.8)
  }
  if (entityId.startsWith('planet-') || kind === 'planet') {
    return 6.8
  }
  return kind === 'default' ? 4.8 : 4.8
}

export function resolveStoryTourCameraForWaypoint(
  waypoint: ShowcaseStoryWaypoint,
  entityId: string,
  orbitEntity?: ShowcaseOrbitEntity | null,
): ShowcaseStoryCamera | null {
  if (waypoint.camera && !entityId.trim().startsWith('sc-') && !entityId.trim().startsWith('moon-')) {
    return waypoint.camera
  }

  const id = entityId.trim()
  if (id.startsWith('sc-')) {
    const autoDist = resolveShowcaseEntityCloseupDistance(orbitEntity, 'craft')
    const cam = waypoint.camera
    return {
      distance: showcaseEntityHasModel(orbitEntity) ? autoDist : (cam?.distance ?? autoDist),
      az: cam?.az ?? (id.includes('iss') ? 32 : 46),
      el: cam?.el ?? (id.includes('iss') ? 10 : 16),
    }
  }
  if (id.startsWith('moon-')) {
    const autoDist = resolveShowcaseEntityCloseupDistance(orbitEntity, 'moon')
    const cam = waypoint.camera
    return {
      distance: cam?.distance ?? autoDist,
      az: cam?.az ?? 40,
      el: cam?.el ?? 12,
    }
  }
  if (id.startsWith('comet-')) {
    return {
      distance: resolveShowcaseEntityCloseupDistance(orbitEntity, 'comet'),
      az: 38,
      el: 14,
    }
  }
  return null
}
