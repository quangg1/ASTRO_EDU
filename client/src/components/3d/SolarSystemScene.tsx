'use client'

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars, Preload } from '@react-three/drei'
import { Suspense, createElement, useRef, useMemo, useState, useEffect, useLayoutEffect } from 'react'
import { applyGlobeTextureQuality } from '@/lib/planetTextureQuality'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { sunData, planetsData, type PlanetData } from '@/lib/solarSystemData'
import { getStaticAssetUrl } from '@/lib/apiConfig'
import SpaceShipMesh from '@/components/3d/SpaceShipMesh'
import {
  STAGING_ORBIT,
  loadShipPosition,
  saveShipPosition,
  resolveSunClearance,
} from '@/lib/solarShipPersistence'
import { useCockpitHudTarget } from '@/contexts/CockpitHudTargetContext'
import {
  COCKPIT_SHIP_VISUAL_SCALE,
  COCKPIT_JOURNEY_SPEED_MULT,
  COCKPIT_SPIN_TRANSIT,
  COCKPIT_SPIN_AT_LOCK,
  COCKPIT_ADVENTURE_SCALE,
  COCKPIT_BODY_SCALE,
  COCKPIT_FOG_EXP_DENSITY,
  COCKPIT_DOCK_FRAC_OF_SCREEN_HEIGHT,
  COCKPIT_HOLD_PAD_RADIUS_MULT,
  COCKPIT_HOLD_PAD_EXTRA,
  COCKPIT_DOCK_FOV,
  COCKPIT_CRUISE_FOV,
} from '@/lib/solarCockpitScale'

const origin = new THREE.Vector3(0, 0, 0)
const EARTH_PLANET_INDEX = planetsData.findIndex((p) => p.name === 'Earth')
const MARS_PLANET_INDEX = planetsData.findIndex((p) => p.name === 'Mars')

const SUN_SPIN_PERIOD = 25

/** Within this distance to nav hold, ship snaps and stops (no endless chase of moving target). */
const ARRIVE_HOLD_EPS = 0.48

/** Cockpit: phải neo ổn định ~thời gian này mới coi là “đã tới” (HUD target lock). */
const COCKPIT_DOCK_STABLE_SEC = 0.14

/** Điểm neo cách tâm hành tinh theo hướng từ Mặt Trời — dùng cho cả snapshot và bám đích khi đã cập. */
function computeNavHoldNearPlanet(
  idx: number,
  planetPositionsRef: React.MutableRefObject<THREE.Vector3[]>,
  orbitScale = 1,
  bodyScale = 1,
  options?: { cockpitClose?: boolean }
): THREE.Vector3 | null {
  const p = planetPositionsRef.current[idx]
  if (!p || p.lengthSq() < 1e-6) return null
  const outward = p.clone().normalize()
  const pad = options?.cockpitClose
    ? planetsData[idx].radius * bodyScale * COCKPIT_HOLD_PAD_RADIUS_MULT + COCKPIT_HOLD_PAD_EXTRA * orbitScale
    : planetsData[idx].radius * bodyScale * 4 + 3.2 * orbitScale
  return p.clone().add(outward.multiplyScalar(pad))
}

function resolveOtherPlanetCollisions(
  ship: THREE.Vector3,
  selectedIndex: number | null,
  planetPositionsRef: React.MutableRefObject<THREE.Vector3[]>,
  orbitScale = 1,
  bodyScale = 1
) {
  for (let i = 0; i < planetsData.length; i++) {
    if (selectedIndex !== null && i === selectedIndex) continue
    const p = planetPositionsRef.current[i]
    if (!p || p.lengthSq() < 1e-6) continue
    const clearance = planetsData[i].radius * bodyScale * 3.0 + 1.1 * orbitScale
    const d = ship.distanceTo(p)
    if (d < clearance && d > 1e-6) {
      const dir = ship.clone().sub(p).normalize()
      ship.copy(p).add(dir.multiplyScalar(clearance))
    }
  }
  resolveSunClearance(ship, orbitScale)
}

function useMeshRaycastEnabled(meshRef: React.RefObject<THREE.Mesh | null>, enabled: boolean) {
  const saved = useRef<THREE.Mesh['raycast'] | null>(null)
  useLayoutEffect(() => {
    let raf = 0
    let tries = 0
    const apply = () => {
      const m = meshRef.current
      if (!m && tries++ < 90) {
        raf = requestAnimationFrame(apply)
        return
      }
      if (!m) return
      if (!saved.current) saved.current = m.raycast
      m.raycast = enabled ? saved.current : () => {}
    }
    apply()
    return () => {
      cancelAnimationFrame(raf)
    }
  }, [enabled, meshRef])
}

/** Số đoạn tạo vòng tròn quỹ đạo */
const ORBIT_SEGMENTS = 128

/** Vẽ đường quỹ đạo (vòng tròn nằm ngang XZ) với màu riêng cho từng hành tinh */
function OrbitPath({ distance, color, visible = true }: { distance: number; color: string; visible?: boolean }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
      const t = (i / ORBIT_SEGMENTS) * Math.PI * 2
      pts.push(new THREE.Vector3(distance * Math.cos(t), 0, distance * Math.sin(t)))
    }
    return pts
  }, [distance])
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points)
    return g
  }, [points])
  return (
    <lineLoop geometry={geometry} visible={visible}>
      <lineBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} />
    </lineLoop>
  )
}

/** Mặt Trời – tự quay quanh trục; click → chuyển tâm về Mặt Trời */
function Sun({
  onSelect,
  interactive = true,
  spinTimeScale = 1,
  visible = true,
  radiusScale = 1,
}: {
  onSelect: () => void
  interactive?: boolean
  /** 0 = đứng yên, 1 = tốc độ mặc định, &lt;1 = rất chậm (cockpit) */
  spinTimeScale?: number
  visible?: boolean
  /** Thu/phóng mesh Mặt Trời (cockpit = orbit scale) */
  radiusScale?: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const meshGlowRef = useRef<THREE.Mesh>(null)
  useMeshRaycastEnabled(meshRef, interactive)
  useMeshRaycastEnabled(meshGlowRef, interactive)
  const { gl } = useThree()
  const texture = useLoader(THREE.TextureLoader, getStaticAssetUrl(sunData.texture)) as THREE.Texture
  useLayoutEffect(() => {
    applyGlobeTextureQuality(texture, gl, { wrap: 'repeat' })
  }, [texture, gl])
  useFrame((_, delta) => {
    if (groupRef.current) {
      const spinSpeed = (spinTimeScale * (2 * Math.PI)) / SUN_SPIN_PERIOD
      groupRef.current.rotation.y += delta * spinSpeed
    }
  })
  return (
    <group
      ref={groupRef}
      visible={visible}
      onClick={interactive ? (e) => { e.stopPropagation(); onSelect() } : undefined}
    >
      <mesh ref={meshGlowRef}>
        <sphereGeometry args={[sunData.radius * radiusScale * 1.35, 32, 32]} />
        <meshBasicMaterial
          color="#ffeedd"
          transparent
          opacity={0.4}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[sunData.radius * radiusScale, 64, 64]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </group>
  )
}

/** Click hành tinh → chuyển tâm nhìn tới hành tinh đó; ghi position vào ref để TargetController đọc */
function Planet({
  data,
  index,
  positionRef,
  onSelect,
  onPlanetSelect,
  interactive = true,
  orbitTimeScale = 1,
  spinTimeScale = 1,
  visible = true,
  unlitTexture = false,
  orbitScale = 1,
  bodyScale = 1,
}: {
  data: PlanetData
  index: number
  positionRef: React.MutableRefObject<THREE.Vector3[]>
  onSelect: () => void
  onPlanetSelect?: (index: number | null) => void
  interactive?: boolean
  /** 0 = quỹ đạo đứng yên (cockpit), 1 = bình thường */
  orbitTimeScale?: number
  spinTimeScale?: number
  visible?: boolean
  /** meshBasic + map — màu gần gốc, không phụ thuộc đèn Mặt Trời */
  unlitTexture?: boolean
  /** Thu/phóng bán kính quỹ đạo (cockpit) */
  orbitScale?: number
  /** Bán kính mesh (cockpit: orbit × boost) */
  bodyScale?: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const spinRef = useRef<THREE.Group>(null)
  const bodyMeshRef = useRef<THREE.Mesh>(null)
  useMeshRaycastEnabled(bodyMeshRef, interactive)
  const { gl } = useThree()
  const angleRef = useRef(Math.random() * Math.PI * 2)
  const map = useLoader(THREE.TextureLoader, getStaticAssetUrl(data.texture)) as THREE.Texture
  useLayoutEffect(() => {
    applyGlobeTextureQuality(map, gl)
  }, [map, gl])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const orbitSpeed = (orbitTimeScale * (2 * Math.PI)) / data.period
    angleRef.current += delta * orbitSpeed
    const a = angleRef.current
    const ox = orbitScale * data.distance * Math.cos(a)
    const oz = orbitScale * data.distance * Math.sin(a)
    groupRef.current.position.set(ox, 0, oz)
    if (positionRef.current[index]) positionRef.current[index].copy(groupRef.current.position)
    if (spinRef.current) {
      const spinSpeed = (spinTimeScale * (2 * Math.PI)) / data.spinPeriod
      spinRef.current.rotation.y += delta * spinSpeed
    }
  })

  return (
    <group ref={groupRef} visible={visible}>
      <group ref={spinRef}>
        <mesh
          ref={bodyMeshRef}
          onClick={
            interactive
              ? (e) => {
                  e.stopPropagation()
                  onSelect()
                  onPlanetSelect?.(index)
                }
              : undefined
          }
          onPointerOver={interactive ? () => { document.body.style.cursor = 'pointer' } : undefined}
          onPointerOut={interactive ? () => { document.body.style.cursor = 'auto' } : undefined}
        >
          <sphereGeometry args={[data.radius * bodyScale, 96, 96]} />
          {unlitTexture ? (
            <meshBasicMaterial map={map} toneMapped={false} />
          ) : (
            <meshStandardMaterial map={map} roughness={0.75} metalness={0.08} />
          )}
        </mesh>
        {data.ringTexture && (
          <PlanetRing
            inner={data.ringInner! * data.radius * bodyScale}
            outer={data.ringOuter! * data.radius * bodyScale}
            texturePath={getStaticAssetUrl(data.ringTexture)}
            interactive={interactive}
          />
        )}
      </group>
    </group>
  )
}

function PlanetRing({
  inner,
  outer,
  texturePath,
  interactive = true,
}: {
  inner: number
  outer: number
  texturePath: string
  interactive?: boolean
}) {
  const ringMeshRef = useRef<THREE.Mesh>(null)
  useMeshRaycastEnabled(ringMeshRef, interactive)
  const { gl } = useThree()
  const ringTex = useLoader(THREE.TextureLoader, texturePath) as THREE.Texture
  useLayoutEffect(() => {
    applyGlobeTextureQuality(ringTex, gl)
  }, [ringTex, gl])
  return (
    <mesh ref={ringMeshRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[inner, outer, 64]} />
      <meshBasicMaterial
        map={ringTex}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

/** Ánh sáng từ Mặt Trời — tắt khi hiển thị “catalog” (màu map gốc, không bóng đổ). */
function SunLight({ enabled = true }: { enabled?: boolean }) {
  if (!enabled) return null
  return (
    <>
      <pointLight
        position={[0, 0, 0]}
        intensity={55}
        color="#fff8ee"
        distance={200}
        decay={1.2}
      />
      <pointLight
        position={[0, 0, 0]}
        intensity={20}
        color="#ffffff"
        distance={0}
        decay={0}
      />
    </>
  )
}

/** Cập nhật target OrbitControls theo hành tinh được chọn */
function TargetController({
  controlsRef,
  planetPositionsRef,
  selectedIndex,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  planetPositionsRef: React.MutableRefObject<THREE.Vector3[]>
  selectedIndex: number | null
}) {
  useFrame(() => {
    if (!controlsRef?.current) return
    const target = controlsRef.current.target
    if (selectedIndex === null) {
      target.lerp(origin, 0.08)
    } else if (planetPositionsRef.current[selectedIndex]) {
      target.lerp(planetPositionsRef.current[selectedIndex], 0.08)
    }
  })
  return null
}

/**
 * Phóng camera tới hành tinh — chỉ gọi onArrived khi đã gần & ổn định (parent mới bật Target lock / solo).
 */
function ObserverLockApproach({
  active,
  selectedIndex,
  planetPositionsRef,
  controlsRef,
  onArrived,
}: {
  active: boolean
  selectedIndex: number | null
  planetPositionsRef: React.MutableRefObject<THREE.Vector3[]>
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  onArrived?: () => void
}) {
  const stableSecRef = useRef(0)
  const firedRef = useRef(false)
  const t0Ref = useRef(0)

  useEffect(() => {
    if (active && selectedIndex !== null) {
      firedRef.current = false
      stableSecRef.current = 0
      t0Ref.current = performance.now()
    }
  }, [active, selectedIndex])

  useFrame((_, dt) => {
    if (!active || selectedIndex === null || !onArrived || firedRef.current) return
    const c = controlsRef.current
    if (!c) return
    const p = planetPositionsRef.current[selectedIndex]
    if (!p || p.lengthSq() < 1e-6) return

    const want = 5.15
    c.target.lerp(p, 0.16)
    const dist = c.object.position.distanceTo(c.target)
    if (dist > want + 0.06) {
      const dir = c.object.position.clone().sub(c.target).normalize()
      c.object.position.addScaledVector(dir, -(dist - want) * 0.14)
    }
    c.update()

    if (dist <= want + 0.35) stableSecRef.current += dt
    else stableSecRef.current = Math.max(0, stableSecRef.current - dt * 0.8)

    const elapsed = (performance.now() - t0Ref.current) / 1000
    if (stableSecRef.current >= 0.4 || elapsed >= 4.0) {
      firedRef.current = true
      onArrived()
    }
  })
  return null
}

/**
 * Learning nodes mẫu cho tuyến Earth -> Mars trong chế độ học tập (observer).
 * Tạm thời dựng object 3D đơn giản để test UX: Moon, Asteroid, Dust.
 */
function EarthMarsLearningPath({
  planetPositionsRef,
  selectedIndex,
}: {
  planetPositionsRef: React.MutableRefObject<THREE.Vector3[]>
  selectedIndex: number | null
}) {
  const moonRef = useRef<THREE.Group>(null)
  const asteroidRef = useRef<THREE.Group>(null)
  const dustRef = useRef<THREE.Group>(null)
  const routeRef = useRef<THREE.Line>(null)

  const isRouteFocused =
    selectedIndex === EARTH_PLANET_INDEX || selectedIndex === MARS_PLANET_INDEX

  useFrame((state, delta) => {
    const earth = planetPositionsRef.current[EARTH_PLANET_INDEX]
    const mars = planetPositionsRef.current[MARS_PLANET_INDEX]
    if (!earth || !mars || earth.lengthSq() < 1e-6 || mars.lengthSq() < 1e-6) return

    const span = mars.clone().sub(earth)
    const placeAt = (t: number) => earth.clone().add(span.clone().multiplyScalar(t))

    const moonPos = placeAt(0.26)
    const asteroidPos = placeAt(0.5)
    const dustPos = placeAt(0.74)

    if (moonRef.current) {
      moonRef.current.position.copy(moonPos)
      moonRef.current.position.y += Math.sin(state.clock.elapsedTime * 0.9) * 0.12
    }
    if (asteroidRef.current) {
      asteroidRef.current.position.copy(asteroidPos)
      asteroidRef.current.rotation.x += delta * 0.35
      asteroidRef.current.rotation.y += delta * 0.5
    }
    if (dustRef.current) {
      dustRef.current.position.copy(dustPos)
      dustRef.current.rotation.y += delta * 0.2
    }

    if (routeRef.current) {
      const attr = routeRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
      attr.setXYZ(0, earth.x, earth.y, earth.z)
      attr.setXYZ(1, moonPos.x, moonPos.y, moonPos.z)
      attr.setXYZ(2, asteroidPos.x, asteroidPos.y, asteroidPos.z)
      attr.setXYZ(3, dustPos.x, dustPos.y, dustPos.z)
      attr.setXYZ(4, mars.x, mars.y, mars.z)
      attr.needsUpdate = true
    }
  })

  return (
    <group visible={isRouteFocused}>
      {createElement(
        'line' as never,
        { ref: routeRef },
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={5}
            itemSize={3}
            array={new Float32Array(5 * 3)}
          />
        </bufferGeometry>,
        <lineBasicMaterial color="#f5a623" transparent opacity={0.8} />,
      )}

      <group ref={moonRef}>
        <mesh>
          <sphereGeometry args={[0.2, 24, 24]} />
          <meshStandardMaterial color="#d1d5db" emissive="#64748b" emissiveIntensity={0.22} />
        </mesh>
        <Html distanceFactor={10} center>
          <div className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-amber-200 border border-amber-400/30">
            Moon
          </div>
        </Html>
      </group>

      <group ref={asteroidRef}>
        <mesh>
          <dodecahedronGeometry args={[0.18, 0]} />
          <meshStandardMaterial color="#a78b6d" roughness={0.9} metalness={0.05} />
        </mesh>
        <Html distanceFactor={10} center>
          <div className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-amber-200 border border-amber-400/30">
            Asteroid
          </div>
        </Html>
      </group>

      <group ref={dustRef}>
        {[...Array(10)].map((_, i) => {
          const a = (i / 10) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.18, (i % 2 === 0 ? 1 : -1) * 0.03, Math.sin(a) * 0.18]}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color="#fde68a" />
            </mesh>
          )
        })}
        <Html distanceFactor={10} center>
          <div className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-amber-200 border border-amber-400/30">
            Dust
          </div>
        </Html>
      </group>
    </group>
  )
}

function SceneObserverContent({
  onPlanetSelect,
  flightTargetIndex,
  observerLockPending,
  observerTargetLock,
  onObserverLockArrived,
}: {
  onPlanetSelect?: (index: number | null) => void
  flightTargetIndex?: number | null
  /** Đang phóng tới — chưa solo / chưa Target lock UI */
  observerLockPending?: boolean
  /** Sau khi camera tới nơi — solo + unlit + đóng băng quỹ đạo */
  observerTargetLock?: boolean
  onObserverLockArrived?: () => void
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const planetPositionsRef = useRef<THREE.Vector3[]>(
    Array.from({ length: planetsData.length }, () => new THREE.Vector3())
  )
  const [internalIndex, setInternalIndex] = useState<number | null>(null)
  const selectedIndex = flightTargetIndex !== undefined ? flightTargetIndex : internalIndex

  const setSelection = (idx: number | null) => {
    if (flightTargetIndex === undefined) setInternalIndex(idx)
    onPlanetSelect?.(idx)
  }

  const locked = observerTargetLock === true
  const solo = locked && selectedIndex !== null
  const approachActive =
    observerLockPending === true && !locked && selectedIndex !== null

  return (
    <>
      <ambientLight intensity={solo ? 1.05 : 0.28} />
      <SunLight enabled={!solo} />

      {planetsData.map((data) => (
        <OrbitPath key={data.name} distance={data.distance} color={data.orbitColor} visible={!solo} />
      ))}

      <Sun
        visible={!solo}
        onSelect={() => {
          setSelection(null)
        }}
      />
      {planetsData.map((data, i) => (
        <Planet
          key={data.name}
          data={data}
          index={i}
          positionRef={planetPositionsRef}
          visible={!solo || i === selectedIndex}
          unlitTexture={solo && i === selectedIndex}
          orbitTimeScale={solo && i === selectedIndex ? 0 : 1}
          onSelect={() => setSelection(i)}
          onPlanetSelect={onPlanetSelect}
        />
      ))}

      <group visible={!solo}>
        <Stars radius={200} depth={80} count={3000} factor={4} saturation={0} fade speed={1} />
      </group>

      <TargetController
        controlsRef={controlsRef}
        planetPositionsRef={planetPositionsRef}
        selectedIndex={selectedIndex}
      />

      <ObserverLockApproach
        active={approachActive}
        selectedIndex={selectedIndex}
        planetPositionsRef={planetPositionsRef}
        controlsRef={controlsRef}
        onArrived={onObserverLockArrived}
      />

      <EarthMarsLearningPath
        planetPositionsRef={planetPositionsRef}
        selectedIndex={selectedIndex}
      />

      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={solo ? 0.55 : 2}
        maxDistance={solo ? 45 : 120}
        target={[0, 0, 0]}
        panSpeed={0.8}
        zoomSpeed={1.2}
        rotateSpeed={0.6}
      />
    </>
  )
}

/** Quỹ đạo đứng yên trong cockpit — neo khớp ngay, không chờ hành tinh quay. */
const COCKPIT_ORBIT_TIME_SCALE = 0
/** Neo trong hệ cockpit (đơn vị adventure — đồng bộ với quỹ đã scale). */
const COCKPIT_HOLD_EPS = ARRIVE_HOLD_EPS * COCKPIT_ADVENTURE_SCALE

/** Nhiều lớp sao xoay chậm — parallax, cảm giác không gian sâu (chỉ cockpit). */
function CockpitParallaxStars({ visible }: { visible: boolean }) {
  const ref1 = useRef<THREE.Group>(null)
  const ref2 = useRef<THREE.Group>(null)
  const ref3 = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (ref1.current) {
      ref1.current.rotation.x += dt * 0.005
      ref1.current.rotation.y += dt * 0.009
    }
    if (ref2.current) {
      ref2.current.rotation.y -= dt * 0.016
      ref2.current.rotation.z += dt * 0.003
    }
    if (ref3.current) ref3.current.rotation.y += dt * 0.024
  })
  return (
    <group visible={visible}>
      <group ref={ref1}>
        <Stars radius={620} depth={160} count={6500} factor={3.2} saturation={0} fade speed={0.55} />
      </group>
      <group ref={ref2}>
        <Stars radius={340} depth={95} count={3800} factor={4} saturation={0} fade speed={0.75} />
      </group>
      <group ref={ref3}>
        <Stars radius={140} depth={58} count={1800} factor={5} saturation={0} fade speed={0.95} />
      </group>
    </group>
  )
}

function SceneCockpitContent({
  onPlanetSelect,
  onTelemetry,
  flightTargetIndex,
  sceneNavigationEnabled = true,
  cockpitCanvasInTargetFrame = false,
}: {
  onPlanetSelect?: (index: number | null) => void
  onTelemetry?: (payload: {
    speed: number
    distance: number
    targetIndex: number | null
    distToNavTarget: number
    dockedAtPlanet: boolean
  }) => void
  flightTargetIndex?: number | null
  sceneNavigationEnabled?: boolean
  /** Canvas DOM đã khớp pixel với khung Target Card — không dùng setViewOffset. */
  cockpitCanvasInTargetFrame?: boolean
}) {
  const { camera, scene, size } = useThree()
  const hudCtx = useCockpitHudTarget()
  const planetPositionsRef = useRef<THREE.Vector3[]>(
    Array.from({ length: planetsData.length }, () => new THREE.Vector3())
  )
  const [internalFlight, setInternalFlight] = useState<number | null>(null)
  const selectedIndex = flightTargetIndex !== undefined ? flightTargetIndex : internalFlight

  const setFlightTarget = (idx: number | null) => {
    if (flightTargetIndex === undefined) setInternalFlight(idx)
    onPlanetSelect?.(idx)
  }

  const cockpitStaging = useMemo(
    () => STAGING_ORBIT.clone().multiplyScalar(COCKPIT_ADVENTURE_SCALE),
    []
  )
  const shipPosRef = useRef(loadShipPosition().clone().multiplyScalar(COCKPIT_ADVENTURE_SCALE))
  const shipGroupRef = useRef<THREE.Group>(null)
  const prevShipPosRef = useRef(loadShipPosition().clone().multiplyScalar(COCKPIT_ADVENTURE_SCALE))
  const persistFrameRef = useRef(0)
  const [cockpitSolo, setCockpitSolo] = useState(false)
  const prevDockedRef = useRef(false)
  const dockStableRef = useRef(0)

  useEffect(() => {
    scene.fog = new THREE.FogExp2(0x000000, COCKPIT_FOG_EXP_DENSITY)
    const cam = camera as THREE.PerspectiveCamera
    if (cam.isPerspectiveCamera) {
      cam.fov = COCKPIT_CRUISE_FOV
      cam.updateProjectionMatrix()
    }
    return () => {
      scene.fog = null
      if (cam.isPerspectiveCamera) {
        cam.fov = 50
        cam.updateProjectionMatrix()
      }
    }
  }, [scene, camera])

  useEffect(() => {
    return () => {
      const cam = camera as THREE.PerspectiveCamera
      if (cam.isPerspectiveCamera) cam.clearViewOffset()
    }
  }, [camera])

  useEffect(() => {
    const persist = () => {
      saveShipPosition(shipPosRef.current.clone().divideScalar(COCKPIT_ADVENTURE_SCALE))
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') persist()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', persist)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', persist)
      persist()
    }
  }, [])

  useEffect(() => {
    setCockpitSolo(false)
    prevDockedRef.current = false
    dockStableRef.current = 0
  }, [selectedIndex])

  useFrame((_, delta) => {
    let target = new THREE.Vector3()

    if (selectedIndex === null) {
      target.copy(cockpitStaging)
    } else {
      const liveHold = computeNavHoldNearPlanet(
        selectedIndex,
        planetPositionsRef,
        COCKPIT_ADVENTURE_SCALE,
        COCKPIT_BODY_SCALE,
        { cockpitClose: true }
      )
      if (!liveHold) {
        target.copy(shipPosRef.current)
      } else {
        target.copy(liveHold)
      }
    }

    const distNav = shipPosRef.current.distanceTo(target)
    const S = COCKPIT_ADVENTURE_SCALE
    const farT = 14 * S
    const midT = 5 * S
    const baseK = distNav > farT ? 0.42 : distNav > midT ? 0.26 : 0.17
    const approachK = baseK * COCKPIT_JOURNEY_SPEED_MULT
    const moveBase = Math.min(1, delta * approachK)
    const atHold = distNav < COCKPIT_HOLD_EPS
    const moveAlpha = atHold ? Math.min(1, delta * 18) : moveBase

    if (atHold) {
      shipPosRef.current.copy(target)
    } else {
      shipPosRef.current.lerp(target, moveAlpha)
    }

    resolveOtherPlanetCollisions(
      shipPosRef.current,
      selectedIndex,
      planetPositionsRef,
      COCKPIT_ADVENTURE_SCALE,
      COCKPIT_BODY_SCALE
    )

    if (shipPosRef.current.distanceTo(target) < COCKPIT_HOLD_EPS) {
      shipPosRef.current.copy(target)
    }

    const speed = shipPosRef.current.distanceTo(prevShipPosRef.current) / Math.max(delta, 1 / 120)
    prevShipPosRef.current.copy(shipPosRef.current)

    persistFrameRef.current += 1
    if (persistFrameRef.current % 40 === 0) {
      saveShipPosition(shipPosRef.current.clone().divideScalar(COCKPIT_ADVENTURE_SCALE))
    }

    const ship = shipGroupRef.current
    if (ship) {
      ship.position.copy(shipPosRef.current)
      const look =
        selectedIndex !== null && planetPositionsRef.current[selectedIndex]?.lengthSq()
          ? planetPositionsRef.current[selectedIndex]
          : origin
      ship.lookAt(look)
    }

    const planetPos =
      selectedIndex !== null && planetPositionsRef.current[selectedIndex]?.lengthSq()
        ? planetPositionsRef.current[selectedIndex]
        : origin

    const distNavFinal = shipPosRef.current.distanceTo(target)
    const nearHold = selectedIndex !== null && distNavFinal < COCKPIT_HOLD_EPS
    if (nearHold) dockStableRef.current += delta
    else dockStableRef.current = 0

    const dockedAtPlanetHud =
      selectedIndex !== null && dockStableRef.current >= COCKPIT_DOCK_STABLE_SEC
    const dockedVisual = nearHold

    if (dockedVisual !== prevDockedRef.current) {
      prevDockedRef.current = dockedVisual
      setCockpitSolo(dockedVisual)
    }

    const sh = COCKPIT_SHIP_VISUAL_SCALE
    const camPerspPre = camera as THREE.PerspectiveCamera
    if (camPerspPre.isPerspectiveCamera) {
      const targetFov = dockedVisual && selectedIndex !== null ? COCKPIT_DOCK_FOV : COCKPIT_CRUISE_FOV
      camPerspPre.fov = THREE.MathUtils.lerp(camPerspPre.fov, targetFov, Math.min(1, delta * 3.2))
      camPerspPre.updateProjectionMatrix()
    }

    const camDesired = shipPosRef.current
      .clone()
      .add(new THREE.Vector3(0, 1.15, 0.15).multiplyScalar(sh).applyQuaternion(ship?.quaternion || new THREE.Quaternion()))

    const useHudAlign = Boolean(dockedVisual && selectedIndex !== null && hudCtx?.target.valid)
    const canvasLockedToFrame = Boolean(
      cockpitCanvasInTargetFrame && dockedVisual && selectedIndex !== null
    )
    if (dockedVisual && selectedIndex !== null && ship && !useHudAlign && !canvasLockedToFrame) {
      const distCamPlanet = camDesired.distanceTo(planetPos)
      const camPersp = camera as THREE.PerspectiveCamera
      if (camPersp.isPerspectiveCamera && distCamPlanet > 1e-3) {
        const fovRad = (camPersp.fov * Math.PI) / 180
        const halfH = distCamPlanet * Math.tan(fovRad / 2)
        const shift = halfH * 2 * COCKPIT_DOCK_FRAC_OF_SCREEN_HEIGHT
        const toPlanet = planetPos.clone().sub(camDesired)
        const fw = toPlanet.clone().normalize()
        const worldUp = new THREE.Vector3(0, 1, 0)
        let right = new THREE.Vector3().crossVectors(worldUp, fw)
        if (right.lengthSq() < 1e-10) right = new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), fw)
        right.normalize()
        const screenUp = new THREE.Vector3().crossVectors(right, fw).normalize()
        camDesired.addScaledVector(screenUp, -shift)
      }
    }

    camera.position.lerp(camDesired, Math.min(1, delta * 2.2))
    camera.up.set(0, 1, 0)
    if (ship) {
      if (dockedVisual && selectedIndex !== null) {
        camera.lookAt(planetPos)
      } else {
        const cockpitLook = shipPosRef.current
          .clone()
          .add(new THREE.Vector3(0, 0.6 * sh, 22).applyQuaternion(ship.quaternion))
        camera.lookAt(cockpitLook)
      }
    }

    const camPerspVo = camera as THREE.PerspectiveCamera
    if (camPerspVo.isPerspectiveCamera) {
      if (canvasLockedToFrame) {
        camPerspVo.clearViewOffset()
      } else if (dockedVisual && selectedIndex !== null && hudCtx?.target.valid) {
        const fullW = size.width
        const fullH = size.height
        const { canvasCenterX, canvasCenterY } = hudCtx.target
        const dx = (canvasCenterX - 0.5) * fullW
        const dy = (canvasCenterY - 0.5) * fullH
        camPerspVo.setViewOffset(fullW, fullH, dx, dy, fullW, fullH)
      } else {
        camPerspVo.clearViewOffset()
      }
    }

    const inv = 1 / COCKPIT_ADVENTURE_SCALE
    onTelemetry?.({
      speed: distNavFinal < COCKPIT_HOLD_EPS ? 0 : speed * inv,
      distance: shipPosRef.current.distanceTo(planetPos) * inv,
      targetIndex: selectedIndex,
      distToNavTarget: distNavFinal < COCKPIT_HOLD_EPS ? 0 : distNavFinal * inv,
      dockedAtPlanet: dockedAtPlanetHud,
    })
  })

  const solo = cockpitSolo && selectedIndex !== null

  return (
    <>
      {/* Không đèn Mặt Trời — hành tinh tự sáng (map), ambient mạnh cho “phiêu lưu”. */}
      <ambientLight intensity={solo ? 1.18 : 1.08} color="#e8f4ff" />

      {planetsData.map((data, i) => (
        <Planet
          key={data.name}
          data={data}
          index={i}
          positionRef={planetPositionsRef}
          interactive={sceneNavigationEnabled}
          visible={!solo || i === selectedIndex}
          unlitTexture
          orbitTimeScale={COCKPIT_ORBIT_TIME_SCALE}
          orbitScale={COCKPIT_ADVENTURE_SCALE}
          bodyScale={COCKPIT_BODY_SCALE}
          spinTimeScale={cockpitSolo && selectedIndex === i ? COCKPIT_SPIN_AT_LOCK : COCKPIT_SPIN_TRANSIT}
          onSelect={() => {}}
          onPlanetSelect={(idx) => setFlightTarget(idx)}
        />
      ))}

      <group ref={shipGroupRef} visible={false} scale={COCKPIT_SHIP_VISUAL_SCALE}>
        <SpaceShipMesh />
      </group>

      <CockpitParallaxStars visible={!solo} />
    </>
  )
}

function SceneContent({
  onPlanetSelect,
  mode,
  onTelemetry,
  flightTargetIndex,
  sceneNavigationEnabled,
  observerLockPending,
  observerTargetLock,
  onObserverLockArrived,
  cockpitCanvasInTargetFrame,
}: {
  onPlanetSelect?: (index: number | null) => void
  mode: 'observer' | 'cockpit'
  onTelemetry?: (payload: {
    speed: number
    distance: number
    targetIndex: number | null
    distToNavTarget: number
    dockedAtPlanet: boolean
  }) => void
  flightTargetIndex?: number | null
  sceneNavigationEnabled?: boolean
  observerLockPending?: boolean
  observerTargetLock?: boolean
  onObserverLockArrived?: () => void
  cockpitCanvasInTargetFrame?: boolean
}) {
  if (mode === 'cockpit') {
    return (
      <SceneCockpitContent
        onPlanetSelect={onPlanetSelect}
        onTelemetry={onTelemetry}
        flightTargetIndex={flightTargetIndex}
        sceneNavigationEnabled={sceneNavigationEnabled}
        cockpitCanvasInTargetFrame={cockpitCanvasInTargetFrame}
      />
    )
  }
  return (
    <SceneObserverContent
      onPlanetSelect={onPlanetSelect}
      flightTargetIndex={flightTargetIndex}
      observerLockPending={observerLockPending}
      observerTargetLock={observerTargetLock}
      onObserverLockArrived={onObserverLockArrived}
    />
  )
}

export default function SolarSystemScene({
  onPlanetSelect,
  mode = 'observer',
  onTelemetry,
  flightTargetIndex,
  sceneNavigationEnabled = true,
  observerLockPending = false,
  observerTargetLock = false,
  onObserverLockArrived,
  cockpitCanvasInTargetFrame = false,
}: {
  onPlanetSelect?: (index: number | null) => void
  mode?: 'observer' | 'cockpit'
  onTelemetry?: (payload: {
    speed: number
    distance: number
    targetIndex: number | null
    distToNavTarget: number
    dockedAtPlanet: boolean
  }) => void
  flightTargetIndex?: number | null
  sceneNavigationEnabled?: boolean
  observerLockPending?: boolean
  observerTargetLock?: boolean
  onObserverLockArrived?: () => void
  cockpitCanvasInTargetFrame?: boolean
}) {
  return (
    <Canvas
      camera={{ position: [0, 25, 45], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#000' }}
    >
      <Suspense fallback={null}>
        <SceneContent
          onPlanetSelect={onPlanetSelect}
          mode={mode}
          onTelemetry={onTelemetry}
          flightTargetIndex={flightTargetIndex}
          sceneNavigationEnabled={sceneNavigationEnabled}
          observerLockPending={observerLockPending}
          observerTargetLock={observerTargetLock}
          onObserverLockArrived={onObserverLockArrived}
          cockpitCanvasInTargetFrame={cockpitCanvasInTargetFrame}
        />
        <Preload all />
      </Suspense>
    </Canvas>
  )
}
