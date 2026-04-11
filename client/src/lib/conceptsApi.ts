import { getApiPathBase } from './apiConfig'
import type { LearningConcept } from '@/data/learningPathCurriculum'

const API = `${getApiPathBase()}/concepts`

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

export async function fetchEditorConcepts(token: string): Promise<LearningConcept[] | null> {
  try {
    const res = await fetch(`${API}/editor`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.success && Array.isArray(data.data?.concepts)) return data.data.concepts as LearningConcept[]
    return null
  } catch {
    return null
  }
}

export async function saveEditorConcepts(
  token: string,
  concepts: LearningConcept[],
): Promise<{ ok: boolean; concepts?: LearningConcept[]; error?: string }> {
  try {
    const res = await fetch(`${API}/editor`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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
