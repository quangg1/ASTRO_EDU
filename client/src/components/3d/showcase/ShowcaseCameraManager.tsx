'use client'

import { useRef, useEffect, useMemo } from 'react'
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

function safeCameraRadialDir(from: THREE.Vector3, to: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  out.subVectors(from, to)
  if (out.lengthSq() < 1e-10) return out.set(0, 0.22, 1).normalize()
  return out.normalize()
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
const CAMERA_URL_MIN_DIST = 0.8
const CAMERA_URL_MAX_DIST = 2600

function validateInitialSpherical(
  v: { distance: number; az: number; el: number } | null | undefined,
): { distance: number; az: number; el: number } | null {
  if (!v) return null
  const d = Number(v.distance)
  const az = Number(v.az)
  const el = Number(v.el)
  if (!Number.isFinite(d) || !Number.isFinite(az) || !Number.isFinite(el)) return null
  if (d < CAMERA_URL_MIN_DIST || d > CAMERA_URL_MAX_DIST) {
    if (typeof console !== 'undefined') {
      console.warn(`[showcase-camera] ignore url camera dist out of range: ${d}`)
    }
    return null
  }
  return {
    distance: d,
    az,
    el: THREE.MathUtils.clamp(el, -89, 89),
  }
}

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
  const setShowcaseCameraUserOverride = useShowcaseStore((s) => s.setShowcaseCameraUserOverride)
  const prevDistRef = useRef(0)
  const focusScratchRef = useRef(new THREE.Vector3())
  const deltaScratchRef = useRef(new THREE.Vector3())
  const desiredScratchRef = useRef(new THREE.Vector3())
  const dirScratchRef = useRef(new THREE.Vector3())

  const focusKeyRef = useRef<string | null>(null)
  const appliedUrlRef = useRef(false)
  const settledKeyEmittedRef = useRef('')
  const phaseRef = useRef<'transitioning' | 'focused' | 'recovering' | 'free' | 'idle'>('transitioning')
  const prevPhaseRef = useRef<'transitioning' | 'focused' | 'recovering' | 'free' | 'idle'>('transitioning')
  const transitionStartRef = useRef(performance.now())
  const catalogById = useMemo(
    () => new Map(NASA_SHOWCASE_ITEMS.map((i) => [String(i.id || '').trim(), i] as const)),
    [],
  )
  const orbitById = useMemo(
    () => new Map(SHOWCASE_ORBIT_ENTITIES.map((e) => [String(e.id || '').trim(), e] as const)),
    [],
  )

  useEffect(() => {
    appliedUrlRef.current = false
  }, [initialSpherical?.distance, initialSpherical?.az, initialSpherical?.el])

  useFrame((_, dt) => {
    const c = controlsRef.current
    if (!c) return
    sanitizeControlsCamera(c)
    const distToSun = c.object.position.length()
    if (Number.isFinite(distToSun) && Math.abs(distToSun - prevDistRef.current) > 0.5) {
      useShowcaseStore.getState().setCameraDistanceToSun(distToSun)
      prevDistRef.current = distToSun
    }

    const settleKey = `${activeItemId ?? ''}`
    if (focusKeyRef.current !== settleKey) {
      focusKeyRef.current = settleKey
      settledKeyEmittedRef.current = ''
      appliedUrlRef.current = false
      phaseRef.current = 'transitioning'
      prevPhaseRef.current = 'transitioning'
      transitionStartRef.current = performance.now()
      setShowcaseCameraUserOverride(false)
    }

    const userOverride = useShowcaseStore.getState().showcaseCameraUserOverride

    const aid = activeItemId ?? null
    const focus = focusScratchRef.current
    let hasFocus = false
    let wantDist = 5.8

    const catalog = aid ? catalogById.get(aid) : null
    const orbitEnt = aid ? orbitById.get(aid) : null

    if (orbitEnt?.parentPlanetName && aid) {
      const moonPos = showcaseEntityPositionsRef.current.get(aid)
      const pIdx = planetsData.findIndex((p) => p.name === orbitEnt.parentPlanetName)
      if (pIdx >= 0 && moonPos) {
        const parentPos = planetPositionsRef.current[pIdx]
        if (parentPos && parentPos.lengthSq() > 1e-6 && moonPos.lengthSq() > 1e-6) {
          // Entity closeup: lock focus on entity itself (not midpoint) to match NASA Eyes interaction.
          focus.copy(moonPos)
          hasFocus = true
          const span = parentPos.distanceTo(moonPos)
          wantDist = THREE.MathUtils.clamp(Math.max(1.4, span * 0.75), 1.35, 4.6)
        }
      }
    } else if (orbitEnt?.parentShowcaseEntityId && aid) {
      const self = showcaseEntityPositionsRef.current.get(aid)
      const par = showcaseEntityPositionsRef.current.get(orbitEnt.parentShowcaseEntityId)
      if (self && par && self.lengthSq() > 1e-6 && par.lengthSq() > 1e-6) {
        focus.copy(self)
        hasFocus = true
        const span = par.distanceTo(self)
        wantDist = THREE.MathUtils.clamp(Math.max(1.1, span * 0.7), 1.1, 3.8)
      }
    } else if (catalog?.linkedPlanetName || aid?.startsWith('planet-')) {
      const linkedName =
        catalog?.linkedPlanetName ||
        (aid?.startsWith('planet-')
          ? aid.replace(/^planet-/, '').replace(/^\w/, (c2) => c2.toUpperCase())
          : '')
      const pIdx = planetsData.findIndex((p) => p.name === linkedName)
      if (pIdx >= 0) {
        const pp = planetPositionsRef.current[pIdx]
        if (pp && pp.lengthSq() > 1e-6) {
          focus.copy(pp)
          hasFocus = true
          const pr = planetsData[pIdx]?.radius ?? 0.3
          wantDist = THREE.MathUtils.clamp(5.0 + pr * 4.2, 4.2, 14)
        }
      }
    } else if (aid) {
      const p = showcaseEntityPositionsRef.current.get(aid)
      if (p && p.lengthSq() > 1e-6) {
        focus.copy(p)
        hasFocus = true
        const isCraft = aid.startsWith('sc-')
        const isComet = aid.startsWith('comet-')
        wantDist = isCraft ? 2.85 : isComet ? 4.0 : 4.8
      }
    }

    if (!hasFocus || !isFiniteVec(focus)) {
      const studioLightRef = useShowcaseStore.getState().studioLightRef
      if (studioLightRef?.current) studioLightRef.current.intensity = 0
      phaseRef.current = 'idle'
      sanitizeControlsCamera(c)
      c.update()
      prevPhaseRef.current = phaseRef.current
      return
    }

    const studioLightRef = useShowcaseStore.getState().studioLightRef
    if (studioLightRef?.current) {
      studioLightRef.current.position.set(focus.x + 2.2, focus.y + 1.4, focus.z + 2.2)
      studioLightRef.current.intensity = 0.55
    }

    if (userOverride && phaseRef.current !== 'idle') {
      phaseRef.current = 'free'
    } else if (!userOverride && phaseRef.current === 'free') {
      // User finished interaction; keep same framing, just return to locked-focus mode.
      phaseRef.current = 'focused'
    }

    // Keep OrbitControls pivot locked to selected moving target (planet/entity),
    // so user rotation always orbits around that body instead of drifting away.
    if (phaseRef.current === 'focused' || phaseRef.current === 'free') {
      const delta = deltaScratchRef.current.subVectors(focus, c.target)
      // Deadzone avoids micro-jitter while still keeping target locked to selected body.
      if (delta.lengthSq() > 1e-6) {
        c.target.add(delta)
        c.object.position.add(delta)
      }
    }
    // Avoid per-frame auto-recovery while focused; this can cause oscillation/jitter.
    // Reframing is already handled on target changes and transition completion.

    // If focus was unavailable for a few frames, phase may have fallen back to idle.
    // As soon as focus returns, restart scripted transition to recenter/zoom correctly.
    if (phaseRef.current === 'idle') {
      phaseRef.current = 'transitioning'
      transitionStartRef.current = performance.now()
    }

    const elapsed = (performance.now() - transitionStartRef.current) / 1000
    const timedOut = elapsed >= MAX_TRANSITION_SEC

    const safeInitial = validateInitialSpherical(initialSpherical)
    if (!appliedUrlRef.current && safeInitial && phaseRef.current === 'transitioning') {
      appliedUrlRef.current = true
      const { distance, az, el } = safeInitial
      const azR = THREE.MathUtils.degToRad(az)
      const elR = THREE.MathUtils.degToRad(el)
      const offset = new THREE.Vector3(
        distance * Math.cos(elR) * Math.sin(azR),
        distance * Math.sin(elR),
        distance * Math.cos(elR) * Math.cos(azR),
      )
      c.target.copy(focus)
      c.object.position.copy(desiredScratchRef.current.copy(focus).add(offset))
      c.update()
      phaseRef.current = 'focused'
      sanitizeControlsCamera(c)
    } else if (phaseRef.current === 'transitioning') {
      c.target.lerp(focus, Math.min(1, dt * 3.2))
      let dist = c.object.position.distanceTo(c.target)
      if (Math.abs(dist - wantDist) > 0.08) {
        const dir = safeCameraRadialDir(c.object.position, c.target, dirScratchRef.current)
        const desired = desiredScratchRef.current.copy(c.target).add(dir.multiplyScalar(wantDist))
        c.object.position.lerp(desired, Math.min(1, dt * 2.55))
        dist = c.object.position.distanceTo(c.target)
      }
      const converged =
        c.target.distanceTo(focus) < 0.14 && Math.abs(dist - wantDist) < 0.24
      if (converged || timedOut) {
        // Hard-snap at transition end so selected target is exactly centered.
        c.target.copy(focus)
        const dir = safeCameraRadialDir(c.object.position, c.target, dirScratchRef.current)
        c.object.position.copy(desiredScratchRef.current.copy(c.target).add(dir.multiplyScalar(wantDist)))
        phaseRef.current = 'focused'
      }
    } else if (phaseRef.current === 'recovering') {
      c.target.lerp(focus, Math.min(1, dt * 4.6))
      const dir = safeCameraRadialDir(c.object.position, c.target, dirScratchRef.current)
      const desired = desiredScratchRef.current.copy(c.target).add(dir.multiplyScalar(wantDist))
      c.object.position.lerp(desired, Math.min(1, dt * 5.2))
      const dNow = c.object.position.distanceTo(c.target)
      const recConverged = c.target.distanceTo(focus) < 0.08 && Math.abs(dNow - wantDist) < 0.14
      if (recConverged || timedOut) {
        c.target.copy(focus)
        c.object.position.copy(desiredScratchRef.current.copy(c.target).add(dir.multiplyScalar(wantDist)))
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
