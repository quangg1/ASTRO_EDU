'use client'



import { useEffect, useMemo, useRef, useState } from 'react'

import { Canvas, useThree } from '@react-three/fiber'

import * as THREE from 'three'

import type { SkyExploreTarget } from '@/features/explore/public'

import {

  equatorialToHorizontal,
  equatorialToSceneVector,
  isAboveHorizon,
  type SkyObserver,

} from '@/features/explore/lib/skyObserver'

import { computeSunSkyState } from '@/features/explore/lib/skyAstronomy'
import { computeMoonIllumination, shouldShowMoonDisk } from '@/features/explore/lib/skyMoonPhase'
import {
  showScreenSunDisk,
  showScreenWeatherLayers,
  starFieldVisibility,
  useStarryWorldSky,
} from '@/features/explore/lib/skyTimeMode'
import type { SkyWeatherSnapshot } from '@/features/astronomy-calendar/types'

import type { SkyEphemerisBody } from '@/features/explore/lib/skyEphemeris'

import { useHipBrightCatalog } from '@/features/explore/hooks/useHipBrightCatalog'

import {

  useLandscapePanoramaTexture,

  useCatalogStarGeometry,

  useMilkyWayTexture,

  SKY_SCENE_RADIUS,

  SKY_FOV_DEFAULT_DEG,

  SKY_FOV_MAX_DEG,

  SKY_FOV_MIN_DEG,

} from './skyVisuals'

import { StereographicStarfield } from './StereographicStarfield'

import { StereographicBillboard } from './StereographicBillboard'

import { StereographicProvider } from './StereographicContext'

import { StereographicBackdrop } from './StereographicBackdrop'
import { SkyCloudLayer } from './SkyCloudLayer'
import { ScreenSunDisk } from './ScreenSunDisk'
import { WorldMoonDisk } from './WorldMoonDisk'

import { SkyAtmospherePlane } from './SkyAtmospherePlane'

import { MilkyWayPlane } from './MilkyWayPlane'
import { HorizonGlowPlane } from './HorizonGlowPlane'
import { SkySelectionRingOverlay } from './SkySelectionRingOverlay'

import { LandscapePlane } from './LandscapePlane'

import { StereographicLineSegments } from './StereographicLineSegments'

import { preloadHipBrightCatalog } from '@/features/explore/lib/hipBrightCatalogCache'
import {
  atmosphericExtinction,
  applyHorizonReddening,
  starPointCanvasSize,
} from '@/features/explore/lib/skyStarStyle'

import { SkyLabelsOverlay } from './SkyLabelsOverlay'
import { layoutSkyLabels, type LabelCandidate } from './skyLabelLayout'

import { SKY_RENDER_ORDER } from './skyLayers'

import {
  applyViewDrag,
  DEFAULT_SKY_VIEW,
  viewNadirLookAmount,
  type SkyViewState,
} from './skyViewState'
import { appendGreatCircleArcSegments } from './skyStereographic'
import { SKY_ACTIVE_LANDSCAPE } from '@/features/explore/lib/skyLandscapePack'

import { pickNearestSkyObject, type SkyPickCandidate } from './skyPick'
import {
  resolveSkyTargetSceneDirection,
  skyViewStateFromSceneDirection,
} from './skyFocusView'



type Props = {
  targets: SkyExploreTarget[]
  /** Chòm/hành tinh chọn từ HUD (URL) — giữ khi click sao trên canvas. */
  pinnedTargetId: string
  /** Sao được click trên canvas (tùy chọn). */
  sceneHighlightId: string | null
  /** Chòm đang ghim — luôn vẽ đường nối khi có. */
  constellationTargetId: string | null
  onSkyScenePick: (id: string) => void
  observer: SkyObserver
  ephemerisBodies: SkyEphemerisBody[]
  skyWeather?: SkyWeatherSnapshot | null
}



const R = SKY_SCENE_RADIUS



/** Kích thước billboard (px) — cùng đường cong với point cloud. */
function magToGlowSize(mag: number, magLimit: number): number {
  const pt = starPointCanvasSize(Math.max(-2, Math.min(magLimit, mag)), magLimit)
  return Math.max(6, pt * 2.1)
}

const SOLAR_VISUAL_MAG: Record<string, number> = {
  'planet-sun': -26,
  'planet-moon': -11,
  'planet-mercury': 0.5,
  'planet-venus': -4.2,
  'planet-mars': 0.2,
  'planet-jupiter': -2.2,
  'planet-saturn': 0.5,
  'planet-uranus': 5.5,
  'planet-neptune': 7.8,
}



function catalogEntryTargetId(starId: string): string {

  if (starId.startsWith('hip-')) return `star-${starId}`

  if (starId.startsWith('star-')) return starId

  return starId

}



function FisheyeSky({
  targets,
  pinnedTargetId,
  sceneHighlightId,
  constellationTargetId,
  onSkyScenePick,
  observer,
  ephemerisBodies,
  skyWeather,
  hipCatalog,
  onViewChange,
  view,
  pickCandidates,
  fovDeg,
  starfield,
  labeled,
}: Props & {

  hipCatalog: ReturnType<typeof useHipBrightCatalog>['stars']

  onViewChange: (v: SkyViewState) => void

  view: SkyViewState

  pickCandidates: SkyPickCandidate[]

  fovDeg: number

  starfield: THREE.BufferGeometry

  labeled: ReturnType<typeof useCatalogStarGeometry>['labeled']

}) {

  const dragRef = useRef({
    active: false,
    x: 0,
    y: 0,
    view,
    moved: false,
  })

  const viewRef = useRef(view)

  viewRef.current = view

  const sunSky = useMemo(() => computeSunSkyState(observer), [observer])
  const moonPhase = useMemo(() => computeMoonIllumination(observer.at), [observer.at.getTime()])
  const cloudCoverPct = skyWeather?.cloudCoverPct ?? 0
  const starrySky = useMemo(() => useStarryWorldSky(sunSky), [sunSky])
  const starVis = useMemo(() => {
    if (!starrySky) return 0
    return Math.max(starFieldVisibility(sunSky), 0.72)
  }, [sunSky, starrySky])
  const daytimeScreen = useMemo(() => showScreenWeatherLayers(sunSky), [sunSky])

  const milkyWay = useMilkyWayTexture()

  const { texture: landscapeTex, loaded: landscapeLoaded } = useLandscapePanoramaTexture()

  const { gl } = useThree()



  const activeConstellationId = constellationTargetId

  const focusTargetId = sceneHighlightId ?? pinnedTargetId

  const activeStar = useMemo(() => {

    const want = focusTargetId

    return labeled.find((s) => catalogEntryTargetId(s.id) === want || s.id === want) ?? null

  }, [labeled, focusTargetId])

  const constellationLines = useMemo(() => {
    const lines: Array<{ geom: THREE.BufferGeometry; constellationId: string }> = []
    if (!activeConstellationId) return lines
    for (const t of targets) {
      if (t.id !== activeConstellationId) continue
      if (!t.starNodes?.length || !t.edges?.length) continue
      const byId = new Map(t.starNodes.map((n) => [n.id, n]))
      const positions: number[] = []
      for (const [a, b] of t.edges) {
        const na = byId.get(a)
        const nb = byId.get(b)
        if (!na || !nb) continue
        const va = equatorialToSceneVector(na.raDeg, na.decDeg, observer)
        const vb = equatorialToSceneVector(nb.raDeg, nb.decDeg, observer)
        appendGreatCircleArcSegments(
          va,
          vb,
          R,
          positions,
          18,
          !!activeConstellationId,
          view,
          fovDeg,
        )
      }
      if (positions.length >= 6) {
        const geom = new THREE.BufferGeometry()
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        lines.push({ constellationId: t.id, geom })
      }
    }
    return lines
  }, [targets, observer, activeConstellationId, view, fovDeg])

  const solarBillboards = useMemo(() => {
    return ephemerisBodies.map((b) => {
      const hor = equatorialToHorizontal(b.raDeg, b.decDeg, observer)
      const ext = atmosphericExtinction(hor.altDeg)
      const p = equatorialToSceneVector(b.raDeg, b.decDeg, observer)
      const mag = SOLAR_VISUAL_MAG[b.id] ?? 0
      return {
        id: b.id,
        label: b.label,
        pos: [p[0] * R, p[1] * R, p[2] * R] as [number, number, number],
        dir: p,
        mag,
        altDeg: hor.altDeg,
        ext,
        aboveHorizon: hor.altDeg > 0,
      }
    })
  }, [ephemerisBodies, observer])



  useEffect(() => {

    const el = gl.domElement

    const onDown = (ev: PointerEvent) => {

      const d = dragRef.current
      d.active = true
      d.moved = false
      d.x = ev.clientX
      d.y = ev.clientY
      d.view = viewRef.current
    }

    const onUp = (ev: PointerEvent) => {

      const d = dragRef.current

      const wasDrag = d.moved

      d.active = false
      if (wasDrag) return

      const picked = pickNearestSkyObject(

        ev.clientX,

        ev.clientY,

        el.getBoundingClientRect(),

        viewRef.current,

        pickCandidates,

        fovDeg,

      )

      if (picked) onSkyScenePick(picked)

    }

    const onMove = (ev: PointerEvent) => {

      const d = dragRef.current

      if (!d.active) return

      if (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 4) d.moved = true

      const dx = ev.clientX - d.x
      const dy = ev.clientY - d.y
      d.x = ev.clientX
      d.y = ev.clientY
      d.view = applyViewDrag(d.view, dx, dy)
      onViewChange(d.view)

    }

    el.addEventListener('pointerdown', onDown)

    el.addEventListener('pointerup', onUp)

    el.addEventListener('pointerleave', onUp)

    el.addEventListener('pointermove', onMove)

    return () => {

      el.removeEventListener('pointerdown', onDown)

      el.removeEventListener('pointerup', onUp)

      el.removeEventListener('pointerleave', onUp)

      el.removeEventListener('pointermove', onMove)

    }

  }, [gl.domElement, onViewChange, onSkyScenePick, pickCandidates, fovDeg])



  return (

    <>

      <StereographicBackdrop />

      <SkyAtmospherePlane sun={sunSky} />
      <HorizonGlowPlane sun={sunSky} />

      {daytimeScreen && cloudCoverPct > 4 ? (
        <SkyCloudLayer
          cloudCoverPct={cloudCoverPct}
          isDay={sunSky.dayFactor > 0.35}
          view={view}
        />
      ) : null}
      {showScreenSunDisk(sunSky) ? (
        <ScreenSunDisk
          sun={sunSky}
          cloudCoverPct={cloudCoverPct}
          active={focusTargetId === 'planet-sun'}
          onClick={() => onSkyScenePick('planet-sun')}
        />
      ) : null}

      <MilkyWayPlane
        texture={milkyWay}
        fovDeg={fovDeg}
        observer={observer}
        nightVisibility={starVis}
      />

      {landscapeLoaded && landscapeTex ? (
        <LandscapePlane
          texture={landscapeTex}
          pack={SKY_ACTIVE_LANDSCAPE}
          view={view}
          sun={sunSky}
          constellationActive={!!activeConstellationId}
        />
      ) : null}

      <StereographicStarfield
        geometry={starfield}
        fovDeg={fovDeg}
        nightVisibility={starVis}
      />

      {constellationLines.map(({ geom, constellationId }, idx) => (
        <StereographicLineSegments
          key={`const-${constellationId}-${idx}`}
          geometry={geom}
          color="#b8d4f0"
          opacity={0.88 * starVis}
          renderOrder={SKY_RENDER_ORDER.constellationLines}
        />
      ))}

      {activeStar ? (() => {
        const altDeg = Math.asin(Math.min(1, Math.max(-1, activeStar.dir[1]))) * (180 / Math.PI)
        const ext = atmosphericExtinction(altDeg)
        const [cr, cg, cb] = applyHorizonReddening(1, 0.95, 0.85, ext.redness)
        const tint = `rgb(${Math.round(cr * 255)},${Math.round(cg * 255)},${Math.round(cb * 255)})`
        const glow = magToGlowSize(activeStar.mag, observer.magLimit)
        return (
          <group key={`sel-${activeStar.id}`}>
            <StereographicBillboard
              position={activeStar.pos}
              size={glow * 2}
              color={tint}
              opacity={0.45 * ext.opacity * starVis}
            />
            <StereographicBillboard
              position={activeStar.pos}
              size={glow * 1.2}
              color="#ffffff"
              opacity={0.98 * ext.opacity * starVis}
            />
          </group>
        )
      })() : null}



      {starrySky ? (() => {
        const moon = solarBillboards.find((b) => b.id === 'planet-moon')
        if (!moon?.aboveHorizon) return null
        return (
          <WorldMoonDisk
            position={moon.pos}
            moonAltDeg={moon.altDeg}
            sunAltDeg={sunSky.altDeg}
            moonPhase={moonPhase}
            active={focusTargetId === 'planet-moon'}
            onClick={() => onSkyScenePick('planet-moon')}
          />
        )
      })() : null}

      {solarBillboards.map(({ id, pos, mag, aboveHorizon, ext }) => {
        if (!aboveHorizon) return null
        if (id === 'planet-sun' || id === 'planet-moon') return null
        const isActive = id === focusTargetId
        const glow = magToGlowSize(mag, observer.magLimit) * (isActive ? 1.35 : 1)
        const base = id === 'planet-moon' ? [0.93, 0.92, 0.88] : [1, 0.98, 0.92]
        const [r, g, b] = applyHorizonReddening(base[0], base[1], base[2], ext.redness)
        const color = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`
        const op = ext.opacity * starVis
        if (op < 0.02) return null
        return (
          <group key={id}>
            <StereographicBillboard
              position={pos}
              size={glow * 1.5}
              color={color}
              opacity={(isActive ? 0.65 : 0.35) * op}
              onClick={() => onSkyScenePick(id)}
            />
            <StereographicBillboard
              position={pos}
              size={glow}
              color={color}
              opacity={(isActive ? 0.98 : 0.82) * op}
              onClick={() => onSkyScenePick(id)}
            />
          </group>
        )
      })}



    </>

  )

}



function clampFovDeg(deg: number): number {
  return Math.max(SKY_FOV_MIN_DEG, Math.min(SKY_FOV_MAX_DEG, deg))
}

export function SkyPlanetariumScene(props: Props) {
  const sunSky = useMemo(() => computeSunSkyState(props.observer), [props.observer])
  const starrySkyOuter = useMemo(() => useStarryWorldSky(sunSky), [sunSky])
  const starVis = useMemo(() => {
    if (!starrySkyOuter) return 0
    return Math.max(starFieldVisibility(sunSky), 0.72)
  }, [sunSky, starrySkyOuter])

  const [view, setView] = useState<SkyViewState>(DEFAULT_SKY_VIEW)

  const [fovDeg, setFovDeg] = useState(SKY_FOV_DEFAULT_DEG)

  const discRef = useRef<HTMLDivElement>(null)
  const [aspect, setAspect] = useState(1)

  const { stars: hipCatalog } = useHipBrightCatalog()

  const { geometry: starfield, labeled: catalogLabeled } = useCatalogStarGeometry(
    props.observer,
    R * 0.998,
    hipCatalog,
  )

  useEffect(() => {
    preloadHipBrightCatalog()
  }, [])

  useEffect(() => {
    const el = discRef.current
    if (!el) return
    const sync = () => {
      const h = el.clientHeight || 1
      setAspect(el.clientWidth / h)
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])



  const pickCandidates = useMemo((): SkyPickCandidate[] => {

    const eph = new Map(props.ephemerisBodies.map((b) => [b.id, b]))

    const out: SkyPickCandidate[] = []



    for (const t of props.targets) {
      if (t.kind === 'body') continue
      const dir = equatorialToSceneVector(t.raDeg, t.decDeg, props.observer)
      const mag = t.mag ?? 2
      out.push({ id: t.id, dir, hitRadiusPct: 2.8 })
      if (mag > 2.5 && !isAboveHorizon(t.raDeg, t.decDeg, props.observer)) continue
    }

    const sunBody = props.ephemerisBodies.find((b) => b.id === 'planet-sun')
    const moonBody = props.ephemerisBodies.find((b) => b.id === 'planet-moon')
    const sunAlt = sunBody
      ? equatorialToHorizontal(sunBody.raDeg, sunBody.decDeg, props.observer).altDeg
      : -90
    const moonAlt = moonBody
      ? equatorialToHorizontal(moonBody.raDeg, moonBody.decDeg, props.observer).altDeg
      : -90

    for (const b of props.ephemerisBodies) {
      const dir = equatorialToSceneVector(b.raDeg, b.decDeg, props.observer)
      if (!isAboveHorizon(b.raDeg, b.decDeg, props.observer)) continue
      const mag = SOLAR_VISUAL_MAG[b.id] ?? 0
      if (b.id === 'planet-sun') continue
      if (b.id === 'planet-moon') {
        if (useStarryWorldSky(sunSky) && shouldShowMoonDisk(sunAlt, moonAlt)) {
          out.push({ id: b.id, dir, hitRadiusPct: 4.2 })
        }
        continue
      }
      if (mag > 4) continue
      out.push({ id: b.id, dir, hitRadiusPct: 3.8 })
    }



    for (const s of catalogLabeled) {

      if (!s.name && s.mag > 1.8) continue

      if (s.mag > 2.8) continue

      out.push({

        id: catalogEntryTargetId(s.id),

        dir: s.dir,

        hitRadiusPct: s.mag < 1.2 ? 3 : 2.2,

      })

    }



    return out

  }, [props.targets, props.observer, props.ephemerisBodies, catalogLabeled, sunSky])



  const focusTargetId = props.sceneHighlightId ?? props.pinnedTargetId

  const observerFocusKey = `${props.observer.latDeg}|${props.observer.lonDeg}|${props.observer.at.getTime()}`
  const focusSnapKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!focusTargetId) {
      focusSnapKeyRef.current = null
      return
    }
    const snapKey = `${focusTargetId}|${observerFocusKey}`
    if (focusSnapKeyRef.current === snapKey) return

    const dir = resolveSkyTargetSceneDirection(focusTargetId, {
      targets: props.targets,
      ephemerisBodies: props.ephemerisBodies,
      catalogLabeled,
      observer: props.observer,
    })
    if (!dir) return

    focusSnapKeyRef.current = snapKey
    setView(skyViewStateFromSceneDirection(dir))
  }, [focusTargetId, observerFocusKey, props.targets, props.ephemerisBodies, catalogLabeled, props.observer])

  const labelCandidates = useMemo((): LabelCandidate[] => {
    const active = focusTargetId
    const out: LabelCandidate[] = []
    const constellationId = props.constellationTargetId
    const constellationStarIds = new Set<string>()

    if (constellationId) {
      const t = props.targets.find((x) => x.id === constellationId)
      const nameById = new Map<string, string>()
      for (const s of catalogLabeled) {
        if (s.name) nameById.set(s.id, s.name)
      }
      for (const s of hipCatalog ?? []) {
        if (s.name && !nameById.has(s.id)) nameById.set(s.id, s.name)
      }

      for (const node of t?.starNodes ?? []) {
        constellationStarIds.add(node.id)
        const name = nameById.get(node.id)
        if (!name) continue
        const mappedId = catalogEntryTargetId(node.id)
        const isStarPicked =
          active === node.id ||
          active === mappedId ||
          props.sceneHighlightId === node.id ||
          props.sceneHighlightId === mappedId
        const dir = equatorialToSceneVector(node.raDeg, node.decDeg, props.observer)
        const altDeg = Math.asin(Math.min(1, Math.max(-1, dir[1]))) * (180 / Math.PI)
        out.push({
          id: `lbl-${node.id}`,
          text: name,
          dir,
          emphasis: 'star',
          mag: node.mag,
          altDeg,
          priority: 160 + Math.max(0, 4 - node.mag) * 10 + (isStarPicked ? 200 : 0),
          selected: isStarPicked,
          forceShow: true,
        })
      }
    }

    for (const s of catalogLabeled) {
      if (constellationStarIds.has(s.id)) continue
      if (!s.name) continue
      const id = catalogEntryTargetId(s.id)
      const isActive = id === active || s.id === active
      const altDeg = Math.asin(Math.min(1, Math.max(-1, s.dir[1]))) * (180 / Math.PI)
      out.push({
        id: `lbl-${s.id}`,
        text: s.name,
        dir: s.dir,
        emphasis: 'star',
        mag: s.mag,
        altDeg,
        priority: 40 + Math.max(0, 4 - s.mag) * 12 + (isActive ? 200 : 0),
        selected: isActive,
      })
    }

    const sunEph = props.ephemerisBodies.find((b) => b.id === 'planet-sun')
    const moonEph = props.ephemerisBodies.find((b) => b.id === 'planet-moon')
    const sunAltLbl = sunEph
      ? equatorialToHorizontal(sunEph.raDeg, sunEph.decDeg, props.observer).altDeg
      : -90
    const moonAltLbl = moonEph
      ? equatorialToHorizontal(moonEph.raDeg, moonEph.decDeg, props.observer).altDeg
      : -90

    for (const b of props.ephemerisBodies) {
      if (b.id === 'planet-sun') continue
      if (b.id === 'planet-moon') {
        if (!useStarryWorldSky(sunSky) || !shouldShowMoonDisk(sunAltLbl, moonAltLbl)) continue
      }
      const mag = SOLAR_VISUAL_MAG[b.id] ?? 0
      const hor = equatorialToHorizontal(b.raDeg, b.decDeg, props.observer)
      if (hor.altDeg <= 0) continue
      const dir = equatorialToSceneVector(b.raDeg, b.decDeg, props.observer)
      const isActive = b.id === active
      const label =
        b.id === 'planet-sun' ? 'Mặt Trời' : b.id === 'planet-moon' ? 'Mặt Trăng' : b.label
      out.push({
        id: `lbl-${b.id}`,
        text: label,
        dir,
        emphasis: 'body',
        mag,
        altDeg: hor.altDeg,
        priority: 70 + Math.max(0, 3 - mag) * 15 + (isActive ? 200 : 0),
        selected: isActive,
      })
    }

    if (constellationId) {
      const t = props.targets.find((x) => x.id === constellationId)
      if (t) {
        const hor = equatorialToHorizontal(t.raDeg, t.decDeg, props.observer)
        out.push({
          id: `lbl-${constellationId}`,
          text: t.nameVi,
          dir: equatorialToSceneVector(t.raDeg, t.decDeg, props.observer),
          emphasis: 'constellation',
          altDeg: hor.altDeg,
          priority: 250,
          selected: !props.sceneHighlightId,
        })
      }
    }

    return out
  }, [
    catalogLabeled,
    hipCatalog,
    props.ephemerisBodies,
    props.observer,
    focusTargetId,
    props.constellationTargetId,
    props.sceneHighlightId,
    props.targets,
    sunSky,
  ])

  /**
   * Chỉ lộ sao/chòm dưới chân trời khi người dùng ghim chòm (landscape đã mờ).
   * Không ghim → không dán nhãn lên ảnh đất.
   */
  const allowBelowHorizon = !!props.constellationTargetId

  const screenLabels = useMemo(
    () => layoutSkyLabels(labelCandidates, view, fovDeg, aspect, allowBelowHorizon),
    [labelCandidates, view, fovDeg, aspect, allowBelowHorizon],
  )

  const selectionRing = useMemo((): {
    dir: [number, number, number]
    sizePct: number
  } | null => {
    const id = props.sceneHighlightId
    if (!id || id.startsWith('constellation-')) return null

    const star = catalogLabeled.find(
      (s) => catalogEntryTargetId(s.id) === id || s.id === id,
    )
    const groundReveal = viewNadirLookAmount(view)

    if (star) {
      const altDeg = Math.asin(Math.min(1, Math.max(-1, star.dir[1]))) * (180 / Math.PI)
      if (altDeg < 0 && groundReveal < 0.55) return null
      return {
        dir: star.dir,
        sizePct: Math.max(3.5, 7 - star.mag * 1.2),
      }
    }

    const body = props.ephemerisBodies.find((b) => b.id === id)
    if (body) {
      const hor = equatorialToHorizontal(body.raDeg, body.decDeg, props.observer)
      if (hor.altDeg <= 0 && groundReveal < 0.55) return null
      return {
        dir: equatorialToSceneVector(body.raDeg, body.decDeg, props.observer),
        sizePct: 6.5,
      }
    }
    return null
  }, [catalogLabeled, props.sceneHighlightId, props.ephemerisBodies, props.observer, view])



  useEffect(() => {
    const el = discRef.current
    if (!el) return
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      setFovDeg((d) => {
        const step = Math.max(1.5, d * 0.055) * (ev.deltaY > 0 ? 1 : -1)
        return clampFovDeg(d + step)
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  return (

    <div ref={discRef} className="absolute inset-0 bg-[#010308]">

        <Canvas

          className="h-full w-full touch-none"

          dpr={[1, 1.5]}

          orthographic

          camera={{ position: [0, 0, 1], near: 0.5, far: 2, zoom: 1 }}

          gl={{
            antialias: true,
            alpha: false,
            depth: true,
            powerPreference: 'high-performance',
          }}

          onCreated={({ gl }) => {
            gl.setClearColor(0x010308, 1)
            gl.toneMapping = THREE.NoToneMapping
          }}

        >

          <StereographicProvider view={view} fovDeg={fovDeg}>
            <FisheyeSky
              {...props}
              hipCatalog={hipCatalog}
              onViewChange={setView}
              view={view}
              pickCandidates={pickCandidates}
              fovDeg={fovDeg}
              starfield={starfield}
              labeled={catalogLabeled}
            />
          </StereographicProvider>

        </Canvas>

        <SkyLabelsOverlay
          labels={screenLabels}
          view={view}
          fovDeg={fovDeg}
          aspect={aspect}
          allowBelowHorizon={allowBelowHorizon}
          nightVisibility={starVis}
        />

        <SkySelectionRingOverlay
          dir={selectionRing?.dir ?? null}
          sizePct={selectionRing?.sizePct}
          view={view}
          fovDeg={fovDeg}
          aspect={aspect}
        />

        <div className="pointer-events-none absolute right-3 top-3 z-30 rounded-md bg-black/55 px-2 py-1 font-mono text-[10px] text-white/70 tabular-nums">
          FOV {Math.round(fovDeg)}°
        </div>

    </div>

  )

}


