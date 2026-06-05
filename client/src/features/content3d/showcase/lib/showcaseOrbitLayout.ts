import * as THREE from 'three'
import { hasUsableOrbitalElements } from '@/features/content3d/showcase/lib/mergeShowcaseCatalog'
import {
  resolveShowcaseOrbitParentPlanetName,
  type ShowcaseOrbitEntity,
} from '@/features/content3d/showcase/lib/showcaseCatalogRuntime'
import { planetsData, sunData, type PlanetData } from '@/features/content3d/showcase/lib/solarSystemData'

const AU_IN_KM = 149_597_870.7
export const SHOWCASE_SCENE_RADIUS = 320

/** Semi-major axis thật (AU) — dùng cho scale heliocentric, không tin JPL `a` trên planet-* (hay bị lẫn ngày/km/scene). */
const CANONICAL_PLANET_AU: Record<string, number> = {
  Mercury: 0.387,
  Venus: 0.723,
  Earth: 1.0,
  Mars: 1.524,
  Jupiter: 5.203,
  Saturn: 9.537,
  Uranus: 19.191,
  Neptune: 30.07,
}
const SATELLITE_ORBIT_SCENE_PER_PARENT_RADIUS = 0.052
const EARTH_RADIUS_KM = 6371
const EARTH_BASE_SIZE = 0.2
const SIZE_DISTANCE_RATIO_KM = 180
const SHOWCASE_MESH_RADIUS_SCALE = 2.55
const SHOWCASE_MESH_RADIUS_FLOOR = 0.14
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
/** Bán kính thật (km) — chỉ dùng khi entity con đang được chọn (focus close-up). */
const CANONICAL_BODY_RADIUS_KM: Record<string, number> = {
  'moon-luna': 1737.4,
  'moon-phobos': 11.267,
  'moon-deimos': 6.2,
  'moon-io': 1821.6,
  'moon-europa': 1560.8,
  'moon-ganymede': 2634.1,
  'moon-callisto': 2410.3,
  'moon-titan': 2574.7,
  'moon-enceladus': 252.1,
  'moon-mimas': 198.2,
  'moon-dione': 561.4,
  'moon-rhea': 763.8,
  'moon-tethys': 531.1,
  'moon-iapetus': 734.5,
  'moon-triton': 1353.4,
  'moon-miranda': 235.8,
  'moon-ariel': 578.9,
  'moon-umbriel': 584.7,
  'moon-titania': 788.9,
  'moon-oberon': 761.4,
  'moon-charon': 606,
}

export type SatelliteOrbitLayout = { radius: number; phaseRad: number }

function parentSceneRadius(planetName: string): number {
  const p = planetsData.find((x) => x.name === planetName)
  return Math.max(0.2, p?.radius ?? 0.75)
}

function resolveBodyRadiusKm(entity: ShowcaseOrbitEntity): number {
  const id = String(entity.id || '').trim()
  const fromEntity = Number(entity.radiusKm)
  if (Number.isFinite(fromEntity) && fromEntity > 0) return fromEntity
  const canon = CANONICAL_BODY_RADIUS_KM[id]
  return Number.isFinite(canon) && canon > 0 ? canon : 0
}

function satelliteSphereRadius(entity: ShowcaseOrbitEntity, parentPlanetName: string): number {
  const parentR = parentSceneRadius(parentPlanetName)
  const parentKm = PLANET_RADIUS_KM[parentPlanetName] ?? EARTH_RADIUS_KM
  const bodyKm = resolveBodyRadiusKm(entity)
  if (bodyKm > 0 && parentKm > 0) {
    return Math.max(0.028, parentR * (bodyKm / parentKm))
  }
  const legacy = Number(entity.size || 0.05)
  return Math.max(0.028, parentR * legacy * 0.34)
}

/** Chỉ khi click entity con: mesh tỉ lệ vật lý so với cha. */
export function resolveSatelliteBodySceneSize(
  entity: ShowcaseOrbitEntity,
  parentPlanetName: string,
): number {
  return satelliteSphereRadius(entity, parentPlanetName) / SHOWCASE_MESH_RADIUS_SCALE
}

export function resolveSatelliteMeshRadius(
  entity: ShowcaseOrbitEntity,
  parentPlanetName: string,
): number {
  return Math.max(0.06, satelliteSphereRadius(entity, parentPlanetName))
}

/** Cùng công thức `ShowcaseEntityLayer` → `ShowcaseEntityMesh` (tránh quỹ đạo tính nhỏ hơn mesh thật). */
export function resolveShowcaseEntityBodySceneSize(
  entity: ShowcaseOrbitEntity,
  orbitDistanceScaleAu: number,
): number {
  const fallback = Number(entity.size || 0.05)
  const radiusKm = Number(entity.radiusKm)
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    return Math.max(0.08, fallback * 2.1)
  }
  const sizeScaleKm = (orbitDistanceScaleAu * SIZE_DISTANCE_RATIO_KM) / AU_IN_KM
  const base = radiusKm * sizeScaleKm
  const ratio = radiusKm / EARTH_RADIUS_KM
  const boost = radiusKm < 2400 ? 2.05 : radiusKm < 12000 ? 1.35 : 1
  return Math.max(0.09, Math.max(base, ratio * EARTH_BASE_SIZE) * boost)
}

export function resolveShowcaseEntityMeshRadius(
  entity: ShowcaseOrbitEntity,
  orbitDistanceScaleAu: number,
): number {
  const bodySceneSize = resolveShowcaseEntityBodySceneSize(entity, orbitDistanceScaleAu)
  return Math.max(SHOWCASE_MESH_RADIUS_FLOOR, bodySceneSize * SHOWCASE_MESH_RADIUS_SCALE)
}

function satelliteMinOrbitRadius(parentRadius: number, meshRadius: number): number {
  const clearance = Math.max(0.18, parentRadius * 0.06)
  return parentRadius + meshRadius + clearance
}

/** Scale AU → scene theo Neptune (~30 AU) — ổn định, không phụ thuộc JPL sync lỗi trên planet-*. */
export function resolveHeliocentricAuToSceneScale(_entities: ShowcaseOrbitEntity[]): number {
  const maxPlanetAu = Math.max(30, ...Object.values(CANONICAL_PLANET_AU))
  return THREE.MathUtils.clamp(SHOWCASE_SCENE_RADIUS / maxPlanetAu, 14, 34)
}

function earthHeliocentricSceneUnit(): number {
  return planetsData.find((p) => p.name === 'Earth')?.distance ?? 27
}

/**
 * Bán kính quỹ đạo heliocentric — tỉ lệ AU thật (Earth = 1 AU = `planetsData` Earth distance).
 * Trước đây Mars (30) gần Earth (27) hơn Moon (~1.12) — sai tỉ lệ khoảng cách.
 */
export function resolvePlanetHeliocentricDistance(
  planet: PlanetData,
  orbitEntity: ShowcaseOrbitEntity | undefined,
  auScale: number,
): number {
  void orbitEntity
  void auScale
  const au = CANONICAL_PLANET_AU[planet.name]
  if (au) return earthHeliocentricSceneUnit() * au
  const sunR = sunData.radius
  return Math.max(planet.distance, sunR * 4.75)
}

function satelliteRadiusFromCatalog(
  entity: ShowcaseOrbitEntity,
  pr: number,
  meshRadius: number,
  index: number,
  count: number,
): number {
  const minOrbit = satelliteMinOrbitRadius(pr, meshRadius)
  const maxOrbit = Math.max(minOrbit + 0.35, pr * 7.5)
  let catalogDistance = Number(entity.distance)
  if (!Number.isFinite(catalogDistance) || catalogDistance <= 0) catalogDistance = minOrbit

  if (count > 1) {
    const t = count <= 1 ? 0 : index / Math.max(1, count - 1)
    const spread = 0.22 * catalogDistance * t
    catalogDistance = catalogDistance + spread
  }

  const parentName = resolveShowcaseOrbitParentPlanetName(entity)
  const parentRadiusKm = parentName ? PLANET_RADIUS_KM[parentName] : undefined
  const oe = entity.orbitalElements
  const aAu = Number(entity.semiMajorAxisAu ?? oe?.a ?? 0)
  if (
    entity.orbitSource === 'jpl-horizons' &&
    Number.isFinite(aAu) &&
    aAu > 0 &&
    aAu < 0.12 &&
    parentRadiusKm &&
    parentRadiusKm > 0
  ) {
    const inParentRadii = (aAu * AU_IN_KM) / parentRadiusKm
    const fromJpl = inParentRadii * pr * SATELLITE_ORBIT_SCENE_PER_PARENT_RADIUS
    return THREE.MathUtils.clamp(Math.max(catalogDistance, fromJpl), minOrbit, maxOrbit)
  }

  return THREE.MathUtils.clamp(catalogDistance, minOrbit, maxOrbit)
}

/** Bán kính quỹ đạo + pha ban đầu — tách vệ tinh cùng cha để không dính chùm. */
export function buildSatelliteOrbitLayout(
  entities: ShowcaseOrbitEntity[],
  orbitDistanceScaleAu: number,
): Map<string, SatelliteOrbitLayout> {
  const out = new Map<string, SatelliteOrbitLayout>()
  const groups = new Map<string, ShowcaseOrbitEntity[]>()

  for (const e of entities) {
    const parent =
      resolveShowcaseOrbitParentPlanetName(e) ||
      String(e.parentShowcaseEntityId || '').trim()
    if (!parent) continue
    const list = groups.get(parent) ?? []
    list.push(e)
    groups.set(parent, list)
  }

  for (const siblings of groups.values()) {
    siblings.sort((a, b) => (a.distance || 0) - (b.distance || 0) || a.name.localeCompare(b.name))
    const count = siblings.length
    siblings.forEach((entity, index) => {
      const parentName = resolveShowcaseOrbitParentPlanetName(entity)
      const pr = parentName ? parentSceneRadius(parentName) : 0.75
      const meshR = resolveShowcaseEntityMeshRadius(entity, orbitDistanceScaleAu)
      const radius = satelliteRadiusFromCatalog(entity, pr, meshR, index, count)
      const phaseRad =
        (index / count) * Math.PI * 2 +
        THREE.MathUtils.degToRad(Number(entity.phaseDeg ?? 0))
      out.set(entity.id, { radius, phaseRad })
    })
  }

  return out
}

export function satelliteOrbitDisplayRadius(
  entity: ShowcaseOrbitEntity,
  layout?: Map<string, SatelliteOrbitLayout>,
  orbitDistanceScaleAu = resolveHeliocentricAuToSceneScale([]),
): number {
  const laid = layout?.get(entity.id)
  if (laid) return laid.radius

  const parentName = resolveShowcaseOrbitParentPlanetName(entity)
  const pr = parentName ? parentSceneRadius(parentName) : 0.75
  const meshR = resolveShowcaseEntityMeshRadius(entity, orbitDistanceScaleAu)
  return satelliteRadiusFromCatalog(entity, pr, meshR, 0, 1)
}

export function initialOrbitAngleForEntity(
  entity: ShowcaseOrbitEntity,
  layout?: Map<string, SatelliteOrbitLayout>,
): number {
  const laid = layout?.get(entity.id)
  if (laid) return laid.phaseRad
  return THREE.MathUtils.degToRad(Number(entity.phaseDeg ?? Math.random() * 360))
}

export function heliocentricOrbitDisplayRadius(
  entity: ShowcaseOrbitEntity,
  orbitDistanceScaleAu: number,
): number {
  const oe = entity.orbitalElements
  if (entity.orbitSource === 'jpl-horizons' && hasUsableOrbitalElements(oe)) {
    const aAu = Number(entity.semiMajorAxisAu ?? oe?.a ?? 0)
    if (Number.isFinite(aAu) && aAu > 0 && aAu < 500) {
      return Math.max(0.35, aAu * orbitDistanceScaleAu)
    }
  }
  return entity.distance
}
