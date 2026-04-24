import * as THREE from 'three'
import type { PlanetData } from '@/lib/solarSystemData'

export const ORBIT_SEGMENTS = 128

export function computeOrbitalPosition(data: PlanetData, angle: number, orbitScale = 1): THREE.Vector3 {
  const e = data.orbitEccentricity ?? 0
  const incl = THREE.MathUtils.degToRad(data.orbitInclinationDeg ?? 0)
  const node = THREE.MathUtils.degToRad(data.orbitAscendingNodeDeg ?? 0)
  const a = orbitScale * data.distance
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(angle))
  const x = r * Math.cos(angle)
  const z = r * Math.sin(angle)
  const v = new THREE.Vector3(x, 0, z)
  v.applyAxisAngle(new THREE.Vector3(1, 0, 0), incl)
  v.applyAxisAngle(new THREE.Vector3(0, 1, 0), node)
  return v
}
