import { getApiPathBase } from '@/lib/apiConfig'
import { apiFetch } from '@/lib/apiRequestInit'
import type { LearningConcept } from '@/data/learningPathCurriculum'

const API = `${getApiPathBase()}/concepts`

export type TaxonomyRegistry = Record<string, string[]>

export const FALLBACK_TAXONOMY_REGISTRY: TaxonomyRegistry = {
  astronomy: [
    'fundamentals',
    'orbital-mechanics',
    'stellar-physics',
    'galactic-cosmology',
    'observational-astronomy',
    'positional-astronomy',
  ],
  geology: ['tectonics', 'volcanology', 'stratigraphy', 'planetary-geology'],
  biology: ['evolution', 'ecology', 'paleontology'],
  physics: ['mechanics', 'thermodynamics', 'electromagnetism'],
  chemistry: ['astrochemistry', 'geochemistry', 'atmospheric-chemistry'],
}

export async function fetchPublicConcepts(): Promise<LearningConcept[]> {
  try {
    const res = await fetch(API, { cache: 'no-store' })
    const data = await res.json()
    if (data.success && Array.isArray(data.data?.concepts)) return data.data.concepts as LearningConcept[]
    return []
  } catch {
    return []
  }
}

export async function fetchEditorConcepts(): Promise<LearningConcept[] | null> {
  try {
    const res = await apiFetch(`${API}/editor`)
    const data = await res.json()
    if (data.success && Array.isArray(data.data?.concepts)) return data.data.concepts as LearningConcept[]
    return null
  } catch {
    return null
  }
}

export async function saveEditorConcepts(
  concepts: LearningConcept[],
): Promise<{ ok: boolean; concepts?: LearningConcept[]; error?: string }> {
  try {
    const res = await apiFetch(`${API}/editor`, {
      method: 'PUT',
      body: JSON.stringify({ concepts }),
    })
    const data = await res.json()
    if (data.success && Array.isArray(data.data?.concepts)) {
      return { ok: true, concepts: data.data.concepts as LearningConcept[] }
    }
    if (data.success) return { ok: true, concepts: [] }
    return { ok: false, error: data.error || 'Save failed' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function fetchTaxonomyRegistryEditor(): Promise<TaxonomyRegistry | null> {
  try {
    const res = await apiFetch(`${API}/taxonomy/editor`)
    const data = await res.json()
    if (data.success && data.data?.taxonomy && typeof data.data.taxonomy === 'object') {
      return data.data.taxonomy as TaxonomyRegistry
    }
    return null
  } catch {
    return null
  }
}

export async function saveTaxonomyRegistryEditor(
  taxonomy: TaxonomyRegistry,
): Promise<{ ok: boolean; taxonomy?: TaxonomyRegistry; error?: string }> {
  try {
    const res = await apiFetch(`${API}/taxonomy/editor`, {
      method: 'PUT',
      body: JSON.stringify({ taxonomy }),
    })
    const data = await res.json()
    if (data.success && data.data?.taxonomy && typeof data.data.taxonomy === 'object') {
      return { ok: true, taxonomy: data.data.taxonomy as TaxonomyRegistry }
    }
    return data.success ? { ok: true, taxonomy } : { ok: false, error: data.error || 'Save failed' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}
