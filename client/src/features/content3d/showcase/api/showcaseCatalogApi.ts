import { getApiPathBase } from '@/lib/apiConfig'
import { apiFetch } from '@/lib/apiRequestInit'
import type {
  NasaCatalogItem,
  NasaStory,
  ShowcaseCatalogBundleDTO,
  ShowcaseOrbitEntity,
} from '@/features/content3d/showcase/lib/showcaseCatalogRuntime'

const API = `${getApiPathBase()}/showcase-catalog`

export async function fetchPublicShowcaseCatalogBundle(): Promise<ShowcaseCatalogBundleDTO | null> {
  try {
    const res = await fetch(API, { cache: 'no-store' })
    const data = await res.json()
    if (!data.success || data.data == null) return null
    const { stories, catalog, orbits } = data.data
    if (!Array.isArray(catalog) || !Array.isArray(orbits) || catalog.length === 0 || orbits.length === 0) {
      return null
    }
    return {
      stories: Array.isArray(stories) ? (stories as NasaStory[]) : [],
      catalog: catalog as NasaCatalogItem[],
      orbits: orbits as ShowcaseOrbitEntity[],
    }
  } catch {
    return null
  }
}

export async function fetchEditorShowcaseCatalogBundle(): Promise<(ShowcaseCatalogBundleDTO & { updatedAt?: string | null }) | null> {
  try {
    const res = await apiFetch(API)
    const data = await res.json()
    if (!data.success) return null
    if (data.data == null) return { stories: [], catalog: [], orbits: [], updatedAt: null }
    const { stories, catalog, orbits, updatedAt } = data.data
    return {
      stories: Array.isArray(stories) ? (stories as NasaStory[]) : [],
      catalog: Array.isArray(catalog) ? (catalog as NasaCatalogItem[]) : [],
      orbits: Array.isArray(orbits) ? (orbits as ShowcaseOrbitEntity[]) : [],
      updatedAt: updatedAt ?? null,
    }
  } catch {
    return null
  }
}

export async function saveShowcaseCatalogBundleEditor(
  bundle: ShowcaseCatalogBundleDTO,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch(`${API}/editor`, {
      method: 'PUT',
      body: JSON.stringify({
        stories: bundle.stories,
        catalog: bundle.catalog,
        orbits: bundle.orbits,
      }),
    })
    const data = await res.json()
    if (data.success) return { ok: true }
    return { ok: false, error: data.error || 'Save failed' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}
