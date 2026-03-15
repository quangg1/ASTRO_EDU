'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Preload } from '@react-three/drei'
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Earth } from './Earth'
import { FossilPoints } from './FossilPoints'
import { GeoLabels } from './GeoLabels'
import { Moon } from './Moon'
import { useSimulatorStore } from '@/store/useSimulatorStore'
import { fetchFossilsForStage } from '@/lib/api'
import { latLngToVector3 } from '@/lib/geo'
import type { EarthStage } from '@/types'
import type { Fossil } from '@/types'

const EARTH_RADIUS = 5
const FLY_TARGET_LERP = 0.1
const FLY_DONE_DIST = 0.08
/** Khoảng cách camera → target khi fly-to (cận cảnh để phân biệt hóa thạch gần nhau). Khớp minDistance của OrbitControls. */
const FLY_CAMERA_DISTANCE = 8
const FLY_CAMERA_LERP = 0.08
const PHYLUM_LINE_RADIUS = EARTH_RADIUS + 0.25
const PHYLUM_LINE_MAX_POINTS = 120
const SINGLE_MARKER_RADIUS = EARTH_RADIUS + 0.22
const SINGLE_MARKER_SIZE = 0.18

/** Đường nối các mẫu trong một ngành (khi Đi tới theo ngành) – vòng kín quanh vùng phân bố. */
function PhylumOutlineLine({ fossils }: { fossils: Fossil[] }) {
  const points = useMemo(() => {
    const withCoords = fossils
      .map((f) => {
        const lat = f.paleolat ?? f.lat
        const lng = f.paleolng ?? f.lng
        if (lat == null || lng == null) return null
        return { lat, lng }
      })
      .filter((p): p is { lat: number; lng: number } => p != null)
    if (withCoords.length < 2) return new Float32Array(0)
    const n = withCoords.length
    const cLat = withCoords.reduce((s, p) => s + p.lat, 0) / n
    const cLng = withCoords.reduce((s, p) => s + p.lng, 0) / n
    const sorted = [...withCoords].sort(
      (a, b) =>
        Math.atan2(a.lat - cLat, a.lng - cLng) - Math.atan2(b.lat - cLat, b.lng - cLng)
    )
    let usePoints = sorted
    if (sorted.length > PHYLUM_LINE_MAX_POINTS) {
      const step = sorted.length / PHYLUM_LINE_MAX_POINTS
      usePoints = []
      for (let i = 0; i < PHYLUM_LINE_MAX_POINTS; i++) {
        usePoints.push(sorted[Math.min(Math.floor(i * step), sorted.length - 1)])
      }
    }
    const closed = [...usePoints, usePoints[0]]
    const pos = new Float32Array(closed.length * 3)
    closed.forEach((p, i) => {
      const v = latLngToVector3(p.lat, p.lng, PHYLUM_LINE_RADIUS)
      pos[i * 3] = v.x
      pos[i * 3 + 1] = v.y
      pos[i * 3 + 2] = v.z
    })
    return pos
  }, [fossils])

  if (points.length < 6) return null

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length / 3}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#00d4ff" transparent opacity={0.92} />
    </line>
  )
}

/** Tín hiệu rõ ràng vị trí một mẫu (khi Đi tới theo mẫu cụ thể): chấm sáng + vòng pulse nằm trên mặt cầu. */
function SingleFossilMarker({ lat, lng }: { lat: number; lng: number }) {
  const { pos, quat } = useMemo(() => {
    const p = latLngToVector3(lat, lng, SINGLE_MARKER_RADIUS)
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      p.clone().normalize()
    )
    return { pos: p, quat: q }
  }, [lat, lng])
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ringRef.current) return
    const t = state.clock.elapsedTime
    const scale = 1 + Math.sin(t * 2.5) * 0.35
    ringRef.current.scale.setScalar(scale)
    const mat = ringRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.5 + Math.sin(t * 2.5) * 0.25
  })

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      <mesh>
        <sphereGeometry args={[SINGLE_MARKER_SIZE, 20, 16]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
      <mesh ref={ringRef} quaternion={quat}>
        <torusGeometry args={[0.35, 0.04, 16, 32]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.7} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Nhóm Trái Đất + hóa thạch; hỗ trợ override từ khóa học (stage + fossils) */
const EarthWithFossils = React.forwardRef<
  THREE.Group,
  { stageOverride?: EarthStage | null; fossilsOverride?: Fossil[] | null }
>(function EarthWithFossils({ stageOverride, fossilsOverride }, ref) {
  const {
    currentStage: storeStage,
    showFossils,
    showPlaceLabels,
    earthRotationPaused,
    flyToTarget,
  } = useSimulatorStore()
  const stage = stageOverride ?? storeStage
  const groupRef = useRef<THREE.Group>(null)
  const setRef = (node: THREE.Group | null) => {
    (groupRef as React.MutableRefObject<THREE.Group | null>).current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) (ref as React.MutableRefObject<THREE.Group | null>).current = node
  }

  useFrame((_, delta) => {
    if (groupRef.current && !earthRotationPaused) groupRef.current.rotation.y += delta * 0.1
  })

  const canShowPlaceLabels = stage.time <= 23
  const showFossilsForStage = stageOverride != null ? true : showFossils
  const showPhylumLine = flyToTarget?.mode === 'phylum' && (flyToTarget.phylumFossils?.length ?? 0) > 0
  const showSingleMarker = flyToTarget?.mode === 'single'

  return (
    <group ref={setRef}>
      <Earth stage={stage} />
      {showFossilsForStage && <FossilPoints fossilsOverride={fossilsOverride} />}
      {showPhylumLine && flyToTarget.phylumFossils && (
        <PhylumOutlineLine fossils={flyToTarget.phylumFossils} />
      )}
      {showSingleMarker && (
        <SingleFossilMarker lat={flyToTarget.lat} lng={flyToTarget.lng} />
      )}
      <GeoLabels visible={showPlaceLabels && canShowPlaceLabels} />
    </group>
  )
})

const SINGLE_MARKER_MIN_DURATION = 2

/** Chỉ move camera, không xoay Trái Đất (giữ đúng trục). Phylum = không zoom; single = zoom cận + marker 2s. */
function FlyToController({
  earthGroupRef,
  controlsRef,
}: {
  earthGroupRef: React.RefObject<THREE.Group | null>
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}) {
  const { camera } = useThree()
  const { flyToTarget, setFlyToTarget } = useSimulatorStore()
  const worldTarget = useRef(new THREE.Vector3())
  const desiredCameraPos = useRef(new THREE.Vector3())
  const singleMarkerShownAt = useRef<number | null>(null)
  const phylumCameraDistance = useRef(0)
  const prevFlyMode = useRef<string | null>(null)

  useFrame((state) => {
    if (!flyToTarget || !earthGroupRef?.current || !controlsRef?.current) return

    const earth = earthGroupRef.current
    const controls = controlsRef.current
    const clock = state.clock

    if (prevFlyMode.current !== flyToTarget.mode) {
      prevFlyMode.current = flyToTarget.mode ?? null
      if (flyToTarget.mode === 'phylum') {
        phylumCameraDistance.current = camera.position.length()
      }
    }

    const localUnit = latLngToVector3(flyToTarget.lat, flyToTarget.lng, 1).normalize()
    const localPoint = localUnit.clone().multiplyScalar(EARTH_RADIUS)
    worldTarget.current.copy(localPoint).applyMatrix4(earth.matrixWorld)
    controls.target.lerp(worldTarget.current, FLY_TARGET_LERP)

    if (flyToTarget.mode === 'phylum') {
      singleMarkerShownAt.current = null
      const dist = phylumCameraDistance.current > 0 ? phylumCameraDistance.current : camera.position.length()
      desiredCameraPos.current
        .copy(worldTarget.current)
        .normalize()
        .multiplyScalar(dist)
      camera.position.lerp(desiredCameraPos.current, FLY_CAMERA_LERP)
      return
    }

    if (flyToTarget.mode === 'single') {
      const distToTarget = camera.position.distanceTo(controls.target)
      if (distToTarget > FLY_CAMERA_DISTANCE + 0.05) {
        desiredCameraPos.current
          .copy(worldTarget.current)
          .add(worldTarget.current.clone().normalize().multiplyScalar(FLY_CAMERA_DISTANCE))
        camera.position.lerp(desiredCameraPos.current, FLY_CAMERA_LERP)
      }
      const targetDone = controls.target.distanceTo(worldTarget.current) < FLY_DONE_DIST
      const zoomDone = camera.position.distanceTo(controls.target) <= FLY_CAMERA_DISTANCE + 0.1
      if (targetDone && zoomDone) {
        if (singleMarkerShownAt.current === null) {
          singleMarkerShownAt.current = clock.elapsedTime
        }
        if (clock.elapsedTime - singleMarkerShownAt.current >= SINGLE_MARKER_MIN_DURATION) {
          setFlyToTarget(null)
          singleMarkerShownAt.current = null
        }
      }
    }
  })

  return null
}

interface SceneProps {
  overrideStage?: EarthStage | null
  overrideFossils?: Fossil[] | null
}

function Scene({ overrideStage, overrideFossils }: SceneProps = {}) {
  const earthGroupRef = useRef<THREE.Group>(null)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const { 
    currentStage, 
    setFossils,
    setFossilStats,
    setFossilsLoading,
    loadPhylumMetadata,
  } = useSimulatorStore()

  const [courseFossils, setCourseFossils] = useState<Fossil[]>([])
  const stage = overrideStage ?? currentStage
  const fossils = overrideStage != null ? courseFossils : null

  useEffect(() => {
    loadPhylumMetadata()
  }, [loadPhylumMetadata])

  // Khi có overrideStage (khóa học): load fossils cho thời kỳ đó
  useEffect(() => {
    if (overrideStage == null) return
    let cancelled = false
    fetchFossilsForStage(overrideStage).then(({ fossils: list }) => {
      if (!cancelled) setCourseFossils(list)
    })
    return () => { cancelled = true }
  }, [overrideStage?.id, overrideStage?.time, overrideStage?.name])

  // Khi không override: load fossils theo store (explore). Refetch khi stage hoặc time range thay đổi.
  useEffect(() => {
    if (overrideStage != null) return
    let cancelled = false
    const loadFossils = async () => {
      setFossilsLoading(true)
      const { fossils: list, total } = await fetchFossilsForStage(currentStage)
      if (cancelled) return
      setFossils(list)
      if (list.length > 0 || total > 0) {
        const byPhylum = list.reduce((acc, f) => {
          const p = f.phylum || 'Unknown'
          acc[p] = (acc[p] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        setFossilStats({ total, byPhylum })
      } else {
        setFossilStats({ total: 0, byPhylum: {} })
      }
      setFossilsLoading(false)
    }
    loadFossils()
    return () => { cancelled = true }
  }, [overrideStage, currentStage.id, currentStage.time, currentStage.maxMa, currentStage.minMa, setFossils, setFossilStats, setFossilsLoading])

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[100, 50, 100]} intensity={2.2} color="#FFFFDD" />
      <pointLight position={[-10, 5, 10]} intensity={0.4} color="#4488ff" />

      <Stars radius={300} depth={60} count={5000} factor={4} saturation={0} fade speed={1} />

      <EarthWithFossils
        ref={earthGroupRef}
        stageOverride={overrideStage}
        fossilsOverride={fossils}
      />

      {stage.moonDistance != null && <Moon distance={stage.moonDistance} />}

      {overrideStage == null && (
        <FlyToController earthGroupRef={earthGroupRef} controlsRef={controlsRef} />
      )}

      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={8}
        maxDistance={100}
        autoRotate={false}
      />
    </>
  )
}

export interface EarthSceneProps {
  /** Dùng trong khóa học: hiển thị Trái Đất ở đúng thời kỳ này (và load fossils tương ứng) */
  overrideStage?: EarthStage | null
}

export default function EarthScene({ overrideStage }: EarthSceneProps = {}) {
  return (
    <Canvas
      camera={{ position: [0, 5, 25], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#000000' }}
    >
      <Suspense fallback={null}>
        <Scene overrideStage={overrideStage} />
        <Preload all />
      </Suspense>
    </Canvas>
  )
}
