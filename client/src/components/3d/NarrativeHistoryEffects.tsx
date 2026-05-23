'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import type { NarrativeBeatVisual } from '@/features/content3d/narrative/types'
import * as THREE from 'three'
import { latLngToVector3 } from '@/lib/geo'
import { OUTFLOW_GLOW_LATLNG } from '@/features/content3d/narrative/lib/outflowGlowPath'

const VOID_RAYCAST: THREE.Object3D['raycast'] = () => {}

type NarrativeDustHazeProps = {
  globeRadius: number
  /** 0 ẩn; 1–3 cường độ minh họa (legacy / demo). */
  intensity?: number
  /** 0..1 — ưu tiên hơn intensity khi set (shader-era `dustOpacity`). */
  dustOpacity?: number
  /** Đọc mỗi frame (lerp era) — ưu tiên hơn dustOpacity tĩnh. */
  visualRef?: RefObject<NarrativeBeatVisual>
  effectDustDemo?: boolean
}

/** Vỏ điểm quanh Sao Hỏa — minh họa khí/bụi; không có quy mô vật lý đúng. */
export function NarrativeDustHaze({
  globeRadius,
  intensity = 0,
  dustOpacity,
  visualRef,
  effectDustDemo = false,
}: NarrativeDustHazeProps) {
  const ref = useRef<THREE.Points>(null)
  const liveOpacityRef = useRef(0)
  const effectiveIntensity =
    dustOpacity != null ? Math.min(3, Math.max(0, dustOpacity * 3.2)) : intensity

  const { geom } = useMemo(() => {
    const count = Math.min(6200, 900 + effectiveIntensity * 1500)
    const positions = new Float32Array(count * 3)
    const rng = seededRandom(effectiveIntensity * 997 + globeRadius)

    for (let i = 0; i < count; i++) {
      const u = rng()
      const v = rng()
      const theta = u * Math.PI * 2
      const phi = Math.acos(2 * v - 1)
      const rLift = globeRadius * (1.035 + rng() * 0.065)
      const sinPhi = Math.sin(phi)
      positions[i * 3] = rLift * sinPhi * Math.cos(theta)
      positions[i * 3 + 1] = rLift * Math.cos(phi)
      positions[i * 3 + 2] = rLift * sinPhi * Math.sin(theta)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geom: g, n: count }
  }, [globeRadius, intensity])

  useEffect(() => {
    return () => {
      geom.dispose()
    }
  }, [geom])

  const baseOpacity =
    dustOpacity != null ? 0.08 + dustOpacity * 0.42 : 0.12 + effectiveIntensity * 0.11
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color('#fdba74'),
        size: 0.045 + effectiveIntensity * 0.018,
        transparent: true,
        opacity: baseOpacity,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    [effectiveIntensity, baseOpacity, dustOpacity],
  )

  useEffect(() => {
    return () => {
      mat.dispose()
    }
  }, [mat])

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    if (visualRef?.current) {
      const demo = effectDustDemo ? 0.18 : 0
      liveOpacityRef.current = Math.min(1, visualRef.current.dustOpacity + demo)
      mat.opacity = 0.08 + liveOpacityRef.current * 0.42 + Math.sin(t * 0.7) * 0.04
      ref.current.rotation.y = t * 0.012 * Math.max(0.15, liveOpacityRef.current * 3)
      return
    }
    const pulse = dustOpacity != null ? dustOpacity : effectiveIntensity
    mat.opacity = baseOpacity + Math.sin(t * 0.7 + pulse) * 0.045
    ref.current.rotation.y = t * 0.012 * Math.max(0.15, pulse)
  })

  if (
    !visualRef &&
    effectiveIntensity <= 0 &&
    (dustOpacity == null || dustOpacity <= 0)
  ) {
    return null
  }

  return <points ref={ref} geometry={geom} material={mat} raycast={VOID_RAYCAST} />
}

type MarsOutflowGlowProps = {
  globeRadius: number
}

/** Vệt ống phát quang minh họa dòng “lũ / kênh đổ ra” (Noachian–Hesperian). */
export function OutflowGlowTube({ globeRadius }: MarsOutflowGlowProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const { geo, material } = useMemo(() => {
    const lift = globeRadius + 0.065
    const pts = OUTFLOW_GLOW_LATLNG.map(([lat, lng]) => latLngToVector3(lat, lng, lift))
    const curve = new THREE.CatmullRomCurve3(pts, false)
    const g = new THREE.TubeGeometry(curve, Math.min(96, pts.length * 22), 0.068, 6, false)
    const m = new THREE.MeshStandardMaterial({
      color: '#0c4a6e',
      emissive: '#38bdf8',
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.82,
      roughness: 0.62,
      metalness: 0.06,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    return { geo: g, material: m }
  }, [globeRadius])

  useEffect(() => {
    return () => {
      geo.dispose()
      material.dispose()
    }
  }, [geo, material])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    const m = meshRef.current.material as THREE.MeshStandardMaterial
    m.emissiveIntensity = 0.42 + Math.sin(t * 1.6) * 0.22
  })

  return <mesh ref={meshRef} geometry={geo} material={material} raycast={VOID_RAYCAST} />
}

function seededRandom(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}
