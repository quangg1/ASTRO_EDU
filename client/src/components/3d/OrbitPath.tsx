'use client'

import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { PlanetData } from '@/lib/solarSystemData'
import { computeOrbitalPosition } from '@/lib/solarOrbitMath'
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
    const e = THREE.MathUtils.clamp(data.orbitEccentricity ?? 0, 0, 0.95)
    const segments = Math.max(128, Math.min(720, Math.round(128 + data.distance * 2.2 + e * 240)))
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= segments; i++) {
      const u = (i / segments) * Math.PI * 2
      // Sample via eccentric anomaly to avoid visibly "equal-step" corners on elliptical orbits.
      const t =
        e > 1e-5
          ? 2 *
            Math.atan2(
              Math.sqrt(1 + e) * Math.sin(u / 2),
              Math.sqrt(1 - e) * Math.cos(u / 2),
            )
          : u
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
        linewidth={highlighted ? 2 : 1.5}
      />
    </lineLoop>
  )
}
