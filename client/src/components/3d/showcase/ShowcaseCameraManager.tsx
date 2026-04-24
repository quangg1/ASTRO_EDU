'use client'

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { NASA_SHOWCASE_ITEMS, SHOWCASE_ORBIT_ENTITIES } from '@/lib/showcaseEntities'
import { planetsData } from '@/lib/solarSystemData'
import { useShowcaseStore } from '@/store/showcaseStore'

export type ShowcaseCameraSpherical = { distance: number; az: number; el: number }

function cameraOffsetToSpherical(c: OrbitControlsImpl): ShowcaseCameraSpherical | null {
  const off = new THREE.Vector3().subVectors(c.object.position, c.target)
  const d = off.length()
  if (!Number.isFinite(d) || d < 1e-4) return null
  const el = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(off.y / d, -1, 1)))
  const az = THREE.MathUtils.radToDeg(Math.atan2(off.x, off.z))
  return { distance: d, az, el }
}

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

function isFiniteVec(v: THREE.Vector3) {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)
}

/** Scripted framing stops after this long even if the focus point keeps moving (orbits). */
const MAX_TRANSITION_SEC = 0.9

type Props = {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  planetPositionsRef: React.MutableRefObject<THREE.Vector3[]>
  showcaseEntityPositionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>
  activeItemId: string | null | undefined
  selectedIndex: number | null
  /** Initial URL-driven camera (optional) */
  initialSpherical?: { distance: number; az: number; el: number } | null
  /** Fires once per focus target when framing reaches FOCUSED (for URL sync). */
  onCameraSettled?: (spherical: ShowcaseCameraSpherical) => void
}

/**
 * Single useFrame camera path. Phase is ref-driven so we never chase a moving focus for many frames
 * with stale React state; user OrbitControls input aborts scripted framing immediately.
 */
export function ShowcaseCameraManager({
  controlsRef,
  planetPositionsRef,
  showcaseEntityPositionsRef,
  activeItemId,
  selectedIndex,
  initialSpherical,
  onCameraSettled,
}: Props) {
  const setFocusedStudioPosition = useShowcaseStore((s) => s.setFocusedStudioPosition)
  const setShowcaseCameraUserOverride = useShowcaseStore((s) => s.setShowcaseCameraUserOverride)

  const focusKeyRef = useRef<string | null>(null)
  const appliedUrlRef = useRef(false)
  const settledKeyEmittedRef = useRef('')
  const phaseRef = useRef<'transition' | 'focused' | 'idle'>('transition')
  const prevPhaseRef = useRef<'transition' | 'focused' | 'idle'>('transition')
  const transitionStartRef = useRef(performance.now())

  useEffect(() => {
    appliedUrlRef.current = false
  }, [initialSpherical?.distance, initialSpherical?.az, initialSpherical?.el])

  useFrame((_, dt) => {
    const c = controlsRef.current
    if (!c) return
    sanitizeControlsCamera(c)

    const settleKey = `${activeItemId ?? ''}|${selectedIndex ?? 'x'}`
    if (focusKeyRef.current !== settleKey) {
      focusKeyRef.current = settleKey
      settledKeyEmittedRef.current = ''
      appliedUrlRef.current = false
      phaseRef.current = 'transition'
      prevPhaseRef.current = 'transition'
      transitionStartRef.current = performance.now()
      setShowcaseCameraUserOverride(false)
    }

    const userOverride = useShowcaseStore.getState().showcaseCameraUserOverride

    const aid = activeItemId ?? null
    let focus: THREE.Vector3 | null = null
    let wantDist = 5.8

    const catalog = aid ? NASA_SHOWCASE_ITEMS.find((i) => i.id === aid) : null
    const orbitEnt = aid ? SHOWCASE_ORBIT_ENTITIES.find((e) => e.id === aid) : null

    if (orbitEnt?.parentPlanetName && aid) {
      const moonPos = showcaseEntityPositionsRef.current.get(aid)
      const pIdx = planetsData.findIndex((p) => p.name === orbitEnt.parentPlanetName)
      if (pIdx >= 0 && moonPos) {
        const parentPos = planetPositionsRef.current[pIdx]
        if (parentPos && parentPos.lengthSq() > 1e-6 && moonPos.lengthSq() > 1e-6) {
          focus = parentPos.clone().lerp(moonPos, 0.38)
          const span = parentPos.distanceTo(moonPos)
          const pr = planetsData[pIdx]?.radius ?? 0.3
          wantDist = THREE.MathUtils.clamp(span * 2.2 + pr * 3.5, 2.4, 22)
        }
      }
    } else if (orbitEnt?.parentShowcaseEntityId && aid) {
      const self = showcaseEntityPositionsRef.current.get(aid)
      const par = showcaseEntityPositionsRef.current.get(orbitEnt.parentShowcaseEntityId)
      if (self && par && self.lengthSq() > 1e-6 && par.lengthSq() > 1e-6) {
        focus = par.clone().lerp(self, 0.36)
        const span = par.distanceTo(self)
        wantDist = THREE.MathUtils.clamp(span * 2.35, 1.8, 18)
      }
    } else if (catalog?.linkedPlanetName) {
      const pIdx = planetsData.findIndex((p) => p.name === catalog.linkedPlanetName)
      if (pIdx >= 0) {
        const pp = planetPositionsRef.current[pIdx]
        if (pp && pp.lengthSq() > 1e-6) {
          focus = pp.clone()
          const pr = planetsData[pIdx]?.radius ?? 0.3
          wantDist = THREE.MathUtils.clamp(5.0 + pr * 4.2, 4.2, 14)
        }
      }
    } else if (aid) {
      const p = showcaseEntityPositionsRef.current.get(aid)
      if (p && p.lengthSq() > 1e-6) {
        focus = p.clone()
        const isCraft = aid.startsWith('sc-')
        const isComet = aid.startsWith('comet-')
        wantDist = isCraft ? 2.85 : isComet ? 4.0 : 4.8
      }
    }

    if (!focus || !isFiniteVec(focus)) {
      setFocusedStudioPosition(null)
      phaseRef.current = 'idle'
      sanitizeControlsCamera(c)
      c.update()
      prevPhaseRef.current = phaseRef.current
      return
    }

    setFocusedStudioPosition(focus.clone())

    if (phaseRef.current === 'idle') {
      sanitizeControlsCamera(c)
      c.update()
      prevPhaseRef.current = phaseRef.current
      return
    }

    if (userOverride) {
      phaseRef.current = 'focused'
    }

    const elapsed = (performance.now() - transitionStartRef.current) / 1000
    const timedOut = elapsed >= MAX_TRANSITION_SEC

    if (!appliedUrlRef.current && initialSpherical && phaseRef.current === 'transition') {
      appliedUrlRef.current = true
      const { distance, az, el } = initialSpherical
      const azR = THREE.MathUtils.degToRad(az)
      const elR = THREE.MathUtils.degToRad(el)
      const offset = new THREE.Vector3(
        distance * Math.cos(elR) * Math.sin(azR),
        distance * Math.sin(elR),
        distance * Math.cos(elR) * Math.cos(azR),
      )
      c.target.copy(focus)
      c.object.position.copy(focus.clone().add(offset))
      c.update()
      phaseRef.current = 'focused'
      sanitizeControlsCamera(c)
    } else if (phaseRef.current === 'transition') {
      c.target.lerp(focus, Math.min(1, dt * 3.2))
      let dist = c.object.position.distanceTo(c.target)
      if (Math.abs(dist - wantDist) > 0.08) {
        const dir = safeCameraRadialDir(c.object.position, c.target)
        const desired = c.target.clone().add(dir.multiplyScalar(wantDist))
        c.object.position.lerp(desired, Math.min(1, dt * 2.55))
        dist = c.object.position.distanceTo(c.target)
      }
      const converged =
        c.target.distanceTo(focus) < 0.14 && Math.abs(dist - wantDist) < 0.24
      if (converged || timedOut || userOverride) {
        phaseRef.current = 'focused'
      }
    }

    if (phaseRef.current === 'focused' && prevPhaseRef.current !== 'focused' && onCameraSettled) {
      if (settledKeyEmittedRef.current !== settleKey) {
        const sph = cameraOffsetToSpherical(c)
        if (sph) {
          settledKeyEmittedRef.current = settleKey
          window.setTimeout(() => onCameraSettled(sph), 220)
        }
      }
    }
    prevPhaseRef.current = phaseRef.current

    sanitizeControlsCamera(c)
    c.update()
  })

  return null
}
