'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { NarrativeDustHaze, OutflowGlowTube } from '@/components/3d/NarrativeHistoryEffects'
import type { NarrativeBeatVisual } from '@/features/content3d/narrative/types'
import {
  cloneBeatVisual,
  lerpBeatVisual,
  resolveBeatVisual,
} from '@/features/content3d/narrative/lib/beatVisualLerp'
import { resolveFloodGlowVisible } from '@/features/content3d/narrative/lib/effectHelpers'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/stores/planetNarrativeStore'

const VOID_RAYCAST: THREE.Object3D['raycast'] = () => {}

const LERP_SPEED = 2.4

type Props = {
  globeRadius: number
}

/** Layer khí / nước / bụi — 1 albedo, uniform theo beat (lerp khi đổi timeline). */
export function EraVisualLayers({ globeRadius }: Props) {
  const currentBeat = usePlanetNarrativeStore((s) => s.currentBeat)
  const effectDustDemo = usePlanetNarrativeStore((s) => s.effectDustDemo)
  const effectFloodDemo = usePlanetNarrativeStore((s) => s.effectFloodDemo)

  const targetRef = useRef<NarrativeBeatVisual>(resolveBeatVisual(currentBeat))
  const displayRef = useRef<NarrativeBeatVisual>(cloneBeatVisual(targetRef.current))

  const atmMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#4477cc',
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  )

  const waterMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#1d4ed8',
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  )

  useEffect(() => {
    targetRef.current = resolveBeatVisual(currentBeat)
  }, [currentBeat])

  useEffect(() => {
    return () => {
      atmMat.dispose()
      waterMat.dispose()
    }
  }, [atmMat, waterMat])

  useFrame((_, dt) => {
    const target = targetRef.current
    displayRef.current = lerpBeatVisual(displayRef.current, target, Math.min(1, dt * LERP_SPEED))
    const d = displayRef.current

    atmMat.color.set(d.atmosphereColor)
    atmMat.opacity = d.atmosphereThickness * 0.92

    /** Minh họa nước cổ — giữ ~0.3–0.35 ở coverage cao, tránh giống đại dương Trái Đất. */
    waterMat.opacity = d.waterCoverage * 0.32
  })

  const showFloodGlow = resolveFloodGlowVisible(currentBeat, effectFloodDemo)
  const d = displayRef.current
  const atmScale = 1.028 + d.atmosphereThickness * 0.045

  return (
    <>
      <mesh scale={[atmScale, atmScale, atmScale]} material={atmMat} raycast={VOID_RAYCAST}>
        <sphereGeometry args={[globeRadius, 64, 64]} />
      </mesh>

      <mesh scale={[1.012, 1.012, 1.012]} material={waterMat} raycast={VOID_RAYCAST}>
        <sphereGeometry args={[globeRadius, 72, 72]} />
      </mesh>

      <NarrativeDustHaze globeRadius={globeRadius} visualRef={displayRef} effectDustDemo={effectDustDemo} />

      {showFloodGlow ? <OutflowGlowTube globeRadius={globeRadius} /> : null}
    </>
  )
}
