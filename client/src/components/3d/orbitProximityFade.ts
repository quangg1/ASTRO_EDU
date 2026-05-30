'use client'

import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/** NASA Eyes–style: orbit lines stay visible from afar, fade out as the camera moves close to the body. */
export type OrbitProximityFade = {
  getWorldPosition: () => THREE.Vector3 | null
  near: number
  far: number
  /** Optional camera distance provider (e.g. to parent planet instead of Sun/body). */
  getCameraDistance?: (camera: THREE.Camera) => number | null
}

export function useLineProximityFade(
  materialRef: RefObject<THREE.LineBasicMaterial | null>,
  proximityFade: OrbitProximityFade | undefined,
  getBaseOpacity: () => number,
) {
  const { camera } = useThree()
  useFrame(() => {
    const m = materialRef.current
    if (!m) return
    const base = getBaseOpacity()
    if (!proximityFade) {
      m.opacity = base
      return
    }
    const p = proximityFade.getWorldPosition()
    if (!p || p.lengthSq() < 1e-10 || !Number.isFinite(p.x + p.y + p.z)) {
      m.opacity = base
      return
    }
    const overrideDist = proximityFade.getCameraDistance?.(camera) ?? null
    const d = Number.isFinite(overrideDist as number)
      ? (overrideDist as number)
      : camera.position.distanceTo(p)
    const { near, far } = proximityFade
    if (far <= near) {
      m.opacity = base
      return
    }
    const k = THREE.MathUtils.clamp((d - near) / (far - near), 0, 1)
    m.opacity = base * k
  })
}
