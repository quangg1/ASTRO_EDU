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
  if (direct) return direct
  const pid = String(entity.parentId || '').trim()
  if (!pid) return null
  // Ưu tiên suy trực tiếp từ id chuẩn `planet-*` để không phụ thuộc label/name đã localize.
  if (pid.startsWith('planet-')) {
    const key = pid.slice('planet-'.length).toLowerCase()
    const bySlug: Record<string, string> = {
      mercury: 'Mercury',
      venus: 'Venus',
      earth: 'Earth',
      mars: 'Mars',
      jupiter: 'Jupiter',
      saturn: 'Saturn',
      uranus: 'Uranus',
      neptune: 'Neptune',
    }
    if (bySlug[key]) return bySlug[key]
  }
  const cat = getNasaCatalogItemById(pid)
  const n = String(cat?.linkedPlanetName || cat?.name || '').trim()
  if (!n && typeof console !== 'undefined') {
    console.warn(`[showcase-orbit] unresolved parent for ${String(entity.id || 'unknown')} (parentId=${pid})`)
  }
  return n || null
}
