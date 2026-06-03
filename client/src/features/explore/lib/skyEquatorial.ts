/** Scene (alt-az Y-up) → equatorial — Milky Way texture equirectangular. */

import * as THREE from 'three'
import { equatorialToSceneVector, type SkyObserver } from './skyObserver'

function equatorialUnit(raDeg: number, decDeg: number): THREE.Vector3 {
  const ra = (raDeg * Math.PI) / 180
  const dec = (decDeg * Math.PI) / 180
  const cd = Math.cos(dec)
  return new THREE.Vector3(cd * Math.cos(ra), Math.sin(dec), cd * Math.sin(ra))
}

function sceneVec(raDeg: number, decDeg: number, obs: SkyObserver): THREE.Vector3 {
  const s = equatorialToSceneVector(raDeg, decDeg, obs)
  return new THREE.Vector3(s[0], s[1], s[2])
}

/**
 * eq = sceneToEquat × w — khớp cùng hệ với `equatorialToSceneVector`.
 */
export function buildSceneToEquatorialMatrix(obs: SkyObserver): THREE.Matrix3 {
  const s0 = sceneVec(0, 0, obs)
  const s1 = sceneVec(90, 0, obs)
  const s2 = sceneVec(0, 60, obs)
  const e0 = equatorialUnit(0, 0)
  const e1 = equatorialUnit(90, 0)
  const e2 = equatorialUnit(0, 60)

  const S = new THREE.Matrix3().set(
    s0.x,
    s1.x,
    s2.x,
    s0.y,
    s1.y,
    s2.y,
    s0.z,
    s1.z,
    s2.z,
  )
  const E = new THREE.Matrix3().set(
    e0.x,
    e1.x,
    e2.x,
    e0.y,
    e1.y,
    e2.y,
    e0.z,
    e1.z,
    e2.z,
  )

  const sceneFromEquat = S.clone().multiply(E.clone().invert())
  return sceneFromEquat.clone().invert()
}
