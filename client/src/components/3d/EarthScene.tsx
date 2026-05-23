'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Stars, Preload } from '@react-three/drei'
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Earth, globeSurfaceRaycast } from './Earth'
import { FossilPoints } from './FossilPoints'
import { GeoLabels } from './GeoLabels'
import { Moon } from './Moon'
import { StageHotspots } from './StageHotspots'
import { FossilFocusHighlight } from './FossilFocusHighlight'
import { useEarthHistoryStore, useSceneCommandStore } from '@/features/content3d/earth/public'
import { fetchFossilsForStage } from '@/features/content3d/earth/api/earthApi'
import { latLngToVector3 } from '@/lib/geo'
import type { EarthStage } from '@/types'
import type { Fossil } from '@/types'

const EARTH_RADIUS = 5
const FLY_TARGET_LERP = 0.1
const FLY_DONE_DIST = 0.08
/**
 * Zoom khi chọn một điểm — khoảng cách camera ↔ orbit target (điểm trên bề mặt).
 * `minDistance` OrbitControls là khoảng cách tới *target*, không phải tới tâm Trái Đất —
 * giá trị ~5 từng làm “hết zoom” vẫn xa; dùng ~1.6–2 để xem cận bản đồ / tách chấm.
 */
const FLY_SINGLE_CAMERA_DISTANCE = 1.72
const FLY_CAMERA_LERP = 0.08
const PHYLUM_LINE_RADIUS = EARTH_RADIUS + 0.25
/** Ít điểm hơn để đường nối đỡ rối khi phân bố rộng. */
const PHYLUM_LINE_MAX_POINTS = 56

/**
 * Lớp sphere trong suốt giữa bản đồ (globe không raycast) và chấm PBDB.
 * Nhận click biển/trống → bỏ focus fossil (không dùng ray của Stars).
 */
function GlobeBackdropPickSurface() {
  const pointerDownRef = useRef<{ clientX: number; clientY: number } | null>(null)

  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button !== 0) return
    pointerDownRef.current = { clientX: e.nativeEvent.clientX, clientY: e.nativeEvent.clientY }
  }, [])

  const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button !== 0) return
    const down = pointerDownRef.current
    pointerDownRef.current = null
    if (!down) return
    const dx = e.nativeEvent.clientX - down.clientX
    const dy = e.nativeEvent.clientY - down.clientY
    /** Tránh xóa focus khi đang drag orbit (OrbitControls). */
    if (dx * dx + dy * dy > 36) return
    useSceneCommandStore.getState().clearAllGlobeFossilUi()
  }, [])

  const onPointerLeave = useCallback(() => {
    pointerDownRef.current = null
  }, [])

  return (
    <mesh
      renderOrder={-400}
      raycast={globeSurfaceRaycast}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerLeave}
    >
      <sphereGeometry args={[EARTH_RADIUS + 0.042, 56, 52]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** Đường gợi ý phân bố (polyline mở — không khép vòng để giảm “quấn” loạn trên globe). */
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
    const pos = new Float32Array(usePoints.length * 3)
    usePoints.forEach((p, i) => {
      const v = latLngToVector3(p.lat, p.lng, PHYLUM_LINE_RADIUS)
      pos[i * 3] = v.x
      pos[i * 3 + 1] = v.y
      pos[i * 3 + 2] = v.z
    })
    return pos
  }, [fossils])

  const lineObject = useMemo(() => {
    if (points.length < 6) return null
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(points, 3))
    const mat = new THREE.LineBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    })
    const ln = new THREE.Line(geo, mat)
    ln.raycast = () => {}
    return ln
  }, [points])

  useEffect(() => {
    return () => {
      if (!lineObject) return
      lineObject.geometry.dispose()
      ;(lineObject.material as THREE.Material).dispose()
    }
  }, [lineObject])

  if (!lineObject) return null

  return <primitive object={lineObject} />
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
      fossil?: Fossil | null
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

  return (
    <group ref={setRef}>
      <Earth stage={stage} effectTags={effectTags} />
      <GlobeBackdropPickSurface />
      {showFossilsForStage && <FossilPoints fossilsOverride={fossilsOverride} />}
      {showPhylumLine && flyToTarget.phylumFossils && (
        <PhylumOutlineLine fossils={flyToTarget.phylumFossils} />
      )}
      {fossilsOverride == null && <FossilFocusHighlight />}
      <GeoLabels visible={showPlaceLabels && canShowPlaceLabels} />
    </group>
  )
})

const SINGLE_MARKER_MIN_DURATION = 2

/** Tổng quan phân bố ngành — xa hơn zoom đơn để không chồng chấm. */
const PHYLUM_SURFACE_OFFSET = 11.6

/** Phylum: sau khi bay xong ngừng hẳn can thiệp camera/orbit — không khóa zoom. */
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
    fossil?: Fossil | null
  } | null
  setFlyToTarget: (target: {
    lat: number
    lng: number
    mode?: 'phylum' | 'single'
    phylumFossils?: Fossil[]
    fossil?: Fossil | null
  } | null) => void
}) {
  const { camera } = useThree()
  const worldTarget = useRef(new THREE.Vector3())
  const desiredCameraPos = useRef(new THREE.Vector3())
  const singleMarkerShownAt = useRef<number | null>(null)
  const prevFlyMode = useRef<string | null>(null)
  /** Phylum flight đã “đậu” → không lerp nữa để OrbitControls nhận zoom/pan/xoay tay. */
  const phylumFlightComplete = useRef(false)

  useEffect(() => {
    phylumFlightComplete.current = false
  }, [
    flyToTarget?.lat,
    flyToTarget?.lng,
    flyToTarget?.mode,
    flyToTarget?.phylumFossils?.length,
  ])

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

    if (flyToTarget.mode === 'phylum') {
      singleMarkerShownAt.current = null
      if (phylumFlightComplete.current) return

      controls.target.lerp(worldTarget.current, FLY_TARGET_LERP)
      const radial = worldTarget.current.clone().normalize()
      desiredCameraPos.current.copy(worldTarget.current).add(radial.multiplyScalar(PHYLUM_SURFACE_OFFSET))
      camera.position.lerp(desiredCameraPos.current, FLY_CAMERA_LERP)

      const targetDone = controls.target.distanceTo(worldTarget.current) < FLY_DONE_DIST * 2.5
      const camDone = camera.position.distanceTo(desiredCameraPos.current) < 0.22
      if (targetDone && camDone) phylumFlightComplete.current = true
      return
    }

    controls.target.lerp(worldTarget.current, FLY_TARGET_LERP)

    if (flyToTarget.mode === 'single') {
      const distToTarget = camera.position.distanceTo(controls.target)
      if (distToTarget > FLY_SINGLE_CAMERA_DISTANCE + 0.05) {
        desiredCameraPos.current
          .copy(worldTarget.current)
          .add(worldTarget.current.clone().normalize().multiplyScalar(FLY_SINGLE_CAMERA_DISTANCE))
        camera.position.lerp(desiredCameraPos.current, FLY_CAMERA_LERP)
      }
      const targetDone = controls.target.distanceTo(worldTarget.current) < FLY_DONE_DIST
      const zoomDone = camera.position.distanceTo(controls.target) <= FLY_SINGLE_CAMERA_DISTANCE + 0.12
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
  const currentStage = useEarthHistoryStore((s) => s.currentStage)
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
    clearAllGlobeFossilUi,
    loadPhylumMetadata,
  } = useSceneCommandStore()

  const [courseFossils, setCourseFossils] = useState<Fossil[]>([])
  const stage = overrideStage ?? currentStage
  const fossils = overrideStage != null ? courseFossils : null
  const renderFlyToTarget = overrideStage != null ? null : flyToTarget
  /** Nền không theo màu khí quyển từng kỷ — tránh cả scene “cam lè”; trời sao đọc rõ. */
  const spaceBackground = useMemo(() => new THREE.Color(0x03050c), [])
  /** Đèn fill trung tính, không nhuộm cam theo atmosphereColor. */
  const fillLightColor = useMemo(() => new THREE.Color(0x7a9ec4).multiplyScalar(0.42), [])

  useEffect(() => {
    loadPhylumMetadata()
  }, [loadPhylumMetadata])

  // Đổi beat / thời kỳ → bỏ fly-to + nhãn hóa thạch để preview không “kẹt”.
  useEffect(() => {
    if (overrideStage != null) return
    clearAllGlobeFossilUi()
  }, [
    overrideStage,
    currentStage.id,
    currentStage.time,
    currentStage.maxMa,
    currentStage.minMa,
    clearAllGlobeFossilUi,
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
      <SmoothBackground targetColor={spaceBackground} />
      <ambientLight intensity={0.52} />
      <directionalLight position={[100, 50, 100]} intensity={2.55} color="#FFFFEE" />
      <SmoothFillLight targetColor={fillLightColor} />

      <Stars radius={420} depth={120} count={12000} factor={0.85} saturation={0} fade speed={0.35} />

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
        minDistance={0.38}
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
  return <pointLight ref={lightRef} position={[-10, 5, 10]} intensity={0.5} color={colorRef.current} />
}

export interface EarthSceneProps {
  /** Dùng trong khóa học: hiển thị Trái Đất ở đúng thời kỳ này (và load fossils tương ứng) */
  overrideStage?: EarthStage | null
}

export default function EarthScene({ overrideStage }: EarthSceneProps = {}) {
  const onPointerMissed = useCallback(() => {
    useSceneCommandStore.getState().clearAllGlobeFossilUi()
  }, [])

  return (
    <Canvas
      camera={{ position: [0, 5, 25], fov: 60, near: 0.006 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#000000' }}
      onPointerMissed={onPointerMissed}
      raycaster={{
        params: {
          Mesh: {},
          Line: { threshold: 1 },
          LOD: {},
          Points: { threshold: 0.42 },
          Sprite: {},
        },
      }}
    >
      <Suspense fallback={null}>
        <Scene overrideStage={overrideStage} />
        <Preload all />
      </Suspense>
    </Canvas>
  )
}
