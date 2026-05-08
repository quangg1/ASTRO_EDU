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
import { StageHotspots } from './StageHotspots'
import { useNarrativeStore } from '@/features/content3d/narrative/public'
import { useSceneCommandStore } from '@/features/content3d/earth/public'
import { fetchFossilsForStage } from '@/features/content3d/earth/api/earthApi'
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
  {
    stage: EarthStage
    fossilsOverride?: Fossil[] | null
    showFossils: boolean
    showPlaceLabels: boolean
    earthRotationPaused: boolean
    flyToTarget: {
      lat: number
      lng: number
      mode?: 'phylum' | 'single'
      phylumFossils?: Fossil[]
    } | null
    effectTags: {
      meteorShower: boolean
      debrisField: boolean
      dustHaze: boolean
    }
  }
>(function EarthWithFossils(
  {
    stage,
    fossilsOverride,
    showFossils,
    showPlaceLabels,
    earthRotationPaused,
    flyToTarget,
    effectTags,
  },
  ref,
) {
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
  const showFossilsForStage = fossilsOverride != null ? true : showFossils
  const showPhylumLine = flyToTarget?.mode === 'phylum' && (flyToTarget.phylumFossils?.length ?? 0) > 0
  const showSingleMarker = flyToTarget?.mode === 'single'

  return (
    <group ref={setRef}>
      <Earth stage={stage} effectTags={effectTags} />
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

/** Zoom satellite nhẹ hơn single một chút để nhìn cả vòng phân bố ngành. */
const PHYLUM_SURFACE_OFFSET = FLY_CAMERA_DISTANCE * 1.45

/** Chỉ move camera, không xoay Trái Đất. Single = zoom cận + marker rồi auto-clear; phylum = zoom về phía centroid như single nhưng giữ target để xem đường nối. */
function FlyToController({
  earthGroupRef,
  controlsRef,
  flyToTarget,
  setFlyToTarget,
}: {
  earthGroupRef: React.RefObject<THREE.Group | null>
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  flyToTarget: {
    lat: number
    lng: number
    mode?: 'phylum' | 'single'
    phylumFossils?: Fossil[]
  } | null
  setFlyToTarget: (target: {
    lat: number
    lng: number
    mode?: 'phylum' | 'single'
    phylumFossils?: Fossil[]
  } | null) => void
}) {
  const { camera } = useThree()
  const worldTarget = useRef(new THREE.Vector3())
  const desiredCameraPos = useRef(new THREE.Vector3())
  const singleMarkerShownAt = useRef<number | null>(null)
  const prevFlyMode = useRef<string | null>(null)

  useFrame((state) => {
    if (!flyToTarget || !earthGroupRef?.current || !controlsRef?.current) return

    const earth = earthGroupRef.current
    const controls = controlsRef.current
    const clock = state.clock

    if (prevFlyMode.current !== flyToTarget.mode) {
      prevFlyMode.current = flyToTarget.mode ?? null
    }

    const localUnit = latLngToVector3(flyToTarget.lat, flyToTarget.lng, 1).normalize()
    const localPoint = localUnit.clone().multiplyScalar(EARTH_RADIUS)
    worldTarget.current.copy(localPoint).applyMatrix4(earth.matrixWorld)
    controls.target.lerp(worldTarget.current, FLY_TARGET_LERP)

    if (flyToTarget.mode === 'phylum') {
      singleMarkerShownAt.current = null
      const radial = worldTarget.current.clone().normalize()
      desiredCameraPos.current.copy(worldTarget.current).add(radial.multiplyScalar(PHYLUM_SURFACE_OFFSET))
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
  const currentStage = useNarrativeStore((s) => s.currentBeat)
  const {
    showFossils,
    showPlaceLabels,
    earthRotationPaused,
    flyToTarget,
    effectTags,
    setFossils,
    setFossilStats,
    setFossilsLoading,
    setFlyToTarget,
    loadPhylumMetadata,
  } = useSceneCommandStore()

  const [courseFossils, setCourseFossils] = useState<Fossil[]>([])
  const stage = overrideStage ?? currentStage
  const fossils = overrideStage != null ? courseFossils : null
  const renderFlyToTarget = overrideStage != null ? null : flyToTarget
  const moodBackground = useMemo(() => {
    const atmo = new THREE.Color(stage.atmosphereColor || '#0b1220')
    return atmo.clone().multiplyScalar(0.17)
  }, [stage.atmosphereColor])
  const fillLightColor = useMemo(
    () => new THREE.Color(stage.atmosphereColor || '#4488ff').multiplyScalar(0.8),
    [stage.atmosphereColor],
  )

  useEffect(() => {
    loadPhylumMetadata()
  }, [loadPhylumMetadata])

  // Đổi beat / thời kỳ → bỏ fly-to phylum/single cũ để preview không “kẹt” camera & đường nối.
  useEffect(() => {
    if (overrideStage != null) return
    setFlyToTarget(null)
  }, [
    overrideStage,
    currentStage.id,
    currentStage.time,
    currentStage.maxMa,
    currentStage.minMa,
    setFlyToTarget,
  ])

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
      <SmoothBackground targetColor={moodBackground} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[100, 50, 100]} intensity={2.2} color="#FFFFDD" />
      <SmoothFillLight targetColor={fillLightColor} />

      <Stars radius={300} depth={60} count={5000} factor={4} saturation={0} fade speed={1} />

      <EarthWithFossils
        ref={earthGroupRef}
        stage={stage}
        fossilsOverride={fossils}
        showFossils={showFossils}
        showPlaceLabels={showPlaceLabels}
        earthRotationPaused={earthRotationPaused}
        flyToTarget={renderFlyToTarget}
        effectTags={effectTags}
      />
      <StageHotspots timeMa={stage.time} />

      {stage.moonDistance != null && <Moon distance={stage.moonDistance} />}

      {overrideStage == null && (
        <FlyToController
          earthGroupRef={earthGroupRef}
          controlsRef={controlsRef}
          flyToTarget={flyToTarget}
          setFlyToTarget={setFlyToTarget}
        />
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

function SmoothBackground({ targetColor }: { targetColor: THREE.Color }) {
  const { scene } = useThree()
  const bgRef = useRef(new THREE.Color(targetColor))
  useFrame((_, delta) => {
    bgRef.current.lerp(targetColor, Math.min(1, delta * 2))
    scene.background = bgRef.current
  })
  return null
}

function SmoothFillLight({ targetColor }: { targetColor: THREE.Color }) {
  const lightRef = useRef<THREE.PointLight>(null)
  const colorRef = useRef(new THREE.Color(targetColor))
  useFrame((_, delta) => {
    if (!lightRef.current) return
    colorRef.current.lerp(targetColor, Math.min(1, delta * 2.4))
    lightRef.current.color.copy(colorRef.current)
  })
  return <pointLight ref={lightRef} position={[-10, 5, 10]} intensity={0.4} color={colorRef.current} />
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
