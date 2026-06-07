/**
 * Hướng nhìn stereographic: quay ngang + ngước lên/xuống.
 * viewAltRad: π/2 = thiên đỉnh, 0 = chân trời, âm = nhìn xuyên đất (nadir ≈ −π/2).
 */

import * as THREE from 'three'
import { horizontalToUnitVector } from '@/features/explore/lib/skyObserver'

export type SkyViewState = {
  viewAzRad: number
  viewAltRad: number
}

const _center = new THREE.Vector3()
const _east = new THREE.Vector3()
const _x = new THREE.Vector3()
const _y = new THREE.Vector3()
const _z = new THREE.Vector3()
const _mat3 = new THREE.Matrix3()

/**
 * Mặc định: ngẩng ~42°, hướng Nam–Đông — dải Ngân Hà + Orion trong khung (10°N, đêm 15/1).
 * (FOV mặc định ~86° trong `SKY_FOV_DEFAULT_DEG`.)
 */
export const DEFAULT_SKY_VIEW: SkyViewState = {
  viewAzRad: 2.15,
  viewAltRad: 0.74,
}

/** Nhìn tới thiên cực dưới chân (Stellarium ảnh 3 — chỉ còn nền sao). */
export const SKY_VIEW_ALT_MIN = -Math.PI / 2 + 0.07
export const SKY_VIEW_ALT_MAX = Math.PI / 2 - 0.02

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

export function clampViewAltRad(altRad: number): number {
  return Math.max(SKY_VIEW_ALT_MIN, Math.min(SKY_VIEW_ALT_MAX, altRad))
}

export function wrapViewAzRad(azRad: number): number {
  const t = azRad % (Math.PI * 2)
  return t < 0 ? t + Math.PI * 2 : t
}

/** Hướng unit trong scene (Y=zenith) trỏ tới tâm màn hình. */
export function viewCenterWorldDirection(view: SkyViewState, out = _center): THREE.Vector3 {
  const [x, y, z] = horizontalToUnitVector(view.viewAltRad, view.viewAzRad)
  return out.set(x, y, z)
}

/**
 * Ma trận 3×3: vector view-space → world.
 * View +Y = hướng nhìn; +X = Đông ngang; +Z = hoàn thành hệ tay phải.
 */
export function viewRotationMatrix3(view: SkyViewState, out = _mat3): THREE.Matrix3 {
  const center = viewCenterWorldDirection(view, _y)
  const cosAlt = Math.cos(view.viewAltRad)

  if (Math.abs(cosAlt) < 0.02) {
    // Gần thiên/nadir đỉnh: giữ roll theo viewAzRad — tránh khóa (1,0,0) gây lật ngược khi pan ngang.
    _east.set(Math.cos(view.viewAzRad), 0, Math.sin(view.viewAzRad))
  } else {
    _east.set(
      cosAlt * Math.cos(view.viewAzRad),
      0,
      cosAlt * Math.sin(view.viewAzRad),
    )
  }
  _east.normalize()

  _x.copy(_east)
  _y.copy(center).normalize()
  _z.crossVectors(_x, _y).normalize()
  _x.crossVectors(_y, _z).normalize()

  return out.set(_x.x, _y.x, _z.x, _x.y, _y.y, _z.y, _x.z, _y.z, _z.z)
}

/**
 * Độ đục landscape: 1 khi nhìn lên (view ban đầu), 0 khi kéo xuống tới nadir (Stellarium).
 * Chỉ mờ sau khi tầm nhìn xuống dưới chân trời (viewAltRad < 0).
 */
export function viewLandscapeOpacity(view: SkyViewState): number {
  const alt = view.viewAltRad
  const nadirRad = SKY_VIEW_ALT_MIN
  if (alt >= 0) return 1
  if (alt <= nadirRad) return 0
  const t = (alt - nadirRad) / -nadirRad
  return smoothstep01(t)
}

/** 0 = đục, 1 = mờ hết — dùng cho `LandscapeLowerHemisphere` (alpha *= 1 - fade). */
export function viewNadirLookAmount(view: SkyViewState): number {
  return 1 - viewLandscapeOpacity(view)
}

/** Kéo dọc: dy > 0 (kéo xuống) → hạ tầm nhìn về chân trời / xuyên đất. */
export function applyViewDrag(
  view: SkyViewState,
  deltaX: number,
  deltaY: number,
  sensitivity = 0.005,
): SkyViewState {
  return {
    viewAzRad: wrapViewAzRad(view.viewAzRad - deltaX * sensitivity),
    viewAltRad: clampViewAltRad(view.viewAltRad - deltaY * sensitivity),
  }
}
