'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { narrativeSitesForBeat } from '@/features/content3d/narrative/lib/siteVisibility'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/stores/planetNarrativeStore'
import {
  computeSiteFlyGoal,
  easeOutCubic,
  SITE_FLY_DURATION_SEC,
} from '@/features/content3d/narrative/lib/globeCamera'

type FlyLeg = {
  active: boolean
  t: number
  fromTarget: THREE.Vector3
  fromCam: THREE.Vector3
  toTarget: THREE.Vector3
  toCam: THREE.Vector3
}

function newFlyLeg(): FlyLeg {
  return {
    active: false,
    t: 0,
    fromTarget: new THREE.Vector3(),
    fromCam: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    toCam: new THREE.Vector3(),
  }
}

/** Camera tween tới địa danh — ease-out; tôn trọng khi user đang kéo orbit. */
export function NarrativeSiteFlyTo({
  planetGroupRef,
  controlsRef,
  globeRadius,
}: {
  planetGroupRef: React.RefObject<THREE.Group | null>
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  globeRadius: number
}) {
  const { camera } = useThree()
  const selectedSiteId = usePlanetNarrativeStore((s) => s.selectedSiteId)
  const entityId = usePlanetNarrativeStore((s) => s.entityId)
  const beatId = usePlanetNarrativeStore((s) => s.currentBeat.id)
  const beats = usePlanetNarrativeStore((s) => s.beats)
  const sites = usePlanetNarrativeStore((s) => s.sites)
  const beatIds = beats.map((b) => b.id)
  const flyRef = useRef<FlyLeg>(newFlyLeg())
  const lastSiteRef = useRef<string | null>(null)

  useEffect(() => {
    const grp = planetGroupRef.current
    const ctrl = controlsRef.current
    if (!selectedSiteId) {
      flyRef.current.active = false
      lastSiteRef.current = null
      return
    }

    if (!grp || !ctrl) return

    if (selectedSiteId === lastSiteRef.current) return
    lastSiteRef.current = selectedSiteId

    const site = sites.find((s) => s.id === selectedSiteId)
    if (!site || !narrativeSitesForBeat(entityId, beatId, sites, beatIds).some((s) => s.id === selectedSiteId)) {
      flyRef.current.active = false
      return
    }

    const goal = computeSiteFlyGoal(site.lat, site.lng, grp, globeRadius)
    flyRef.current = {
      active: true,
      t: 0,
      fromTarget: ctrl.target.clone(),
      fromCam: camera.position.clone(),
      toTarget: goal.target,
      toCam: goal.camera,
    }
  }, [selectedSiteId, entityId, beatId, sites, beatIds, planetGroupRef, controlsRef, camera, globeRadius])

  useFrame((_, dt) => {
    const leg = flyRef.current
    if (!leg.active) return

    const ctrl = controlsRef.current
    const grp = planetGroupRef.current
    if (!ctrl || !grp) return

    if (usePlanetNarrativeStore.getState().orbitInteracting) {
      leg.active = false
      return
    }

    leg.t += dt / SITE_FLY_DURATION_SEC
    const u = easeOutCubic(leg.t)

    ctrl.target.lerpVectors(leg.fromTarget, leg.toTarget, u)
    camera.position.lerpVectors(leg.fromCam, leg.toCam, u)
    ctrl.update()

    if (leg.t >= 1) {
      ctrl.target.copy(leg.toTarget)
      camera.position.copy(leg.toCam)
      ctrl.update()
      leg.active = false
    }
  })

  return null
}
