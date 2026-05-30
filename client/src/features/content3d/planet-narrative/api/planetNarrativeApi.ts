import { getApiPathBase } from '@/lib/apiConfig'
import type { PlanetNarrativeBundle } from '@/features/content3d/narrative/types'

const API = `${getApiPathBase()}/planet-narratives`

type ApiPayload = PlanetNarrativeBundle & {
  /** @deprecated legacy key */
  stages?: PlanetNarrativeBundle['beats']
}

function normalizeBundle(raw: ApiPayload | null, entityId: string): PlanetNarrativeBundle | null {
  if (!raw) return null
  const beats = Array.isArray(raw.beats) && raw.beats.length > 0
    ? raw.beats
    : Array.isArray(raw.stages)
      ? raw.stages
      : []
  if (beats.length === 0) return null
  return {
    entityId: raw.entityId || entityId,
    kind: raw.kind ?? 'generic',
    beats,
    sites: Array.isArray(raw.sites) ? raw.sites : [],
    panelSchema: raw.panelSchema ?? undefined,
    published: raw.published !== false,
    linkedLessonIds: Array.isArray(raw.linkedLessonIds)
      ? [...new Set(raw.linkedLessonIds.map((x) => String(x || '').trim()).filter(Boolean))]
      : [],
    linkedConceptIds: Array.isArray(raw.linkedConceptIds)
      ? [...new Set(raw.linkedConceptIds.map((x) => String(x || '').trim()).filter(Boolean))]
      : [],
  }
}

export async function fetchPlanetNarrative(entityId: string): Promise<{
  data: PlanetNarrativeBundle | null
  source: 'db' | 'preset'
}> {
  try {
    const res = await fetch(`${API}/${encodeURIComponent(entityId)}`, { cache: 'no-store' })
    const json = await res.json()
    if (!json.success) return { data: null, source: 'preset' }
    const data = normalizeBundle(json.data, entityId)
    return { data, source: json.source === 'db' && data ? 'db' : 'preset' }
  } catch {
    return { data: null, source: 'preset' }
  }
}

export async function fetchEditorPlanetNarrative(
  token: string,
  entityId: string,
): Promise<{ data: PlanetNarrativeBundle | null; source: 'db' | 'preset' }> {
  try {
    const res = await fetch(`${API}/editor/${encodeURIComponent(entityId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (!json.success) return { data: null, source: 'preset' }
    const data = normalizeBundle(json.data, entityId)
    return { data, source: json.source === 'db' && data ? 'db' : 'preset' }
  } catch {
    return { data: null, source: 'preset' }
  }
}

export async function savePlanetNarrative(
  token: string,
  bundle: PlanetNarrativeBundle,
): Promise<{ ok: boolean; data?: PlanetNarrativeBundle; error?: string }> {
  try {
    const res = await fetch(`${API}/editor`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...bundle,
        stages: bundle.beats,
      }),
    })
    const json = await res.json()
    if (json.success && json.data) {
      const data = normalizeBundle(json.data, bundle.entityId)
      return { ok: true, data: data ?? bundle }
    }
    return { ok: false, error: json.error || 'Lưu thất bại' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi mạng' }
  }
}
