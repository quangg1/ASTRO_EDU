import * as THREE from 'three'
import { latLngToVector3 } from '@/lib/geo'

export const PLANET_GLOBE_RADIUS = 5
export const SITE_VIEW_OFFSET = 2.05
export const SITE_FLY_DURATION_SEC = 1.12

export function easeOutCubic(t: number): number {
  const u = THREE.MathUtils.clamp(t, 0, 1)
  return 1 - (1 - u) ** 3
}

export function siteSurfacePosition(lat: number, lng: number, radius = PLANET_GLOBE_RADIUS): THREE.Vector3 {
  return latLngToVector3(lat, lng, radius + 0.025)
}

export function computeSiteFlyGoal(
  lat: number,
  lng: number,
  planetGroup: THREE.Object3D,
  radius = PLANET_GLOBE_RADIUS,
  viewOffset = SITE_VIEW_OFFSET,
): { target: THREE.Vector3; camera: THREE.Vector3 } {
  const localSurf = latLngToVector3(lat, lng, radius)
  const worldSurf = localSurf.clone().applyMatrix4(planetGroup.matrixWorld)
  const planetCenter = new THREE.Vector3().setFromMatrixPosition(planetGroup.matrixWorld)
  const outward = worldSurf.clone().sub(planetCenter).normalize()
  const goalCam = worldSurf.clone().addScaledVector(outward, viewOffset)
  return { target: worldSurf, camera: goalCam }
}
