import * as THREE from 'three'
import { sunData } from '@/lib/solarSystemData'

const STORAGE_KEY = 'galaxies-solar-ship-pos'

export const STAGING_ORBIT = new THREE.Vector3(0, 0, 38)

export function loadShipPosition(): THREE.Vector3 {
  if (typeof window === 'undefined') return STAGING_ORBIT.clone()
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return STAGING_ORBIT.clone()
    const { x, y, z } = JSON.parse(raw) as { x?: number; y?: number; z?: number }
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
      return STAGING_ORBIT.clone()
    }
    if (!Number.isFinite(x + y + z)) return STAGING_ORBIT.clone()
    return new THREE.Vector3(x, y, z)
  } catch {
    return STAGING_ORBIT.clone()
  }
}

export function saveShipPosition(v: THREE.Vector3): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ x: v.x, y: v.y, z: v.z, t: Date.now() })
    )
  } catch {
    /* quota / private mode */
  }
}

/**
 * Giữ tàu ngoài vùng “cấm” quanh Mặt Trời — đủ xa để không “sát rạt” lõi.
 * Giữ minR < ~8 (tâm Sao Thủy) để đường bay vẫn có thể cắt qua vùng trong hệ.
 */
/** spaceScale: 1 = Observer; &lt;1 = cockpit (cùng hệ quy chiếu với quỹ đã scale). */
export function resolveSunClearance(ship: THREE.Vector3, spaceScale = 1): void {
  const d = ship.length()
  const minR = Math.min(7.8 * spaceScale, sunData.radius * spaceScale * 2.0 + 3.5 * spaceScale)
  if (d < minR && d > 1e-6) {
    ship.multiplyScalar(minR / d)
  }
}
