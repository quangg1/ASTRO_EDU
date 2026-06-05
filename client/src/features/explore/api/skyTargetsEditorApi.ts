import { getApiPathBase } from '@/lib/apiConfig'
import type { ShowcasePanelConfigDTO } from '@/features/content3d/showcase/api/showcaseEntitiesApi'
import type { SkyTargetContentDTO } from '../lib/mergeSkyTargetContent'

const API = `${getApiPathBase()}/explore/sky-targets`

export type SkyTargetEditorCatalogRow = {
  targetId: string
  kind: string
  nameVi: string
  nameEn: string
}

export type SkyTargetEditorRow = SkyTargetContentDTO & {
  targetId: string
  published: boolean
}

export type SkyTargetEditorFetchResult = {
  items: SkyTargetEditorRow[]
  catalog: SkyTargetEditorCatalogRow[]
}

export function emptySkyTargetEditorRow(targetId: string): SkyTargetEditorRow {
  return {
    targetId,
    nameVi: '',
    museumBlurbVi: '',
    conceptHints: [],
    panelConfig: null,
    published: true,
  }
}

export async function fetchEditorSkyTargets(token: string): Promise<SkyTargetEditorFetchResult | null> {
  try {
    const res = await fetch(`${API}/editor`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!data.success) return null
    return {
      items: Array.isArray(data.data?.items) ? data.data.items : [],
      catalog: Array.isArray(data.data?.catalog) ? data.data.catalog : [],
    }
  } catch {
    return null
  }
}

export async function saveEditorSkyTargets(
  token: string,
  items: SkyTargetEditorRow[],
): Promise<{ items: SkyTargetEditorRow[]; invalidTargetIds: string[] } | null> {
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
    if (!data.success) return null
    return {
      items: Array.isArray(data.data?.items) ? data.data.items : [],
      invalidTargetIds: Array.isArray(data.data?.invalidTargetIds) ? data.data.invalidTargetIds : [],
    }
  } catch {
    return null
  }
}

export type { ShowcasePanelConfigDTO }
