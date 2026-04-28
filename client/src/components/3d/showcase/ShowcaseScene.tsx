'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Preload } from '@react-three/drei'
import { Suspense } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { planetsData } from '@/lib/solarSystemData'
import {
  NASA_SHOWCASE_ITEMS,
  resolveShowcaseOrbitParentPlanetName,
  type ShowcaseOrbitEntity,
} from '@/lib/showcaseEntities'
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
const TARGET_SCENE_RADIUS = 320
const SHOWCASE_MAX_DISTANCE_FLOOR = 240
const SHOWCASE_MAX_DISTANCE_CEIL = 2200

function planetEntityId(name: string): string {
  return `planet-${name.toLowerCase()}`
}
type ShowcaseContextLevel = 'solar' | 'planet' | 'moon'

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
  orbitEntities,
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
  orbitEntities?: ShowcaseOrbitEntity[]
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const controlsTargetRef = useRef<[number, number, number]>([0, 0, 0])
  const programmaticMoveRef = useRef(false)
  const activeGroupById = useMemo(
    () => new Map(NASA_SHOWCASE_ITEMS.map((i) => [String(i.id || '').trim(), i.group] as const)),
    [],
  )
  const { camera, scene } = useThree()
  const planetPositionsRef = useRef<THREE.Vector3[]>(
    Array.from({ length: planetsData.length }, () => new THREE.Vector3())
  )
  const showcaseEntityPositionsRef = useRef<Map<string, THREE.Vector3>>(new Map())
  const [internalIndex, setInternalIndex] = useState<number | null>(null)
  const [hoveredOrbitIndex, setHoveredOrbitIndex] = useState<number | null>(null)
  const [dynamicContextLevel, setDynamicContextLevel] = useState<ShowcaseContextLevel>('solar')
  const selectedIndex = flightTargetIndex !== undefined ? flightTargetIndex : internalIndex
  const runtimePlanetsData = useMemo(() => {
    const maxSemiMajorAu = (orbitEntities || []).reduce((mx, e) => {
      const a = Number(e.semiMajorAxisAu ?? e.orbitalElements?.a ?? 0)
      return Number.isFinite(a) && a > 0 ? Math.max(mx, a) : mx
    }, 0)
    const auToSceneUnits =
      maxSemiMajorAu > 0 ? THREE.MathUtils.clamp(TARGET_SCENE_RADIUS / maxSemiMajorAu, 8.5, 26) : 26
    const byId = new Map((orbitEntities || []).map((e) => [String(e.id || '').trim(), e] as const))
    return planetsData.map((p) => {
      const o = byId.get(planetEntityId(p.name))
      if (!o) return p
      const periodDays = Number(o.orbitalElements?.periodDays ?? o.periodDays ?? 0)
      const semiMajorAu = Number(o.semiMajorAxisAu ?? o.orbitalElements?.a ?? 0)
      const nextDistance =
        Number.isFinite(semiMajorAu) && semiMajorAu > 0 ? semiMajorAu * auToSceneUnits * 1.1 : p.distance
      return {
        ...p,
        distance: nextDistance,
        period: Number.isFinite(periodDays) && periodDays > 0 ? periodDays : p.period,
        orbitColor: o.orbitColor || p.orbitColor,
        orbitEccentricity:
          Number.isFinite(Number(o.orbitalElements?.e)) ? Number(o.orbitalElements?.e) : p.orbitEccentricity,
        orbitInclinationDeg:
          Number.isFinite(Number(o.orbitalElements?.i)) ? Number(o.orbitalElements?.i) : p.orbitInclinationDeg,
        orbitAscendingNodeDeg:
          Number.isFinite(Number(o.orbitalElements?.om)) ? Number(o.orbitalElements?.om) : p.orbitAscendingNodeDeg,
        orbitPhaseDeg: Number.isFinite(Number(o.orbitalElements?.m)) ? Number(o.orbitalElements?.m) : p.orbitPhaseDeg,
      }
    })
  }, [orbitEntities])
  const orbitById = useMemo(
    () => new Map((orbitEntities || []).map((e) => [String(e.id || '').trim(), e] as const)),
    [orbitEntities],
  )
  const catalogById = useMemo(
    () => new Map(NASA_SHOWCASE_ITEMS.map((i) => [String(i.id || '').trim(), i] as const)),
    [],
  )

  const activeGroup = showcaseActiveItemId ? activeGroupById.get(showcaseActiveItemId) ?? 'planets_moons' : 'planets_moons'
  const activeCatalogItem = showcaseActiveItemId ? catalogById.get(showcaseActiveItemId) ?? null : null
  const activeOrbitEntity = showcaseActiveItemId ? orbitById.get(showcaseActiveItemId) ?? null : null
  const isMoonSelection = useMemo(() => {
    if (!showcaseActiveItemId || showcaseActiveItemId.startsWith('planet-')) return false
    if (showcaseActiveItemId.startsWith('moon-')) return true
    if (!activeOrbitEntity) return false
    return Boolean(
      resolveShowcaseOrbitParentPlanetName(activeOrbitEntity) ||
        String(activeOrbitEntity.parentShowcaseEntityId || '').trim(),
    )
  }, [showcaseActiveItemId, activeOrbitEntity])
  const contextPlanetName = useMemo(() => {
    if (!showcaseActiveItemId) return null
    if (showcaseActiveItemId.startsWith('planet-')) {
      const slug = showcaseActiveItemId.slice('planet-'.length)
      const p = planetsData.find((x) => x.name.toLowerCase() === slug)
      return p?.name ?? null
    }
    const byOrbit = activeOrbitEntity ? resolveShowcaseOrbitParentPlanetName(activeOrbitEntity) : null
    if (byOrbit) return byOrbit
    const linked = String(activeCatalogItem?.linkedPlanetName || '').trim()
    return linked || null
  }, [showcaseActiveItemId, activeOrbitEntity, activeCatalogItem])
  const contextLevel: ShowcaseContextLevel = !showcaseActiveItemId
    ? 'solar'
    : showcaseActiveItemId.startsWith('planet-')
      ? 'planet'
      : isMoonSelection && contextPlanetName
        ? 'moon'
        : 'planet'
  const setFocusedEntity = useShowcaseStore((s) => s.setFocusedEntity)
  const cameraDistanceToSun = useShowcaseStore((s) => s.cameraDistanceToSun)

  useEffect(() => {
    setFocusedEntity(showcaseActiveItemId ?? null)
  }, [showcaseActiveItemId, setFocusedEntity])

  const setSelection = (idx: number | null) => {
    if (flightTargetIndex === undefined) setInternalIndex(idx)
    onPlanetSelect?.(idx)
  }

  const contextPlanetIndex = contextPlanetName ? runtimePlanetsData.findIndex((p) => p.name === contextPlanetName) : -1
  const effectiveSelectedIndex = selectedIndex ?? (contextPlanetIndex >= 0 ? contextPlanetIndex : null)
  const selectedSemiMajorAxis =
    effectiveSelectedIndex !== null ? Math.max(1, runtimePlanetsData[effectiveSelectedIndex]?.distance ?? 1) : 1
  const focusBlend =
    effectiveSelectedIndex !== null
      ? THREE.MathUtils.clamp(
          1 - cameraDistanceToSun / Math.max(6, selectedSemiMajorAxis * 3),
          0,
          1,
        )
      : 0
  const motionScale = 1
  const maxOrbitDistance = useMemo(
    () => runtimePlanetsData.reduce((m, p) => Math.max(m, Number.isFinite(p.distance) ? p.distance : 0), 0),
    [runtimePlanetsData],
  )
  const sceneRadius = Math.max(90, maxOrbitDistance)
  const overviewDistance = THREE.MathUtils.clamp(sceneRadius * 1.85, 110, 1300)
  const dynamicMaxDistance = THREE.MathUtils.clamp(sceneRadius * 4, SHOWCASE_MAX_DISTANCE_FLOOR, SHOWCASE_MAX_DISTANCE_CEIL)

  useFrame(() => {
    const solarRatio = cameraDistanceToSun / Math.max(1, sceneRadius)
    let next: ShowcaseContextLevel = 'solar'
    if (solarRatio <= 0.6 && showcaseActiveItemId) {
      if (!isMoonSelection) {
        next = 'planet'
      } else if (contextPlanetIndex >= 0) {
        const parentPos = planetPositionsRef.current[contextPlanetIndex]
        const parentRadius = Math.max(0.2, runtimePlanetsData[contextPlanetIndex]?.radius ?? 0.75)
        const camDistToParent = parentPos ? camera.position.distanceTo(parentPos) : Infinity
        if (camDistToParent > parentRadius * 40) next = 'solar'
        else if (camDistToParent > parentRadius * 15) next = 'planet'
        else next = 'moon'
      } else {
        next = 'planet'
      }
    }
    setDynamicContextLevel((prev) => (prev === next ? prev : next))
  })

  useFrame(() => {
    // Unify focus pipeline: planets are also tracked in entity position map.
    for (let i = 0; i < runtimePlanetsData.length; i++) {
      const planetName = runtimePlanetsData[i]?.name
      if (!planetName) continue
      const pid = planetEntityId(planetName)
      const p = planetPositionsRef.current[i]
      if (!p || p.lengthSq() <= 1e-8) continue
      const prev = showcaseEntityPositionsRef.current.get(pid)
      if (prev) prev.copy(p)
      else showcaseEntityPositionsRef.current.set(pid, p.clone())
    }
  })

  useEffect(() => {
    scene.fog = null
    const cam = camera as THREE.PerspectiveCamera
    if (cam.isPerspectiveCamera) {
      cam.clearViewOffset()
      cam.fov = 45
      cam.near = 0.1
      cam.far = Math.max(1500, sceneRadius * 8)
      cam.updateProjectionMatrix()
    }
    camera.up.set(0, 1, 0)
  }, [scene, camera, sceneRadius])

  useEffect(() => {
    const c = controlsRef.current
    if (!c) return
    c.target.set(0, 0, 0)
    c.object.position.set(0, overviewDistance * 0.4, overviewDistance)
    sanitizeControlsCamera(c)
    c.update()
  }, [overviewDistance])

  return (
    <>
      <ShowcaseLighting />

      {runtimePlanetsData.map((data, i) => {
        const isSelected = i === effectiveSelectedIndex
        const isHovered = i === hoveredOrbitIndex
        const isContextPlanet = contextPlanetName ? data.name === contextPlanetName : false
        const orbitVisible =
          dynamicContextLevel === 'moon'
            ? isContextPlanet
            : dynamicContextLevel === 'planet'
              ? true
              : true
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
            highlighted={(isSelected || isHovered) && orbitVisible}
            visible={orbitVisible}
            interactive={false}
            proximityFade={proximityFade}
            onHoverChange={(hovered) => setHoveredOrbitIndex(hovered ? i : (prev) => (prev === i ? null : prev))}
          />
        )
      })}

      <Sun
        visible
        interactive
        onSelect={() => {
          setSelection(null)
        }}
      />
      {runtimePlanetsData.map((data, i) => (
        (() => {
          const isContextPlanet = contextPlanetName ? data.name === contextPlanetName : false
          const showPlanet = true
          if (!showPlanet) return null
          return (
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
          exploreStyleLod
          isSelected={effectiveSelectedIndex === i}
          interactive
          onHoverChange={(hovered) => setHoveredOrbitIndex(hovered ? i : (prev) => (prev === i ? null : prev))}
          onSelect={() => {
            setSelection(i)
            onShowcaseItemSelect?.(planetEntityId(data.name))
          }}
          onPlanetSelect={onPlanetSelect}
        />
          )
        })()
      ))}

      <ExploreEntityFx
        entityId={observerExploreEntityId}
        planetPositionsRef={planetPositionsRef}
        selectedIndex={effectiveSelectedIndex}
        selectedRadius={effectiveSelectedIndex !== null ? runtimePlanetsData[effectiveSelectedIndex]?.radius ?? 1 : 1}
        visible={Boolean(observerExploreEntityId && effectiveSelectedIndex !== null && focusBlend > 0.3)}
      />

      <ShowcaseEntityLayer
        planetPositionsRef={planetPositionsRef}
        activeItemId={showcaseActiveItemId}
        visible
        frozen={selectedIndex !== null}
        activeGroup={activeGroup}
        selectedPlanetName={dynamicContextLevel === 'solar' ? null : contextPlanetName}
        onPositionUpdate={(id, p) => {
          const prev = showcaseEntityPositionsRef.current.get(id)
          if (prev) prev.copy(p)
          else showcaseEntityPositionsRef.current.set(id, p.clone())
        }}
        onSelectEntity={(id) => onShowcaseItemSelect?.(id)}
        orbitEntities={orbitEntities}
      />

      <ShowcaseCameraManager
        controlsRef={controlsRef}
        planetPositionsRef={planetPositionsRef}
        showcaseEntityPositionsRef={showcaseEntityPositionsRef}
        activeItemId={showcaseActiveItemId}
        selectedIndex={effectiveSelectedIndex}
        focusPlanetName={contextPlanetName}
        focusParentSystem={false}
        initialSpherical={initialSpherical ?? undefined}
        onCameraSettled={onCameraSettled}
        onProgrammaticMoveChange={(v) => {
          programmaticMoveRef.current = v
        }}
      />

      <Stars radius={260} depth={120} count={9000} factor={3.6} saturation={0.85} fade speed={0.45} />
      <Stars radius={180} depth={70} count={4500} factor={5.2} saturation={1} fade speed={0.65} />
      <Stars radius={360} depth={180} count={12000} factor={2.3} saturation={0.9} fade speed={0.28} />

      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={0.2}
        maxDistance={dynamicMaxDistance}
        target={controlsTargetRef.current}
        panSpeed={0.8}
        zoomSpeed={1.2}
        rotateSpeed={0.6}
        onStart={() => {
          if (!programmaticMoveRef.current) {
            useShowcaseStore.getState().setShowcaseCameraUserOverride(true)
          }
        }}
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
  orbitEntities,
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
  orbitEntities?: ShowcaseOrbitEntity[]
}) {
  useEffect(() => {
    return () => {
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
          orbitEntities={orbitEntities}
        />
        <Preload all />
      </Suspense>
    </Canvas>
  )
}
