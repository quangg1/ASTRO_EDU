import * as THREE from 'three'
import { viewRotationMatrix3, type SkyViewState } from './skyViewState'

const _v = new THREE.Vector3()
const _viewFromWorld = new THREE.Matrix3()

/** Cùng logic `stereographicVisible` trong shader — góc từ trục nhìn view. */
export function unitDirInStereoFov(
  dir: [number, number, number],
  view: SkyViewState,
  fovDeg: number,
): boolean {
  const maxTheta = ((fovDeg * 0.5) * Math.PI) / 180
  const worldFromView = viewRotationMatrix3(view, _viewFromWorld)
  const viewFromWorld = worldFromView.clone().transpose()
  _v.set(dir[0], dir[1], dir[2]).normalize()
  _v.applyMatrix3(viewFromWorld)
  const cosTheta = THREE.MathUtils.clamp(_v.y, -1, 1)
  const theta = Math.acos(cosTheta)
  return theta <= maxTheta + 1e-4
}

/** Scene unit vector (Y = zenith) — trên hoặc trên chân trời. */
export function isAboveSceneHorizon(dir: [number, number, number]): boolean {
  return dir[1] > -0.02
}

export function slerpUnitDirection(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const va = new THREE.Vector3(...a).normalize()
  const vb = new THREE.Vector3(...b).normalize()
  const dot = THREE.MathUtils.clamp(va.dot(vb), -1, 1)
  if (dot > 0.9995) {
    _v.copy(va).lerp(vb, t).normalize()
    return [_v.x, _v.y, _v.z]
  }
  const omega = Math.acos(dot)
  const sinOmega = Math.sin(omega)
  if (sinOmega < 1e-6) return [va.x, va.y, va.z]
  const w0 = Math.sin((1 - t) * omega) / sinOmega
  const w1 = Math.sin(t * omega) / sinOmega
  return [va.x * w0 + vb.x * w1, va.y * w0 + vb.y * w1, va.z * w0 + vb.z * w1]
}

/**
 * Great-circle arc on the celestial sphere → buffer positions (pairs for line segments).
 * Bỏ qua đoạn dưới chân trời hoặc ngoài FOV; không nối qua lỗ visibility.
 */
export function appendGreatCircleArcSegments(
  dirA: [number, number, number],
  dirB: [number, number, number],
  view: SkyViewState,
  fovDeg: number,
  radius: number,
  out: number[],
  steps = 14,
  revealBelowHorizon = false,
): void {
  const ok = (d: [number, number, number]) =>
    revealBelowHorizon || isAboveSceneHorizon(d)
  if (!ok(dirA) && !ok(dirB)) return

  const samples: [number, number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const d = slerpUnitDirection(dirA, dirB, t)
    if (!ok(d)) continue
    if (!unitDirInStereoFov(d, view, fovDeg)) continue
    samples.push(d)
  }

  for (let i = 0; i < samples.length - 1; i++) {
    const p0 = samples[i]
    const p1 = samples[i + 1]
    out.push(
      p0[0] * radius,
      p0[1] * radius,
      p0[2] * radius,
      p1[0] * radius,
      p1[1] * radius,
      p1[2] * radius,
    )
  }
}
