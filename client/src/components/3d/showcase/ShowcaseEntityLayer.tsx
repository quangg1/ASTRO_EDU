'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { PlanetData } from '@/lib/solarSystemData'
import { planetsData } from '@/lib/solarSystemData'
import { computeOrbitalPosition } from '@/lib/solarOrbitMath'
import {
  getNasaCatalogItemById,
  NASA_SHOWCASE_ITEMS,
  resolveShowcaseOrbitParentPlanetName,
  SHOWCASE_ORBIT_ENTITIES,
  type ShowcaseOrbitEntity,
} from '@/lib/showcaseEntities'
import { OrbitPath } from '@/components/3d/OrbitPath'
import { ShowcaseEntityMesh } from '@/components/3d/showcase/ShowcaseEntityMesh'
import { useShowcaseStore } from '@/store/showcaseStore'
import type { OrbitProximityFade } from '@/components/3d/orbitProximityFade'
import { hasUsableOrbitalElements } from '@/lib/mergeShowcaseCatalog'

const EARTH_RADIUS_KM = 6371
/** Đơn vị scene cho bán kính vật thể showcase (đủ lớn so với `planetsData.radius`). */
const EARTH_BASE_SIZE = 0.2
const AU_IN_KM = 149_597_870.7
/** BASE scale: 1 AU = BASE_AU scene units (single source of truth). */
const BASE_AU = 26
const TARGET_SCENE_RADIUS = 320
/** DIST scale: đổi semi-major axis từ AU -> scene units (chỉ cho vị trí quỹ đạo). */
const ORBIT_DISTANCE_SCALE_AU = BASE_AU
/**
 * SIZE scale neo theo BASE_AU để tránh lệch khi tune distance.
 * `SIZE_DISTANCE_RATIO_KM` quyết định "kích thước hiển thị" so với khoảng cách quỹ đạo.
 */
const SIZE_DISTANCE_RATIO_KM = 180
const ENTITY_SIZE_SCALE_KM = (BASE_AU * SIZE_DISTANCE_RATIO_KM) / AU_IN_KM
/**
 * Vệ tinh: a (AU) từ Horizons là quỹ đạo quanh hành tinh — không nhân scale heliocentric 1:1.
 * `aAu * parentRadius * k` đưa bán kính quỹ đạo vào cùng thang với mesh hành tinh trong scene.
 */
/** Nén local systems (moon quanh planet) để vừa khung zoom mà vẫn tách rõ khỏi parent. */
const SATELLITE_DISTANCE_COMPRESS = 0.3
const PLANET_RADIUS_KM: Record<string, number> = {
  Mercury: 2439.7,
  Venus: 6051.8,
  Earth: 6371,
  Mars: 3389.5,
  Jupiter: 69911,
  Saturn: 58232,
  Uranus: 25362,
  Neptune: 24622,
}

/** Map tên hành tinh trong `planetsData` → catalog id (planet-*) để khớp `parentId` từ API. */
function showcaseIdForSolarPlanetName(name: string | null | undefined): string | null {
  if (!name) return null
  const n = String(name).trim()
  const row = NASA_SHOWCASE_ITEMS.find(
    (i) => i.group === 'planets_moons' && (i.linkedPlanetName === n || i.name === n),
  )
  return row?.id ?? null
}

/** Có diffuse CDN / texture tĩnh hoặc model — tránh vẽ “chấm rỗng” không có media. */
function hasRenderableShowcaseMedia(e: ShowcaseOrbitEntity): boolean {
  const r = String(e.remoteTextureUrl || '').trim()
  if (r && (/^https?:\/\//i.test(r) || r.startsWith('/files/'))) return true
  const t = String(e.texturePath || '').trim()
  if (t.length > 1) return true
  const rm = String(e.remoteModelUrl || '').trim()
  if (rm && (/^https?:\/\//i.test(rm) || rm.startsWith('/files/'))) return true
  const mp = String(e.modelPath || '').trim()
  if (mp.length > 1) return true
  return false
}

function isSatelliteEntity(e: ShowcaseOrbitEntity): boolean {
  return Boolean(
    resolveShowcaseOrbitParentPlanetName(e) ||
      String(e.parentId || '').trim() ||
      String(e.parentShowcaseEntityId || '').trim(),
  )
}

function radiusToSize(radiusKm: number | undefined, fallback: number, orbitDistanceScaleAu: number): number {
  if (!radiusKm || !Number.isFinite(radiusKm) || radiusKm <= 0) {
    return Math.max(0.08, fallback * 2.1)
  }
  const sizeScaleKm = (orbitDistanceScaleAu * SIZE_DISTANCE_RATIO_KM) / AU_IN_KM
  const base = radiusKm * sizeScaleKm
  const ratio = radiusKm / EARTH_RADIUS_KM
  const boost = radiusKm < 2400 ? 2.05 : radiusKm < 12000 ? 1.35 : 1
  return Math.max(0.09, Math.max(base, ratio * EARTH_BASE_SIZE) * boost)
}

function parentDisplayRadiusForEntity(entity: ShowcaseOrbitEntity): number {
  const name = resolveShowcaseOrbitParentPlanetName(entity)
  if (!name) return 0.75
  const p = planetsData.find((x) => x.name === name)
  return Math.max(0.2, p?.radius ?? 0.75)
}

function satelliteOrbitDisplayRadius(entity: ShowcaseOrbitEntity): number {
  const pr = parentDisplayRadiusForEntity(entity)
  const bodyR = Math.max(0.12, radiusToSize(entity.radiusKm, entity.size, ORBIT_DISTANCE_SCALE_AU) * 2.55)
  const parentName = resolveShowcaseOrbitParentPlanetName(entity)
  const parentRadiusKm = parentName ? PLANET_RADIUS_KM[parentName] : undefined
  const oe = entity.orbitalElements
  const aAu = Number(entity.semiMajorAxisAu ?? oe?.a ?? 0)
  if (
    entity.orbitSource === 'jpl-horizons' &&
    Number.isFinite(aAu) &&
    aAu > 0 &&
    aAu < 0.55 &&
    parentRadiusKm &&
    parentRadiusKm > 0
  ) {
    // Convert AU -> "planet radii", then project into scene units of the current parent mesh.
    const inParentRadii = (aAu * AU_IN_KM) / parentRadiusKm
    // Keep local systems readable and avoid extreme blow-up in showcase mode.
    const minOrbit = Math.max(pr + bodyR * 1.8, pr * 1.9)
    return THREE.MathUtils.clamp(inParentRadii * pr * SATELLITE_DISTANCE_COMPRESS, minOrbit, pr * 26)
  }
  const fallback =
    Number.isFinite(Number(entity.distance)) && Number(entity.distance) > 0
      ? Number(entity.distance)
      : Number(oe?.a || 1)
  const minOrbit = Math.max(pr + bodyR * 1.8, pr * 1.9)
  return THREE.MathUtils.clamp(fallback, minOrbit, pr * 24)
}

function heliocentricOrbitDisplayRadius(entity: ShowcaseOrbitEntity, orbitDistanceScaleAu: number): number {
  const oe = entity.orbitalElements
  if (entity.orbitSource === 'jpl-horizons' && hasUsableOrbitalElements(oe)) {
    const aAu = Number(entity.semiMajorAxisAu ?? oe?.a ?? 0)
    if (Number.isFinite(aAu) && aAu > 0 && aAu < 500) {
      return Math.max(0.35, aAu * orbitDistanceScaleAu)
    }
  }
  return entity.distance
}

function satelliteRevealAlpha(cameraDistanceToSun: number): number {
  if (!Number.isFinite(cameraDistanceToSun)) return 0
  const near = 52
  const far = 86
  if (cameraDistanceToSun <= near) return 1
  if (cameraDistanceToSun >= far) return 0
  return 1 - THREE.MathUtils.smoothstep(cameraDistanceToSun, near, far)
}

function normalizedParentId(entity: ShowcaseOrbitEntity): string {
  const id = String(entity.id || '').trim()
  const pid = String(entity.parentId || '').trim()
  if (!pid) return ''
  // `planet-*` lives in planetsData track; treat as external root (not in showcase entity graph depth recursion).
  if (pid.startsWith('planet-')) return ''
  // Planet anchors are driven by planetsData, not by ShowcaseEntityLayer group hierarchy.
  if (id.startsWith('planet-')) return ''
  // Broken/self-referential data should not participate in hierarchy.
  if (pid === id) return ''
  return pid
}

function solveKeplerLocalOrbitPosition(
  entity: ShowcaseOrbitEntity,
  orbitDistanceScaleAu: number,
  angle: number,
  out: THREE.Vector3,
  axisY: THREE.Vector3,
  axisX: THREE.Vector3,
): THREE.Vector3 {
  const oe = entity.orbitalElements
  if (!oe) {
    const pseudo = {
      distance: entity.distance,
      orbitEccentricity: entity.orbitEccentricity ?? 0.05,
      orbitInclinationDeg: entity.inclinationDeg ?? 0,
      orbitAscendingNodeDeg: entity.ascendingNodeDeg ?? 0,
    } as PlanetData
    out.copy(computeOrbitalPosition(pseudo, angle))
    return out
  }
  const e = Math.max(0, Math.min(0.98, Number(oe.e || 0)))
  const aAu = Number(entity.semiMajorAxisAu ?? oe.a ?? 0)
  const useJplAu =
    entity.orbitSource === 'jpl-horizons' && Number.isFinite(aAu) && aAu > 0 && aAu < 500
  const parentPlanetName = resolveShowcaseOrbitParentPlanetName(entity)
  const isSatelliteAroundPlanet = Boolean(parentPlanetName)
  let a = useJplAu
    ? Math.max(0.0001, aAu * orbitDistanceScaleAu)
    : Math.max(0.0001, Number(oe.a || entity.distance || 1))
  if (isSatelliteAroundPlanet) {
    a = satelliteOrbitDisplayRadius(entity)
  }
  const M = THREE.MathUtils.degToRad(Number(oe.m || entity.phaseDeg || 0)) + angle
  let E = M
  for (let k = 0; k < 5; k++) E = E - (E - e * Math.sin(E) - M) / Math.max(1e-6, 1 - e * Math.cos(E))
  const x = a * (Math.cos(E) - e)
  const z = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E)
  const i = THREE.MathUtils.degToRad(Number(oe.i || entity.inclinationDeg || 0))
  const om = THREE.MathUtils.degToRad(Number(oe.om || entity.ascendingNodeDeg || 0))
  const w = THREE.MathUtils.degToRad(Number(oe.w || 0))
  out.set(x, 0, z)
  out.applyAxisAngle(axisY, w)
  out.applyAxisAngle(axisX, i)
  out.applyAxisAngle(axisY, om)
  return out
}

export function ShowcaseEntityLayer({
  planetPositionsRef,
  activeItemId,
  visible,
  frozen = false,
  activeGroup,
  onPositionUpdate,
  onSelectEntity,
  selectedPlanetName,
  orbitEntities = SHOWCASE_ORBIT_ENTITIES,
}: {
  planetPositionsRef: React.MutableRefObject<THREE.Vector3[]>
  activeItemId?: string | null
  visible: boolean
  frozen?: boolean
  activeGroup: string
  onPositionUpdate?: (id: string, position: THREE.Vector3) => void
  onSelectEntity?: (id: string) => void
  selectedPlanetName?: string | null
  /** Mặc định catalog orbit trong code; Explore có thể truyền bản merge texture HTTPS từ CMS. */
  orbitEntities?: ShowcaseOrbitEntity[]
}) {
  const axisYScratch = useRef(new THREE.Vector3(0, 1, 0))
  const axisXScratch = useRef(new THREE.Vector3(1, 0, 0))
  const localOrbitScratch = useRef(new THREE.Vector3())
  const parentAddScratch = useRef(new THREE.Vector3())
  const sortedEntitiesRef = useRef<ShowcaseOrbitEntity[]>([])

  const preloadGroup = useShowcaseStore((s) => s.preloadGroup)
  const cameraDistanceToSun = useShowcaseStore((s) => s.cameraDistanceToSun)
  const labelCollisionRef = useRef<{ frame: number; points: Array<{ x: number; y: number }> }>({
    frame: -1,
    points: [],
  })
  const cycleLoggedRef = useRef<Set<string>>(new Set())
  const collisionFrameRef = useRef(0)
  const parentIndexByName = useMemo(
    () => new Map(planetsData.map((p, idx) => [p.name, idx] as const)),
    [],
  )
  const groupsRef = useRef(new Map<string, THREE.Group>())
  const anglesRef = useRef(new Map<string, number>())

  useEffect(() => {
    const next = new Map<string, number>()
    for (const e of orbitEntities) {
      next.set(e.id, anglesRef.current.get(e.id) ?? THREE.MathUtils.degToRad(e.phaseDeg ?? Math.random() * 360))
    }
    anglesRef.current = next
  }, [orbitEntities])

  const orbitById = useMemo(
    () => new Map(orbitEntities.map((e) => [String(e.id || '').trim(), e] as const)),
    [orbitEntities],
  )
  const orbitDistanceScaleAu = useMemo(() => {
    const maxSemiMajorAu = orbitEntities.reduce((mx, e) => {
      const a = Number(e.semiMajorAxisAu ?? e.orbitalElements?.a ?? 0)
      return Number.isFinite(a) && a > 0 ? Math.max(mx, a) : mx
    }, 0)
    if (maxSemiMajorAu <= 0) return ORBIT_DISTANCE_SCALE_AU
    return THREE.MathUtils.clamp(TARGET_SCENE_RADIUS / maxSemiMajorAu, 8.5, 26)
  }, [orbitEntities])

  useEffect(() => {
    const depth = new Map<string, number>()
    const depthOf = (id: string, stack: Set<string> = new Set()): number => {
      const key = String(id || '').trim()
      if (!key) return 0
      if (stack.has(key)) {
        const cycleKey = [...stack, key].join(' -> ')
        if (!cycleLoggedRef.current.has(cycleKey)) {
          cycleLoggedRef.current.add(cycleKey)
          if (typeof console !== 'undefined') {
            console.error(`[showcase-orbit] parent cycle detected: ${cycleKey}`)
          }
        }
        return 0
      }
      if (depth.has(key)) return depth.get(key) || 0
      const e = orbitById.get(key)
      if (!e) return 0
      const p = normalizedParentId(e)
      stack.add(key)
      const d = p ? Math.min(8, depthOf(p, stack) + 1) : 0
      stack.delete(key)
      depth.set(key, d)
      return d
    }
    sortedEntitiesRef.current = [...orbitEntities].sort((a, b) => depthOf(a.id) - depthOf(b.id))
  }, [orbitById, orbitEntities])

  useFrame((_, dt) => {
    if (!visible) return
    collisionFrameRef.current += 1
    labelCollisionRef.current.frame = collisionFrameRef.current
    labelCollisionRef.current.points = []
    for (const entity of sortedEntitiesRef.current) {
      const g = groupsRef.current.get(entity.id)
      if (!g) continue
      const prevA = anglesRef.current.get(entity.id) ?? 0
      const pd = entity.orbitalElements?.periodDays || entity.periodDays || entity.period
      const period = Math.max(0.5, Number(pd || 1))
      const nextA = frozen ? prevA : prevA + dt * ((Math.PI * 2) / period)
      anglesRef.current.set(entity.id, nextA)

      const parentId = normalizedParentId(entity)
      const hasVector = Boolean(entity.vectorSim && Number.isFinite(entity.vectorSim.x))
      const jplKepler = entity.orbitSource === 'jpl-horizons' && hasUsableOrbitalElements(entity.orbitalElements)

      if (jplKepler) {
        const local = solveKeplerLocalOrbitPosition(
          entity,
          orbitDistanceScaleAu,
          nextA,
          localOrbitScratch.current,
          axisYScratch.current,
          axisXScratch.current,
        )
        const parentPlanetResolved = resolveShowcaseOrbitParentPlanetName(entity)
        if (parentId) {
          const parentG = groupsRef.current.get(parentId)
          if (parentG) {
            g.position.copy(parentAddScratch.current.addVectors(parentG.position, local))
          } else if (parentPlanetResolved) {
            const pIdx = parentIndexByName.get(parentPlanetResolved)
            const p = pIdx != null ? planetPositionsRef.current[pIdx] : null
            if (p && p.lengthSq() >= 1e-6) g.position.copy(parentAddScratch.current.addVectors(p, local))
            else continue
          } else {
            g.position.copy(local)
          }
        } else if (parentPlanetResolved) {
          const pIdx = parentIndexByName.get(parentPlanetResolved)
          const p = pIdx != null ? planetPositionsRef.current[pIdx] : null
          if (!p || p.lengthSq() < 1e-6) continue
          g.position.copy(parentAddScratch.current.addVectors(p, local))
        } else {
          g.position.copy(local)
        }
      } else if (parentId && hasVector) {
        const parentG = groupsRef.current.get(parentId)
        if (!parentG) continue
        const v = entity.vectorSim!
        g.position.set(parentG.position.x + v.x, parentG.position.y + v.y, parentG.position.z + v.z)
      } else if (hasVector) {
        const v = entity.vectorSim!
        g.position.set(v.x, v.y, v.z)
      } else if (parentId) {
        const parentG = groupsRef.current.get(parentId)
        const local = solveKeplerLocalOrbitPosition(
          entity,
          orbitDistanceScaleAu,
          nextA,
          localOrbitScratch.current,
          axisYScratch.current,
          axisXScratch.current,
        )
        if (parentG) {
          g.position.copy(parentAddScratch.current.addVectors(parentG.position, local))
        } else {
          const pp = resolveShowcaseOrbitParentPlanetName(entity)
          if (!pp) continue
          const pIdx = parentIndexByName.get(pp)
          const p = pIdx != null ? planetPositionsRef.current[pIdx] : null
          if (!p || p.lengthSq() < 1e-6) continue
          g.position.copy(parentAddScratch.current.addVectors(p, local))
        }
      } else if (resolveShowcaseOrbitParentPlanetName(entity)) {
        const pp = resolveShowcaseOrbitParentPlanetName(entity)!
        const pIdx = parentIndexByName.get(pp)
        if (pIdx == null) continue
        const p = planetPositionsRef.current[pIdx]
        if (!p || p.lengthSq() < 1e-6) continue
        const parentRadius = planetsData[pIdx]?.radius ?? 0.6
        // Keep moon/entity orbit outside parent sphere for readable, NASA-Eyes-like composition.
        const orbitRadius = Math.max(entity.distance, parentRadius * 1.55 + entity.distance * 0.65)
        const x = Math.cos(nextA) * orbitRadius
        const z = Math.sin(nextA) * orbitRadius
        const y = Math.sin(nextA * 0.5) * orbitRadius * 0.06
        g.position.set(p.x + x, p.y + y, p.z + z)
      } else if (entity.parentShowcaseEntityId) {
        const parentG = groupsRef.current.get(entity.parentShowcaseEntityId)
        if (!parentG) continue
        const p = parentG.position
        const orbitRadius = Math.max(entity.distance, entity.distance * 1.45)
        const x = Math.cos(nextA) * orbitRadius
        const z = Math.sin(nextA) * orbitRadius
        const y = Math.sin(nextA * 0.5) * orbitRadius * 0.06
        g.position.set(p.x + x, p.y + y, p.z + z)
      } else {
        const pos = solveKeplerLocalOrbitPosition(
          entity,
          orbitDistanceScaleAu,
          nextA,
          localOrbitScratch.current,
          axisYScratch.current,
          axisXScratch.current,
        )
        g.position.copy(pos)
      }
      onPositionUpdate?.(entity.id, g.position)
    }
  })

  const visibleEntities = useMemo(() => {
    return orbitEntities.filter((entity) => {
      // Main planets are rendered by `Planet` in ShowcaseScene; skip duplicate `planet-*` in entity layer.
      if (String(entity.id || '').startsWith('planet-')) return false
      const c = getNasaCatalogItemById(entity.id)
      const g = c?.group
      const groupOk =
        g === activeGroup || (!!preloadGroup && g === preloadGroup) || entity.id === activeItemId
      if (!groupOk) return false
      const isActive = entity.id === activeItemId
      if (!isActive && !hasRenderableShowcaseMedia(entity)) return false
      if (!selectedPlanetName) {
        if (isActive) return true
        if (isSatelliteEntity(entity)) {
          return true
        }
        return true
      }
      if (isActive) return true
      const parentPlanet = resolveShowcaseOrbitParentPlanetName(entity)
      if (parentPlanet && parentPlanet === selectedPlanetName) return true
      const selPlanetId = showcaseIdForSolarPlanetName(selectedPlanetName)
      const pid = String(entity.parentId || '').trim()
      if (selPlanetId && pid && pid === selPlanetId) return true
      const psc = String(entity.parentShowcaseEntityId || '').trim()
      if (psc && (psc === activeItemId || (selPlanetId && psc === selPlanetId))) return true
      if (parentPlanet || pid || psc) return false
      return false
    })
  }, [activeGroup, preloadGroup, activeItemId, selectedPlanetName, orbitEntities])

  if (!visible) return null
  const revealAlpha =
    !selectedPlanetName ? satelliteRevealAlpha(cameraDistanceToSun) : 1

  return (
    <group>
      {visibleEntities.map((entity) => (
        <Suspense key={entity.id} fallback={null}>
          <ShowcaseEntityRow
            entity={entity}
            orbitDistanceScaleAu={orbitDistanceScaleAu}
            activeItemId={activeItemId}
            selectedPlanetName={selectedPlanetName ?? null}
            parentIndexByName={parentIndexByName}
            planetPositionsRef={planetPositionsRef}
            groupsRef={groupsRef}
            onSelectEntity={onSelectEntity}
            collisionStateRef={labelCollisionRef}
            frameRef={collisionFrameRef}
            revealAlpha={revealAlpha}
          />
        </Suspense>
      ))}
    </group>
  )
}

/** Local moon / Charon path; opacity fades as the camera nears the orbiting mesh (NASA Eyes). */
/** Nametag HTML: chữ to khi camera xa, mờ khi zoom sát (NASA Eyes). */
function ShowcaseEntityNametag({
  anchorRef,
  label,
  active,
  activeItemId,
  onSelect,
  meshLift,
  visualOpacity = 1,
  occluderPosition,
  occluderRadius = 0,
  collisionStateRef,
  frameRef,
}: {
  anchorRef: React.RefObject<THREE.Group | null>
  label: string
  active: boolean
  activeItemId?: string | null
  onSelect?: () => void
  /** Đặt Html cao hơn tâm mesh (đơn vị scene). */
  meshLift: number
  visualOpacity?: number
  occluderPosition?: THREE.Vector3 | null
  occluderRadius?: number
  collisionStateRef: React.MutableRefObject<{ frame: number; points: Array<{ x: number; y: number }> }>
  frameRef: React.MutableRefObject<number>
}) {
  const { camera, size } = useThree()
  const tick = useRef(0)
  const divRef = useRef<HTMLDivElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const wpRef = useRef(new THREE.Vector3())
  const ndcRef = useRef(new THREE.Vector3())
  const camToLabelRef = useRef(new THREE.Vector3())
  const camToOccRef = useRef(new THREE.Vector3())
  const dirRef = useRef(new THREE.Vector3())

  function isOccludedBySphere(
    cam: THREE.Vector3,
    labelPos: THREE.Vector3,
    sphereCenter: THREE.Vector3,
    sphereRadius: number,
  ): boolean {
    const r = Math.max(0, sphereRadius)
    if (r <= 1e-6) return false
    const camToLabel = camToLabelRef.current.subVectors(labelPos, cam)
    const labelDist = camToLabel.length()
    if (!Number.isFinite(labelDist) || labelDist <= 1e-6) return false
    const dir = dirRef.current.copy(camToLabel).multiplyScalar(1 / labelDist)
    const camToOcc = camToOccRef.current.subVectors(sphereCenter, cam)
    const t = camToOcc.dot(dir)
    if (t <= 0 || t >= labelDist) return false
    const closestSq = camToOcc.lengthSq() - t * t
    return closestSq <= r * r
  }

  useFrame(() => {
    const g = anchorRef.current
    const div = divRef.current
    const wrapper = wrapperRef.current
    if (!g || !div || !wrapper) return
    tick.current += 1
    if (tick.current % 2 !== 0) return
    const wp = wpRef.current
    g.getWorldPosition(wp)
    const d = camera.position.distanceTo(wp)
    const r = Math.max(0.12, meshLift / 1.58)
    const nearHideStart = Math.max(0.6, r * 1.15)
    const nearHideEnd = Math.max(nearHideStart + 0.01, r * 2.4)
    const farFadeStart = 260
    const farFadeEnd = 1200
    const nearK =
      d <= nearHideStart ? 0 : d >= nearHideEnd ? 1 : THREE.MathUtils.smoothstep(d, nearHideStart, nearHideEnd)
    const farK =
      d <= farFadeStart ? 1 : d >= farFadeEnd ? 0 : 1 - THREE.MathUtils.smoothstep(d, farFadeStart, farFadeEnd)
    const labelK = nearK * farK
    const base = active ? 1 : activeItemId ? 0.76 : 0.9
    const ndc = ndcRef.current.copy(wp).project(camera)
    const sx = (ndc.x * 0.5 + 0.5) * size.width
    const sy = (-ndc.y * 0.5 + 0.5) * size.height
    if (collisionStateRef.current.frame !== frameRef.current) {
      collisionStateRef.current.frame = frameRef.current
      collisionStateRef.current.points = []
    }
    const collisionRadius = 24
    const applyCollisionCull = true
    const collisionHidden =
      !active &&
      applyCollisionCull &&
      collisionStateRef.current.points.some((p) => {
        const dx = p.x - sx
        const dy = p.y - sy
        return dx * dx + dy * dy < collisionRadius * collisionRadius
      })
    collisionStateRef.current.points.push({ x: sx, y: sy })
    const opacity = THREE.MathUtils.clamp(base * labelK * visualOpacity, 0, 1)
    const occluded =
      Boolean(occluderPosition) &&
      isOccludedBySphere(camera.position, wp, occluderPosition as THREE.Vector3, occluderRadius)
    const hidden = collisionHidden || occluded
    wrapper.style.opacity = hidden ? '0' : String(opacity)
    wrapper.style.display = hidden ? 'none' : ''
    div.style.fontSize = active ? '12px' : '11px'
    div.style.setProperty('--dot-display', active ? 'none' : 'inline-flex')
  })
  return (
    <Html position={[0, meshLift, 0]} center occlude>
      <div ref={wrapperRef}>
      <div
        ref={divRef}
        className="select-none whitespace-nowrap font-normal uppercase tracking-[0.12em] pointer-events-none inline-flex items-center gap-1"
        style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          color: active ? '#f8fafc' : 'rgba(248,250,252,0.95)',
          textShadow:
            '0 0 6px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'var(--dot-display, inline-flex)',
            width: 5,
            height: 5,
            borderRadius: '9999px',
            border: '1px solid rgba(255,255,255,0.65)',
            boxSizing: 'border-box',
          }}
        />
        <span>{label}</span>
      </div>
      </div>
    </Html>
  )
}

function FadedLocalEllipticOrbit({
  entity,
  getAnchor,
  parentSceneRadius,
  orbitDistanceScaleAu,
  baseOpacity,
}: {
  entity: ShowcaseOrbitEntity
  getAnchor: () => THREE.Vector3 | null
  parentSceneRadius: number
  orbitDistanceScaleAu: number
  baseOpacity: number
}) {
  const { camera } = useThree()
  const matRef = useRef<THREE.LineBasicMaterial>(null)
  const geomRef = useRef<THREE.BufferGeometry>(null)
  const prevAnchorRef = useRef(new THREE.Vector3())
  const anchorScratch = useRef(new THREE.Vector3())
  const localScratch = useRef(new THREE.Vector3())
  const axisYScratch = useRef(new THREE.Vector3(0, 1, 0))
  const axisXScratch = useRef(new THREE.Vector3(1, 0, 0))
  const approxRadius = satelliteOrbitDisplayRadius(entity)
  const segs = Math.max(96, Math.min(260, Math.round(approxRadius * 60)))
  const pointsBuffer = useMemo(
    () => Array.from({ length: segs + 1 }, () => new THREE.Vector3()),
    [segs],
  )
  const parentR = Math.max(0.2, parentSceneRadius)
  useFrame(() => {
    const mat = matRef.current
    const geom = geomRef.current
    const c = getAnchor()
    if (!geom || !c) return
    if (mat) {
      anchorScratch.current.copy(c)
      const d = camera.position.distanceTo(anchorScratch.current)
      // Local orbit around parent (moon system):
      // - fade IN when zooming toward parent
      // - keep visible around focus range
      // - fade OUT only when too close and line merges with planet body
      const fadeInStart = parentR * 80
      const fadeInEnd = parentR * 10
      const fadeOutStart = parentR * 2
      const fadeOutEnd = parentR * 0.5
      let k = 1
      if (d > fadeInStart || d < fadeOutEnd) k = 0
      else if (d < fadeOutStart) k = THREE.MathUtils.smoothstep(d, fadeOutEnd, fadeOutStart)
      else if (d > fadeInEnd) k = 1 - THREE.MathUtils.smoothstep(d, fadeInEnd, fadeInStart)
      mat.opacity = baseOpacity * THREE.MathUtils.clamp(k, 0, 1)
    }
    if (prevAnchorRef.current.distanceToSquared(c) < 1e-6) return
    prevAnchorRef.current.copy(c)
    for (let i = 0; i <= segs; i++) {
      const t = (i / segs) * Math.PI * 2
      const lp = solveKeplerLocalOrbitPosition(
        entity,
        orbitDistanceScaleAu,
        t,
        localScratch.current,
        axisYScratch.current,
        axisXScratch.current,
      )
      pointsBuffer[i].set(c.x + lp.x, c.y + lp.y, c.z + lp.z)
    }
    geom.setFromPoints(pointsBuffer)
    if (geom.attributes.position) geom.attributes.position.needsUpdate = true
  })
  return (
    <lineLoop raycast={() => null}>
      <bufferGeometry ref={geomRef} attach="geometry" />
      <lineBasicMaterial ref={matRef} color={entity.orbitColor} transparent opacity={baseOpacity} depthWrite={false} />
    </lineLoop>
  )
}

function ShowcaseEntityRow({
  entity,
  orbitDistanceScaleAu,
  activeItemId,
  selectedPlanetName,
  parentIndexByName,
  planetPositionsRef,
  groupsRef,
  onSelectEntity,
  collisionStateRef,
  frameRef,
  revealAlpha,
}: {
  entity: ShowcaseOrbitEntity
  orbitDistanceScaleAu: number
  activeItemId?: string | null
  selectedPlanetName: string | null
  parentIndexByName: Map<string, number>
  planetPositionsRef: React.MutableRefObject<THREE.Vector3[]>
  groupsRef: React.MutableRefObject<Map<string, THREE.Group>>
  onSelectEntity?: (id: string) => void
  collisionStateRef: React.MutableRefObject<{ frame: number; points: Array<{ x: number; y: number }> }>
  frameRef: React.MutableRefObject<number>
  revealAlpha: number
}) {
  const bodyWorldScratch = useRef(new THREE.Vector3())
  const active = activeItemId === entity.id
  const parentPlanetResolved = resolveShowcaseOrbitParentPlanetName(entity)
  const parentIndex = parentPlanetResolved ? parentIndexByName.get(parentPlanetResolved) : undefined
  const parentPos = parentIndex != null ? planetPositionsRef.current[parentIndex] : null
  const showcaseParentPos =
    entity.parentShowcaseEntityId != null
      ? groupsRef.current.get(entity.parentShowcaseEntityId)?.position
      : null
  const showSatelliteOrbit =
    Boolean(parentPos) &&
    Boolean(selectedPlanetName) &&
    parentPlanetResolved === selectedPlanetName
  const showCharonOrbit =
    Boolean(showcaseParentPos) && entity.parentShowcaseEntityId != null && activeItemId === entity.id

  const helioOrbitRadius = heliocentricOrbitDisplayRadius(entity, orbitDistanceScaleAu)
  const helioOrbitPeriod =
    entity.orbitalElements?.periodDays || entity.periodDays || entity.period
  const isHeliocentricBody =
    !resolveShowcaseOrbitParentPlanetName(entity) && !entity.parentShowcaseEntityId
  const heliocentricProximityFade: OrbitProximityFade | undefined =
    isHeliocentricBody && activeItemId === entity.id
      ? {
          getWorldPosition: () => {
            const g = groupsRef.current.get(entity.id)
            if (!g) return null
            return g.getWorldPosition(bodyWorldScratch.current)
          },
          near: Math.max(2.0, helioOrbitRadius * 0.7),
          far: Math.max(6.5, helioOrbitRadius * 3),
        }
      : undefined

  const anchorRef = useRef<THREE.Group | null>(null)
  const bodySceneSize = radiusToSize(entity.radiusKm, entity.size, orbitDistanceScaleAu)
  const meshR = Math.max(0.14, bodySceneSize * 2.55)
  const nametagLift = meshR * 1.58
  const rowRevealAlpha = !selectedPlanetName && parentPlanetResolved ? revealAlpha : 1
  const parentSceneRadius =
    parentIndex != null ? Math.max(0.2, planetsData[parentIndex]?.radius ?? 0.75) : 0.75
  const nametagOccluderPosition = parentPos ?? null
  const nametagOccluderRadius = parentPos ? parentSceneRadius : 0

  return (
    <group>
      {isHeliocentricBody ? (
            <OrbitPath
              data={{
                name: entity.name,
                nameVi: entity.name,
                explorerBlurb: '',
                texture: '',
                radius: 0.01,
                distance: helioOrbitRadius,
                period: helioOrbitPeriod,
                spinPeriod: entity.period,
                orbitColor: entity.orbitColor,
                orbitEccentricity: entity.orbitEccentricity ?? 0.05,
                orbitInclinationDeg: entity.inclinationDeg ?? 0,
                orbitAscendingNodeDeg: entity.ascendingNodeDeg ?? 0,
              }}
              highlighted={active}
              visible={!activeItemId || activeItemId === entity.id}
              interactive={false}
              proximityFade={heliocentricProximityFade}
            />
      ) : parentPos && showSatelliteOrbit ? (
        <FadedLocalEllipticOrbit
          entity={entity}
          getAnchor={() => parentPos}
          parentSceneRadius={parentSceneRadius}
          orbitDistanceScaleAu={orbitDistanceScaleAu}
          baseOpacity={(active ? 0.95 : 0.35) * rowRevealAlpha}
        />
      ) : showcaseParentPos && showCharonOrbit ? (
        <FadedLocalEllipticOrbit
          entity={entity}
          getAnchor={() => showcaseParentPos ?? null}
          parentSceneRadius={0.9}
          orbitDistanceScaleAu={orbitDistanceScaleAu}
          baseOpacity={active ? 0.95 : 0.35}
        />
      ) : null}
      <group
        ref={(node) => {
          anchorRef.current = node
          if (!node) groupsRef.current.delete(entity.id)
          else groupsRef.current.set(entity.id, node)
        }}
      >
        <ShowcaseEntityMesh
          entity={{ ...entity, size: bodySceneSize }}
          active={active}
          visualOpacity={rowRevealAlpha}
          onSelect={() => onSelectEntity?.(entity.id)}
        />
        <ShowcaseEntityNametag
          anchorRef={anchorRef}
          label={entity.name.toUpperCase()}
          active={active}
          activeItemId={activeItemId}
          meshLift={nametagLift}
          visualOpacity={rowRevealAlpha}
          occluderPosition={nametagOccluderPosition}
          occluderRadius={nametagOccluderRadius}
          collisionStateRef={collisionStateRef}
          frameRef={frameRef}
          onSelect={() => onSelectEntity?.(entity.id)}
        />
      </group>
    </group>
  )
}
