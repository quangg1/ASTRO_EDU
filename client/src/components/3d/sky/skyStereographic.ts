import * as THREE from 'three'
import { viewRotationMatrix3, type SkyViewState } from './skyViewState'

const _v = new THREE.Vector3()
const _va = new THREE.Vector3()
const _vb = new THREE.Vector3()
const _axis = new THREE.Vector3()
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

const HORIZON_Y_EPS = -0.02

/** Scene unit vector (Y = zenith) — trên hoặc trên chân trời. */
export function isAboveSceneHorizon(dir: [number, number, number]): boolean {
  return dir[1] > HORIZON_Y_EPS
}

/** Cung great-circle có được vẽ tại điểm mẫu `d` không (tránh cung ngắn xuyên ngược nửa cầu). */
function arcSampleVisible(
  d: [number, number, number],
  aAbove: boolean,
  bAbove: boolean,
  revealBelowHorizon: boolean,
): boolean {
  const above = d[1] > HORIZON_Y_EPS
  if (!revealBelowHorizon) return above
  if (!aAbove && !bAbove && above) return false
  if (aAbove && bAbove && !above) return false
  return true
}

export function slerpUnitDirection(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return greatCircleDirectionAt(a, b, t, false)
}

/** Điểm trên great-circle A→B; `longArc` khi cả hai đầu dưới chân trời và cung ngắn xuyên trời. */
function greatCircleDirectionAt(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
  longArc: boolean,
): [number, number, number] {
  _va.set(a[0], a[1], a[2]).normalize()
  _vb.set(b[0], b[1], b[2]).normalize()
  const dot = THREE.MathUtils.clamp(_va.dot(_vb), -1, 1)
  if (dot > 0.9995) {
    _v.copy(_va).lerp(_vb, t).normalize()
    return [_v.x, _v.y, _v.z]
  }
  _axis.crossVectors(_va, _vb)
  if (_axis.lengthSq() < 1e-12) return [_va.x, _va.y, _va.z]
  _axis.normalize()
  const omega = Math.acos(dot)
  const span = longArc ? Math.PI * 2 - omega : omega
  _v.copy(_va).applyAxisAngle(_axis, span * t).normalize()
  return [_v.x, _v.y, _v.z]
}

function shortArcPeaksAboveHorizon(
  dirA: [number, number, number],
  dirB: [number, number, number],
  steps: number,
): boolean {
  let maxY = -2
  for (let i = 0; i <= steps; i++) {
    const d = greatCircleDirectionAt(dirA, dirB, i / steps, false)
    maxY = Math.max(maxY, d[1])
  }
  return maxY > HORIZON_Y_EPS
}

function pushSegment(
  p0: [number, number, number],
  p1: [number, number, number],
  radius: number,
  out: number[],
): void {
  out.push(
    p0[0] * radius,
    p0[1] * radius,
    p0[2] * radius,
    p1[0] * radius,
    p1[1] * radius,
    p1[2] * radius,
  )
}

/**
 * Great-circle arc on the celestial sphere → buffer positions (pairs for line segments).
 * Bỏ qua đoạn dưới chân trời hoặc ngoài FOV; không nối qua lỗ visibility.
 */
export function appendGreatCircleArcSegments(
  dirA: [number, number, number],
  dirB: [number, number, number],
  radius: number,
  out: number[],
  steps = 14,
  revealBelowHorizon = false,
  /** Clip trên CPU — chỉ dùng khi cần; mặc định để shader stereographic clip (tránh giật khi pan). */
  view?: SkyViewState,
  fovDeg?: number,
): void {
  const aAbove = isAboveSceneHorizon(dirA)
  const bAbove = isAboveSceneHorizon(dirB)
  const ok = (d: [number, number, number]) =>
    arcSampleVisible(d, aAbove, bAbove, revealBelowHorizon)
  if (!ok(dirA) && !ok(dirB)) return

  const clipFov = view != null && fovDeg != null
  const useLongArc =
    revealBelowHorizon &&
    !aAbove &&
    !bAbove &&
    shortArcPeaksAboveHorizon(dirA, dirB, steps)

  let run: [number, number, number][] = []
  let lastStep = -2

  const flushRun = () => {
    for (let i = 0; i < run.length - 1; i++) {
      pushSegment(run[i], run[i + 1], radius, out)
    }
    run = []
    lastStep = -2
  }

  for (let i = 0; i <= steps; i++) {
    const d = greatCircleDirectionAt(dirA, dirB, i / steps, useLongArc)
    if (!ok(d)) {
      flushRun()
      continue
    }
    if (clipFov && !unitDirInStereoFov(d, view, fovDeg)) {
      flushRun()
      continue
    }
    if (lastStep >= 0 && i - lastStep > 1) flushRun()
    run.push(d)
    lastStep = i
  }
  flushRun()
}
