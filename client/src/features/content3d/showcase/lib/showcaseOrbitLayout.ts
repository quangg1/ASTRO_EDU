import * as THREE from 'three'
import { hasUsableOrbitalElements } from '@/features/content3d/showcase/lib/mergeShowcaseCatalog'
import {
  resolveShowcaseOrbitParentPlanetName,
  type ShowcaseOrbitEntity,
} from '@/features/content3d/showcase/lib/showcaseCatalogRuntime'
import { planetsData, sunData, type PlanetData } from '@/features/content3d/showcase/lib/solarSystemData'

const AU_IN_KM = 149_597_870.7
export const SHOWCASE_SCENE_RADIUS = 320
const SATELLITE_ORBIT_SCENE_PER_PARENT_RADIUS = 0.052
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

export type SatelliteOrbitLayout = { radius: number; phaseRad: number }

function parentSceneRadius(planetName: string): number {
  const p = planetsData.find((x) => x.name === planetName)
  return Math.max(0.2, p?.radius ?? 0.75)
}

/** Scale AU → scene chỉ theo 8 hành tinh — không bị comet/dwarf kéo co hệ trong. */
export function resolveHeliocentricAuToSceneScale(entities: ShowcaseOrbitEntity[]): number {
  let maxPlanetAu = 30
  for (const e of entities) {
    if (!String(e.id || '').startsWith('planet-')) continue
    const a = Number(e.semiMajorAxisAu ?? e.orbitalElements?.a ?? 0)
    if (Number.isFinite(a) && a > 0 && a < 55) maxPlanetAu = Math.max(maxPlanetAu, a)
  }
  return THREE.MathUtils.clamp(SHOWCASE_SCENE_RADIUS / maxPlanetAu, 14, 34)
}

export function resolvePlanetHeliocentricDistance(
  planet: PlanetData,
  orbitEntity: ShowcaseOrbitEntity | undefined,
  auScale: number,
): number {
  const sunR = sunData.radius
  const minDist = sunR * 4.75
  const catalog = planet.distance
  const aAu = Number(orbitEntity?.semiMajorAxisAu ?? orbitEntity?.orbitalElements?.a ?? 0)
  let fromAu = Number.isFinite(aAu) && aAu > 0 && aAu < 55 ? aAu * auScale * 1.12 : 0
  if (aAu > 0 && aAu < 2.4) {
    fromAu = Math.max(fromAu, sunR * 3.5 + Math.log1p(aAu) * auScale * 7.2)
  }
  return Math.max(catalog, fromAu, minDist)
}

function satelliteRadiusFromCatalog(
  entity: ShowcaseOrbitEntity,
  pr: number,
  bodyR: number,
  index: number,
  count: number,
): number {
  const minOrbit = pr + bodyR * 1.08
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
export function buildSatelliteOrbitLayout(entities: ShowcaseOrbitEntity[]): Map<string, SatelliteOrbitLayout> {
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
      const bodyR = Math.max(0.1, Number(entity.size || 0.05) * 2.55)
      const radius = satelliteRadiusFromCatalog(entity, pr, bodyR, index, count)
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
): number {
  const laid = layout?.get(entity.id)
  if (laid) return laid.radius

  const parentName = resolveShowcaseOrbitParentPlanetName(entity)
  const pr = parentName ? parentSceneRadius(parentName) : 0.75
  const bodyR = Math.max(0.1, Number(entity.size || 0.05) * 2.55)
  return satelliteRadiusFromCatalog(entity, pr, bodyR, 0, 1)
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
