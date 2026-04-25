'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Preload } from '@react-three/drei'
import { Suspense } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { planetsData } from '@/lib/solarSystemData'
import { NASA_SHOWCASE_ITEMS } from '@/lib/showcaseEntities'
import { resolveShowcaseFocusPlanetIndex } from '@/lib/showcaseOrbitFocus'
import { OrbitPath } from '@/components/3d/OrbitPath'
import { Planet, Sun } from '@/components/3d/planetBodies'
import { ExploreEntityFx } from '@/components/3d/ExploreEntityFx'
import { ShowcaseLighting } from '@/components/3d/showcase/ShowcaseLighting'
import { ShowcaseEntityLayer } from '@/components/3d/showcase/ShowcaseEntityLayer'
import {
  ShowcaseCameraManager,
  type ShowcaseCameraSpherical,
} from '@/components/3d/showcase/ShowcaseCameraManager'
import { useShowcaseStore } from '@/store/showcaseStore'

function safeCameraRadialDir(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 {
  const d = from.clone().sub(to)
  if (d.lengthSq() < 1e-10) return new THREE.Vector3(0, 0.22, 1).normalize()
  return d.normalize()
}

function sanitizeControlsCamera(c: OrbitControlsImpl) {
  const p = c.object.position
  const t = c.target
  if (!Number.isFinite(p.x + p.y + p.z + t.x + t.y + t.z)) {
    t.set(0, 0, 0)
    p.set(0, 19, 58)
  }
}

/** Per-orbit fade scales with semi-major axis (NASA Eyes-like behavior). */
const PLANET_HELIO_ORBIT_FADE_NEAR_SCALE = 0.75
const PLANET_HELIO_ORBIT_FADE_FAR_SCALE = 3

function ShowcaseSceneContent({
  showcaseActiveItemId,
  onShowcaseItemSelect,
  flightTargetIndex,
  onPlanetSelect,
  observerDisableAutoTarget = false,
  observerExploreEntityId,
  observerTargetLock = false,
  initialSpherical,
  onCameraSettled,
}: {
  showcaseActiveItemId: string | null
  onShowcaseItemSelect?: (id: string) => void
  flightTargetIndex?: number | null
  onPlanetSelect?: (index: number | null) => void
  observerDisableAutoTarget?: boolean
  observerExploreEntityId?: string | null
  observerTargetLock?: boolean
  initialSpherical?: ShowcaseCameraSpherical | null
  onCameraSettled?: (spherical: ShowcaseCameraSpherical) => void
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const { camera, scene } = useThree()
  const planetPositionsRef = useRef<THREE.Vector3[]>(
    Array.from({ length: planetsData.length }, () => new THREE.Vector3())
  )
  const showcaseEntityPositionsRef = useRef<Map<string, THREE.Vector3>>(new Map())
  const [internalIndex, setInternalIndex] = useState<number | null>(null)
  const [hoveredOrbitIndex, setHoveredOrbitIndex] = useState<number | null>(null)
  const selectedIndex = flightTargetIndex !== undefined ? flightTargetIndex : internalIndex

  const activeGroup = useMemo(
    () => NASA_SHOWCASE_ITEMS.find((i) => i.id === showcaseActiveItemId)?.group ?? 'planets_moons',
    [showcaseActiveItemId],
  )
  const isPlanetFocus = Boolean(showcaseActiveItemId?.startsWith('planet-'))
  const isEntityFocus = Boolean(showcaseActiveItemId && !isPlanetFocus)
  const focusPlanetIndex = useMemo(
    () => resolveShowcaseFocusPlanetIndex(showcaseActiveItemId, selectedIndex),
    [showcaseActiveItemId, selectedIndex],
  )
  const setFocusedEntity = useShowcaseStore((s) => s.setFocusedEntity)
  const cameraDistanceToSun = useShowcaseStore((s) => s.cameraDistanceToSun)

  useEffect(() => {
    setFocusedEntity(showcaseActiveItemId ?? null)
  }, [showcaseActiveItemId, setFocusedEntity])

  const setSelection = (idx: number | null) => {
    if (flightTargetIndex === undefined) setInternalIndex(idx)
    onPlanetSelect?.(idx)
  }

  const locked = observerTargetLock === true
  // Continuous single-scene behavior: this only enables camera assistance, not a hard scene mode switch.
  const focusAssistActive = observerDisableAutoTarget === true && locked && selectedIndex !== null
  const selectedSemiMajorAxis = selectedIndex !== null ? Math.max(1, planetsData[selectedIndex]?.distance ?? 1) : 1
  const focusBlend =
    selectedIndex !== null
      ? THREE.MathUtils.clamp(
          1 - cameraDistanceToSun / Math.max(6, selectedSemiMajorAxis * 3),
          0,
          1,
        )
      : 0
  const motionScale = selectedIndex !== null ? 0 : 1

  useEffect(() => {
    scene.fog = null
    const cam = camera as THREE.PerspectiveCamera
    if (cam.isPerspectiveCamera) {
      cam.clearViewOffset()
      cam.fov = 45
      cam.near = 0.1
      cam.far = 2000
      cam.updateProjectionMatrix()
    }
    camera.up.set(0, 1, 0)
    const t = window.setTimeout(() => {
      const c = controlsRef.current
      if (!c) return
      c.target.set(0, 0, 0)
      c.object.position.set(0, 19, 58)
      c.update()
    }, 0)
    return () => clearTimeout(t)
  }, [scene, camera])

  useFrame((_, dt) => {
    const c = controlsRef.current
    if (!c || !focusAssistActive || selectedIndex === null) return
    sanitizeControlsCamera(c)
    const p = planetPositionsRef.current[selectedIndex]
    if (!p || p.lengthSq() < 1e-6) return
    const desiredDistance =
      observerExploreEntityId === 'venus-greenhouse' ? 4.25 :
      observerExploreEntityId === 'venus-atmosphere' ? 4.8 :
      5.2
    c.target.lerp(p, 0.18)
    const dir = safeCameraRadialDir(c.object.position, c.target)
    const desiredPos = c.target.clone().add(dir.multiplyScalar(desiredDistance))
    c.object.position.lerp(desiredPos, Math.min(1, dt * 2.2))
    sanitizeControlsCamera(c)
    c.update()
  })

  useFrame(() => {
    const c = controlsRef.current
    if (c) sanitizeControlsCamera(c)
  })

  return (
    <>
      <ShowcaseLighting />

      {planetsData.map((data, i) => {
        const isSelected = i === selectedIndex
        const isHovered = i === hoveredOrbitIndex
        const a = Math.max(1, data.distance)
        const proximityFade = {
          getWorldPosition: () => {
            const p = planetPositionsRef.current[i]
            return p && p.lengthSq() > 1e-8 ? p : null
          },
          // Each orbit fades by its own scale (NASA Eyes-like), not a flat global threshold.
          near: Math.max(2.4, a * PLANET_HELIO_ORBIT_FADE_NEAR_SCALE),
          far: Math.max(6.2, a * PLANET_HELIO_ORBIT_FADE_FAR_SCALE),
          getCameraDistance: () => cameraDistanceToSun,
        }
        return (
          <OrbitPath
            key={data.name}
            data={data}
            highlighted={isSelected || isHovered}
            visible
            interactive={false}
            proximityFade={proximityFade}
            onHoverChange={(hovered) => setHoveredOrbitIndex(hovered ? i : (prev) => (prev === i ? null : prev))}
          />
        )
      })}

      <Sun
        visible
        interactive={!isEntityFocus}
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
          visible
          unlitTexture
          orbitTimeScale={motionScale}
          spinTimeScale={motionScale}
          showLabel
          compactPlanetLabel
          interactive={!isEntityFocus}
          onHoverChange={(hovered) => setHoveredOrbitIndex(hovered ? i : (prev) => (prev === i ? null : prev))}
          onSelect={() => {
            setSelection(i)
          }}
          onPlanetSelect={onPlanetSelect}
        />
      ))}

      <ExploreEntityFx
        entityId={observerExploreEntityId}
        planetPositionsRef={planetPositionsRef}
        selectedIndex={selectedIndex}
        selectedRadius={selectedIndex !== null ? planetsData[selectedIndex]?.radius ?? 1 : 1}
        visible={Boolean(observerExploreEntityId && selectedIndex !== null && focusBlend > 0.3)}
      />

      <ShowcaseEntityLayer
        planetPositionsRef={planetPositionsRef}
        activeItemId={showcaseActiveItemId}
        visible
        frozen={selectedIndex !== null}
        activeGroup={activeGroup}
        selectedPlanetName={selectedIndex !== null ? planetsData[selectedIndex]?.name ?? null : null}
        onPositionUpdate={(id, p) => showcaseEntityPositionsRef.current.set(id, p.clone())}
        onSelectEntity={(id) => onShowcaseItemSelect?.(id)}
      />

      <ShowcaseCameraManager
        controlsRef={controlsRef}
        planetPositionsRef={planetPositionsRef}
        showcaseEntityPositionsRef={showcaseEntityPositionsRef}
        activeItemId={showcaseActiveItemId}
        selectedIndex={selectedIndex}
        initialSpherical={initialSpherical ?? undefined}
        onCameraSettled={onCameraSettled}
      />

      <group visible>
        <Stars radius={260} depth={120} count={9000} factor={3.6} saturation={0.85} fade speed={0.45} />
      </group>
      <group visible>
        <Stars radius={180} depth={70} count={4500} factor={5.2} saturation={1} fade speed={0.65} />
      </group>
      <group visible>
        <Stars radius={360} depth={180} count={12000} factor={2.3} saturation={0.9} fade speed={0.28} />
      </group>

      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={0.2}
        maxDistance={220}
        target={[0, 0, 0]}
        panSpeed={0.8}
        zoomSpeed={1.2}
        rotateSpeed={0.6}
        onStart={() => useShowcaseStore.getState().setShowcaseCameraUserOverride(true)}
      />
    </>
  )
}

export default function ShowcaseScene({
  showcaseActiveItemId,
  onShowcaseItemSelect,
  flightTargetIndex,
  onPlanetSelect,
  observerDisableAutoTarget,
  observerExploreEntityId,
  observerTargetLock,
  initialSpherical,
  onCameraSettled,
}: {
  showcaseActiveItemId: string | null
  onShowcaseItemSelect?: (id: string) => void
  flightTargetIndex?: number | null
  onPlanetSelect?: (index: number | null) => void
  observerDisableAutoTarget?: boolean
  observerExploreEntityId?: string | null
  observerTargetLock?: boolean
  initialSpherical?: ShowcaseCameraSpherical | null
  onCameraSettled?: (spherical: ShowcaseCameraSpherical) => void
}) {
  useEffect(() => {
    return () => {
      useShowcaseStore.getState().setFocusedStudioPosition(null)
      useShowcaseStore.getState().setPreloadGroup(null)
      useShowcaseStore.getState().setShowcaseCameraUserOverride(false)
      useShowcaseStore.getState().setFocusedEntity(null)
    }
  }, [])

  return (
    <Canvas
      camera={{ position: [0, 19, 58], fov: 45 }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
      }}
      style={{ background: '#000' }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.08
      }}
    >
      <Suspense fallback={null}>
        <ShowcaseSceneContent
          showcaseActiveItemId={showcaseActiveItemId}
          onShowcaseItemSelect={onShowcaseItemSelect}
          flightTargetIndex={flightTargetIndex}
          onPlanetSelect={onPlanetSelect}
          observerDisableAutoTarget={observerDisableAutoTarget}
          observerExploreEntityId={observerExploreEntityId}
          observerTargetLock={observerTargetLock}
          initialSpherical={initialSpherical}
          onCameraSettled={onCameraSettled}
        />
        <Preload all />
      </Suspense>
    </Canvas>
  )
}
