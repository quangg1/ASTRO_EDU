import { getApiPathBase } from '@/lib/apiConfig'

const API = `${getApiPathBase()}/showcase-entities`

export type ShowcasePanelBlockDTO = {
  id: string
  type: 'text' | 'image' | 'chart'
  title?: string
  body?: string
  imageUrl?: string
  chartKind?: string
  points?: Array<{ label: string; value: number }>
  style?: {
    variant?: 'glass' | 'solid' | 'minimal'
    align?: 'left' | 'center' | 'right'
    bgColor?: string
    borderColor?: string
    textColor?: string
    accentColor?: string
  }
}

export type ShowcasePanelConfigDTO = {
  stateBadge?: string
  tabs?: Array<'overview' | 'physical' | 'sky'>
  tabLabels?: Partial<Record<'overview' | 'physical' | 'sky', string>>
  overviewBlocks?: ShowcasePanelBlockDTO[]
  physicalBlocks?: ShowcasePanelBlockDTO[]
  skyBlocks?: ShowcasePanelBlockDTO[]
  conceptTagIds?: string[]
  lessonIds?: string[]
} | null

export type ShowcaseEntityContentDTO = {
  entityId: string
  nameVi: string
  museumBlurbVi: string
  /** Giữ để tương thích API; nên dùng diffuseMapUrl — diffuse hiệu dụng = diffuseMapUrl || textureUrl. */
  textureUrl: string
  diffuseMapUrl: string
  normalMapUrl: string
  specularMapUrl: string
  cloudMapUrl: string
  modelUrl: string
  horizonsId: string
  orbitAround: string
  parentId: string
  /** Tên hành tinh trong mô phỏng (Mercury…Neptune) — neo mesh vệ tinh; Studio chọn dropdown. */
  parentPlanetName?: string
  radiusKm: number
  orbitColor?: string
  orbitalElements: {
    a: number
    e: number
    i: number
    om: number
    w: number
    m: number
    periodDays: number
  } | null
  horizonsCommand: string
  horizonsCenter: string
  published: boolean
  panelConfig?: ShowcasePanelConfigDTO
}

export async function fetchPublicShowcaseEntityContents(): Promise<ShowcaseEntityContentDTO[]> {
  try {
    const res = await fetch(API, { cache: 'no-store' })
    const data = await res.json()
    if (!data.success || !Array.isArray(data.data?.items)) return []
    return data.data.items as ShowcaseEntityContentDTO[]
  } catch {
    return []
  }
}

export type ShowcaseEditorCatalogItem = {
  id: string
  name: string
  group: 'planets_moons' | 'dwarf_asteroids' | 'comets' | 'spacecraft'
  linkedPlanetName?: string
  texturePath?: string
}

export type ShowcaseEditorFetchResult = {
  items: ShowcaseEntityContentDTO[]
  catalog: ShowcaseEditorCatalogItem[]
}

export async function fetchEditorShowcaseEntityContents(
  token: string,
): Promise<ShowcaseEditorFetchResult | null> {
  try {
    const res = await fetch(`${API}/editor`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!data.success || !Array.isArray(data.data?.items)) return null
    return {
      items: data.data.items as ShowcaseEntityContentDTO[],
      catalog: Array.isArray(data.data?.catalog)
        ? (data.data.catalog as ShowcaseEditorCatalogItem[])
        : [],
    }
  } catch {
    return null
  }
}

export type CreateShowcaseEntityInput = {
  entityId: string
  name: string
  group: ShowcaseEditorCatalogItem['group']
  parentId?: string
  linkedPlanetName?: string
}

export async function createShowcaseEntity(
  token: string,
  input: CreateShowcaseEntityInput,
): Promise<{
  ok: boolean
  items?: ShowcaseEntityContentDTO[]
  entityId?: string
  error?: string
}> {
  try {
    const res = await fetch(`${API}/editor`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })
    const data = await res.json()
    if (data.success && Array.isArray(data.data?.items)) {
      return {
        ok: true,
        items: data.data.items as ShowcaseEntityContentDTO[],
        entityId: String(data.data?.entityId || input.entityId),
      }
    }
    return { ok: false, error: data.error || 'Create failed' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function deleteShowcaseEntity(
  token: string,
  entityId: string,
  opts?: { cascade?: boolean },
): Promise<{
  ok: boolean
  items?: ShowcaseEntityContentDTO[]
  removedIds?: string[]
  childIds?: string[]
  error?: string
}> {
  try {
    const q = opts?.cascade ? '?cascade=1' : ''
    const res = await fetch(`${API}/editor/${encodeURIComponent(entityId)}${q}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.success && Array.isArray(data.data?.items)) {
      return {
        ok: true,
        items: data.data.items as ShowcaseEntityContentDTO[],
        removedIds: Array.isArray(data.data?.removedIds) ? data.data.removedIds : undefined,
      }
    }
    return {
      ok: false,
      error: data.error || 'Delete failed',
      childIds: Array.isArray(data.childIds) ? data.childIds : undefined,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function saveShowcaseEntityContents(
  token: string,
  items: ShowcaseEntityContentDTO[],
): Promise<{ ok: boolean; items?: ShowcaseEntityContentDTO[]; invalidEntityIds?: string[]; error?: string }> {
  try {
    const res = await fetch(`${API}/editor`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    })
    const data = await res.json()
    if (data.success && Array.isArray(data.data?.items)) {
      return {
        ok: true,
        items: data.data.items as ShowcaseEntityContentDTO[],
        invalidEntityIds: Array.isArray(data.data?.invalidEntityIds) ? data.data.invalidEntityIds : [],
      }
    }
    return { ok: false, error: data.error || 'Save failed' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}
