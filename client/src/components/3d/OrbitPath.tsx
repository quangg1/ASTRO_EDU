'use client'

import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { PlanetData } from '@/lib/solarSystemData'
import { ORBIT_SEGMENTS, computeOrbitalPosition } from '@/lib/solarOrbitMath'
import { useLineProximityFade, type OrbitProximityFade } from '@/components/3d/orbitProximityFade'

export function OrbitPath({
  data,
  highlighted = false,
  visible = true,
  onHoverChange,
  interactive = true,
  proximityFade,
}: {
  data: PlanetData
  highlighted?: boolean
  visible?: boolean
  onHoverChange?: (hovered: boolean) => void
  interactive?: boolean
  /** When set, orbit opacity fades toward 0 as the camera approaches the given world point (NASA Eyes style). */
  proximityFade?: OrbitProximityFade
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
      const t = (i / ORBIT_SEGMENTS) * Math.PI * 2
      pts.push(computeOrbitalPosition(data, t))
    }
    return pts
  }, [data])
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points)
    return g
  }, [points])
  const materialRef = useRef<THREE.LineBasicMaterial>(null)
  useLineProximityFade(materialRef, proximityFade, () => (highlighted ? 0.92 : 0.42))
  return (
    <lineLoop
      geometry={geometry}
      visible={visible}
      raycast={interactive ? undefined : () => null}
      onPointerOver={
        interactive
          ? (e) => {
              e.stopPropagation()
              onHoverChange?.(true)
            }
          : undefined
      }
      onPointerOut={
        interactive
          ? (e) => {
              e.stopPropagation()
              onHoverChange?.(false)
            }
          : undefined
      }
    >
      <lineBasicMaterial
        ref={materialRef}
        color={data.orbitColor}
        transparent
        opacity={highlighted ? 0.92 : 0.42}
        depthWrite={false}
      />
    </lineLoop>
  )
}
