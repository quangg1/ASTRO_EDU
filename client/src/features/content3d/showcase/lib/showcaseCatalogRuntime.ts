/**
 * NASA Eyes–style showcase: catalog, stories, quỹ đạo 3D.
 * Runtime source of truth: API `/api/showcase-catalog` (Mongo).
 */

export type NasaCatalogItem = {
  id: string
  name: string
  group: 'planets_moons' | 'dwarf_asteroids' | 'comets' | 'spacecraft'
  linkedPlanetName?: string
  texturePath?: string
}

export type NasaStory = {
  id: string
  title: string
  subtitle: string
  detail: string
  targetPlanetName: string
}

/** 3D showcase layer — positions updated in ShowcaseEntityLayer. */
export type ShowcaseOrbitEntity = {
  id: string
  name: string
  horizonsId?: string
  parentId?: string
  orbitAround?: string
  radiusKm?: number
  massKg?: number
  rotRateRadS?: number
  vectorAu?: { x: number; y: number; z: number; vx?: number; vy?: number; vz?: number }
  vectorSim?: { x: number; y: number; z: number }
  orbitalElements?: {
    a?: number
    e?: number
    i?: number
    om?: number
    w?: number
    m?: number
    periodDays?: number
  }
  parentPlanetName?: string
  parentShowcaseEntityId?: string
  horizonsCommand?: string
  horizonsCenter?: string
  distance: number
  period: number
  size: number
  color: string
  orbitColor: string
  phaseDeg?: number
  inclinationDeg?: number
  ascendingNodeDeg?: number
  orbitEccentricity?: number
  periodDays?: number
  semiMajorAxisAu?: number
  orbitSource?: 'jpl-horizons'
  texturePath?: string
  /** Diffuse / albedo từ CMS (HTTPS hoặc /files/*). */
  remoteTextureUrl?: string
  remoteNormalMapUrl?: string
  remoteSpecularMapUrl?: string
  remoteCloudMapUrl?: string
  /** glTF/glb từ CMS — ưu tiên hơn modelPath tĩnh. */
  remoteModelUrl?: string
  modelPath?: string
  modelScale?: number
  modelRotationDeg?: [number, number, number]
}

export type ShowcaseCatalogBundleDTO = {
  stories: NasaStory[]
  catalog: NasaCatalogItem[]
  orbits: ShowcaseOrbitEntity[]
}

/** Mutable — thay nội dung khi hydrate từ API (giữ cùng reference để import cũ vẫn hoạt động). */
export const NASA_SHOWCASE_STORIES: NasaStory[] = []
export const NASA_SHOWCASE_ITEMS: NasaCatalogItem[] = []
export const SHOWCASE_ORBIT_ENTITIES: ShowcaseOrbitEntity[] = []

/**
 * Ghi đè catalog runtime từ API. Chỉ thay mảng khi payload có phần tử tương ứng.
 * Gọi xong nên bump UI (vd. `useShowcaseCatalogGen`) để useMemo thấy thay đổi.
 */
export function hydrateShowcaseCatalogBundle(data: Partial<ShowcaseCatalogBundleDTO>) {
  if (Array.isArray(data.stories) && data.stories.length > 0) {
    NASA_SHOWCASE_STORIES.length = 0
    NASA_SHOWCASE_STORIES.push(...data.stories)
  }
  if (Array.isArray(data.catalog) && data.catalog.length > 0) {
    NASA_SHOWCASE_ITEMS.length = 0
    NASA_SHOWCASE_ITEMS.push(...data.catalog)
  }
  if (Array.isArray(data.orbits) && data.orbits.length > 0) {
    SHOWCASE_ORBIT_ENTITIES.length = 0
    SHOWCASE_ORBIT_ENTITIES.push(...data.orbits)
  }
}

export function getShowcaseOrbitEntityById(id: string): ShowcaseOrbitEntity | undefined {
  return SHOWCASE_ORBIT_ENTITIES.find((e) => e.id === id)
}

export function getNasaCatalogItemById(id: string): NasaCatalogItem | undefined {
  return NASA_SHOWCASE_ITEMS.find((i) => i.id === id)
}

/**
 * Tên hành tinh trong `planetsData` (vd. "Jupiter") — dùng khi orbit chỉ có `parentId` (planet-jupiter)
 * mà không có `parentPlanetName`, vì mesh hành tinh không nằm trong `groupsRef` của showcase layer.
 */
export function resolveShowcaseOrbitParentPlanetName(entity: ShowcaseOrbitEntity): string | null {
  const direct = String(entity.parentPlanetName || '').trim()
  const canonicalByName: Record<string, string> = {
    mercury: 'Mercury',
    venus: 'Venus',
    earth: 'Earth',
    mars: 'Mars',
    jupiter: 'Jupiter',
    saturn: 'Saturn',
    uranus: 'Uranus',
    neptune: 'Neptune',
  }
  const normalizePlanetKey = (s: string): string => s.toLowerCase().replace(/[\s_-]+/g, '')
  const normalizedDirect = normalizePlanetKey(direct)
  if (canonicalByName[normalizedDirect]) return canonicalByName[normalizedDirect]
  if (direct) return direct
  const pid = String(entity.parentId || '').trim()
  if (!pid) return null
  // Ưu tiên suy trực tiếp từ id chuẩn `planet-*`/`planet_*` và alias NAIF ID.
  const normalizedPid = pid.toLowerCase().replace(/[\s]+/g, '')
  const keyVariants = [
    normalizedPid,
    normalizedPid.replace(/^planet[-_]/, ''),
    normalizedPid.replace(/^planet/, ''),
  ].map((x) => normalizePlanetKey(x))
  const naifAliases: Record<string, string> = {
    '199': 'Mercury',
    '299': 'Venus',
    '399': 'Earth',
    '499': 'Mars',
    '599': 'Jupiter',
    '699': 'Saturn',
    '799': 'Uranus',
    '899': 'Neptune',
  }
  for (const key of keyVariants) {
    if (canonicalByName[key]) return canonicalByName[key]
    if (naifAliases[key]) return naifAliases[key]
  }
  const cat = getNasaCatalogItemById(pid)
  const n = String(cat?.linkedPlanetName || cat?.name || '').trim()
  const normalizedCatalog = normalizePlanetKey(n)
  if (canonicalByName[normalizedCatalog]) return canonicalByName[normalizedCatalog]
  if (!n && typeof console !== 'undefined') {
    console.warn(`[showcase-orbit] unresolved parent for ${String(entity.id || 'unknown')} (parentId=${pid})`)
  }
  return n || null
}

/** Vệ tinh / entity con: quỹ đạo quanh hành tinh cha hoặc entity showcase khác. */
export function isShowcaseSatelliteEntity(entity: ShowcaseOrbitEntity): boolean {
  return Boolean(
    resolveShowcaseOrbitParentPlanetName(entity) ||
      String(entity.parentShowcaseEntityId || '').trim() ||
      (String(entity.parentId || '').trim() &&
        !String(entity.parentId || '').trim().startsWith('planet-')),
  )
}

/** ~1 ngày quỹ đạo thật → vài giây trong scene (vệ tinh). */
const SCENE_SECONDS_PER_ORBIT_DAY = 6

function isCatalogScenePeriod(value: number): boolean {
  return Number.isFinite(value) && value >= 2 && value <= 120
}

/** Chu kỳ quỹ đạo trong scene (giây cho một vòng) — khớp `ShowcaseEntityLayer`. */
export function resolveShowcaseOrbitPeriodSeconds(entity: ShowcaseOrbitEntity): number {
  const catalogPeriod = Number(entity.period ?? 0)
  const periodDays = Number(entity.orbitalElements?.periodDays ?? entity.periodDays ?? 0)
  const isSat = isShowcaseSatelliteEntity(entity)

  if (isSat) {
    if (isCatalogScenePeriod(catalogPeriod)) return catalogPeriod
    if (periodDays > 0 && periodDays < 400) {
      return Math.min(90, Math.max(3, periodDays * SCENE_SECONDS_PER_ORBIT_DAY))
    }
    return Math.min(90, Math.max(3, catalogPeriod > 0 ? catalogPeriod : 6))
  }

  if (periodDays > 365) {
    return Math.min(180, Math.max(24, periodDays * 0.012))
  }
  if (periodDays > 0) {
    return Math.min(120, Math.max(8, periodDays))
  }
  return Math.max(0.5, catalogPeriod > 0 ? catalogPeriod : 1)
}

/** Liệt kê vệ tinh / entity con quanh một hành tinh (theo `parentPlanetName`). */
export function listShowcaseSatellitesForPlanet(
  entities: ShowcaseOrbitEntity[],
  planetName: string,
): ShowcaseOrbitEntity[] {
  const key = String(planetName || '').trim().toLowerCase()
  if (!key) return []
  return entities
    .filter((e) => {
      if (String(e.id || '').startsWith('planet-')) return false
      const host = resolveShowcaseOrbitParentPlanetName(e)
      return host && host.toLowerCase() === key
    })
    .sort((a, b) => (a.distance || 0) - (b.distance || 0) || a.name.localeCompare(b.name))
}

/** Hành tinh “cha” để hiện danh sách vệ tinh trên panel Explore. */
export function resolveShowcaseHostPlanetName(
  item: { id?: string; name?: string; linkedPlanetName?: string } | null,
  orbit: ShowcaseOrbitEntity | null,
): string | null {
  if (orbit) {
    const parent = resolveShowcaseOrbitParentPlanetName(orbit)
    if (parent) return parent
  }
  const linked = String(item?.linkedPlanetName || '').trim()
  if (linked) return linked
  const id = String(item?.id || '').trim()
  if (id.startsWith('planet-')) return String(item?.name || '').trim() || null
  return null
}

/** Chu kỳ tự quay quanh trục (giây / vòng) — tách khỏi chu kỳ quỹ đạo. */
export function resolveShowcaseEntitySpinPeriod(entity: ShowcaseOrbitEntity): number {
  const rot = Number(entity.rotRateRadS ?? 0)
  if (Number.isFinite(rot) && rot > 0) return (2 * Math.PI) / rot
  const orbitSec = resolveShowcaseOrbitPeriodSeconds(entity)
  return Math.min(48, Math.max(4, orbitSec * 0.28))
}
