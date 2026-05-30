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

export async function fetchEditorShowcaseEntityContents(token: string): Promise<ShowcaseEntityContentDTO[] | null> {
  try {
    const res = await fetch(`${API}/editor`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!data.success || !Array.isArray(data.data?.items)) return null
    return data.data.items as ShowcaseEntityContentDTO[]
  } catch {
    return null
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
