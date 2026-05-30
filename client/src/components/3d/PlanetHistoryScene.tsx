'use client'

import type { ThreeEvent } from '@react-three/fiber'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Preload, Stars } from '@react-three/drei'
import React, { Suspense, useCallback, useEffect, useMemo, useRef, type ComponentPropsWithoutRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { NarrativeSite } from '@/features/content3d/narrative/types'
import { narrativeSitesForBeat } from '@/features/content3d/narrative/lib/siteVisibility'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/stores/planetNarrativeStore'
import { EraVisualLayers } from '@/components/3d/EraVisualLayers'
import { ShowcaseDiffuseGlobe } from '@/components/3d/showcase/ShowcaseDiffuseGlobe'
import { ShowcaseModelEntityMesh } from '@/components/3d/showcase/ShowcaseModelEntityMesh'
import { getStaticAssetUrl, resolveMediaUrl } from '@/lib/apiConfig'
import { isResolvableShowcaseAssetUrl } from '@/lib/showcaseMediaUrl'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import { PLANET_GLOBE_RADIUS } from '@/features/content3d/narrative/lib/globeCamera'
import { NarrativeSitePin } from '@/features/content3d/narrative/ui/NarrativeSitePin'
import { NarrativeSiteFlyTo } from '@/features/content3d/narrative/ui/NarrativeSiteFlyTo'

function ShowcaseGlobeOrModel({
  entity,
  sphereRadius,
  meshProps,
}: {
  entity: ShowcaseOrbitEntity
  sphereRadius: number
  meshProps: ComponentPropsWithoutRef<'mesh'>
}) {
  const remoteModelRaw = entity.remoteModelUrl?.trim()
  if (remoteModelRaw && isResolvableShowcaseAssetUrl(remoteModelRaw)) {
    return (
      <ShowcaseModelEntityMesh entity={entity} modelUrl={resolveMediaUrl(remoteModelRaw)} active={false} />
    )
  }

  if (entity.modelPath) {
    return (
      <ShowcaseModelEntityMesh entity={entity} modelUrl={getStaticAssetUrl(entity.modelPath)} active={false} />
    )
  }

  return (
    <ShowcaseDiffuseGlobe
      entity={entity}
      sphereRadius={sphereRadius}
      skipDistanceBasedScale
      visualOpacity={1}
      meshProps={meshProps}
    />
  )
}

function assignForwardedRef<T>(forwardedRef: React.Ref<T> | undefined, node: T | null) {
  if (!forwardedRef) return
  if (typeof forwardedRef === 'function') forwardedRef(node as T & null)
  else (forwardedRef as React.MutableRefObject<T | null>).current = node
}

const PlanetGroup = React.forwardRef<
  THREE.Group,
  {
    globeRotationPaused: boolean
    globeEntity: ShowcaseOrbitEntity
  }
>(function PlanetGroup({ globeRotationPaused, globeEntity }, forwardedRef) {
  const innerRef = useRef<THREE.Group | null>(null)
  const setPlanetRef = useCallback(
    (node: THREE.Group | null) => {
      innerRef.current = node
      assignForwardedRef(forwardedRef, node)
    },
    [forwardedRef],
  )

  const pointerDownPlanetRef = useRef<{ clientX: number; clientY: number } | null>(null)

  const entityId = usePlanetNarrativeStore((s) => s.entityId)
  const currentBeat = usePlanetNarrativeStore((s) => s.currentBeat)
  const beats = usePlanetNarrativeStore((s) => s.beats)
  const sites = usePlanetNarrativeStore((s) => s.sites)
  const selectedSiteId = usePlanetNarrativeStore((s) => s.selectedSiteId)

  const beatIds = useMemo(() => beats.map((b) => b.id), [beats])

  const sitesForBeat = useMemo(
    () => narrativeSitesForBeat(entityId, currentBeat.id, sites, beatIds),
    [entityId, currentBeat.id, sites, beatIds],
  )

  useFrame((_, dt) => {
    if (!innerRef.current || globeRotationPaused) return
    innerRef.current.rotation.y += dt * 0.055
  })

  const onPickSite = useCallback((site: NarrativeSite) => {
    usePlanetNarrativeStore.getState().setSelectedSiteId(site.id)
  }, [])

  const onPlanetPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button !== 0) return
    pointerDownPlanetRef.current = { clientX: e.nativeEvent.clientX, clientY: e.nativeEvent.clientY }
  }, [])

  const onPlanetPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button !== 0) return
    const down = pointerDownPlanetRef.current
    pointerDownPlanetRef.current = null
    if (!down) return
    const dx = e.nativeEvent.clientX - down.clientX
    const dy = e.nativeEvent.clientY - down.clientY
    if (dx * dx + dy * dy > 36) return
    usePlanetNarrativeStore.getState().setSelectedSiteId(null)
  }, [])

  const onPlanetLeave = useCallback(() => {
    pointerDownPlanetRef.current = null
  }, [])

  const globeMeshProps = useMemo(
    () =>
      ({
        onPointerDown: onPlanetPointerDown,
        onPointerUp: onPlanetPointerUp,
        onPointerLeave: onPlanetLeave,
        onPointerCancel: onPlanetLeave,
      }) satisfies ComponentPropsWithoutRef<'mesh'>,
    [onPlanetPointerDown, onPlanetPointerUp, onPlanetLeave],
  )

  return (
    <group ref={setPlanetRef}>
      <ShowcaseGlobeOrModel entity={globeEntity} sphereRadius={PLANET_GLOBE_RADIUS} meshProps={globeMeshProps} />

      <EraVisualLayers globeRadius={PLANET_GLOBE_RADIUS} />

      {sitesForBeat.map((site) => (
        <NarrativeSitePin key={site.id} site={site} selected={selectedSiteId === site.id} onPick={onPickSite} />
      ))}
    </group>
  )
})

function Scene({ globeEntity }: { globeEntity: ShowcaseOrbitEntity }) {
  const globeRotationPaused = usePlanetNarrativeStore((s) => s.globeRotationPaused)
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const planetRef = useRef<THREE.Group>(null)
  const orbitIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (orbitIdleTimerRef.current) clearTimeout(orbitIdleTimerRef.current)
    }
  }, [])

  const handleOrbitStart = useCallback(() => {
    if (orbitIdleTimerRef.current) {
      clearTimeout(orbitIdleTimerRef.current)
      orbitIdleTimerRef.current = null
    }
    usePlanetNarrativeStore.getState().setOrbitInteracting(true)
  }, [])

  const handleOrbitEnd = useCallback(() => {
    if (orbitIdleTimerRef.current) clearTimeout(orbitIdleTimerRef.current)
    orbitIdleTimerRef.current = setTimeout(() => {
      orbitIdleTimerRef.current = null
      usePlanetNarrativeStore.getState().setOrbitInteracting(false)
    }, 160)
  }, [])

  return (
    <>
      <ambientLight intensity={2.45} />
      <Stars radius={380} depth={110} count={10000} factor={0.82} saturation={0} fade speed={0.32} />
      <PlanetGroup ref={planetRef} globeRotationPaused={globeRotationPaused} globeEntity={globeEntity} />
      <NarrativeSiteFlyTo planetGroupRef={planetRef} controlsRef={controlsRef} globeRadius={PLANET_GLOBE_RADIUS} />
      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={1.72}
        maxDistance={92}
        autoRotate={false}
        onStart={handleOrbitStart}
        onEnd={handleOrbitEnd}
      />
    </>
  )
}

const onCanvasPointerMissed = () => {
  usePlanetNarrativeStore.getState().setSelectedSiteId(null)
}

export default function PlanetHistoryScene({ globeEntity }: { globeEntity: ShowcaseOrbitEntity }) {
  return (
    <Canvas
      className="h-full w-full"
      camera={{ position: [0, 4, 22], fov: 58, near: 0.02 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#100818' }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.28
      }}
      onPointerMissed={onCanvasPointerMissed}
    >
      <color attach="background" args={['#100818']} />
      <Suspense fallback={null}>
        <Scene globeEntity={globeEntity} />
        <Preload all />
      </Suspense>
    </Canvas>
  )
}
