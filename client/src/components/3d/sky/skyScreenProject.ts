/** Chiếu hướng world → màn hình fisheye (tâm = hướng nhìn view). */

import * as THREE from 'three'
import { viewRotationMatrix3, type SkyViewState } from './skyViewState'

export type ViewAttitude = SkyViewState

const _inv = new THREE.Matrix3()
const _v = new THREE.Vector3()

export function stereographicScreenPercent(
  dir: [number, number, number],
  view: ViewAttitude,
  fovDeg: number,
  aspect = 1,
): { leftPct: number; topPct: number; visible: boolean } | null {
  _v.set(dir[0], dir[1], dir[2])
  _inv.copy(viewRotationMatrix3(view)).transpose()
  _v.applyMatrix3(_inv)

  const theta = Math.acos(Math.min(1, Math.max(-1, _v.y)))
  const maxTheta = ((fovDeg * 0.5) * Math.PI) / 180
  if (theta > maxTheta) return null

  const tanHalf = Math.tan(maxTheta * 0.5)
  const r = Math.tan(theta * 0.5) / tanHalf
  const phi = Math.atan2(_v.z, _v.x)
  const x = r * Math.cos(phi)
  const z = r * Math.sin(phi)
  const clipX = x / aspect
  const clipZ = z
  if (clipX * clipX + clipZ * clipZ > 1) return null

  return {
    leftPct: 50 + clipX * 50,
    topPct: 50 - clipZ * 50,
    visible: true,
  }
}
