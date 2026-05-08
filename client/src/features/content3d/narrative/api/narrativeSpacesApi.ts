import { getApiPathBase } from '@/lib/apiConfig'
import type { NarrativeSpace } from '@/features/content3d/narrative/types'

const base = () => getApiPathBase()

export interface NarrativeSpaceDocument extends NarrativeSpace {
  published?: boolean
  updatedAt?: string
  createdAt?: string
}

export async function fetchEditorNarrativeSpace(
  token: string,
  slug: string,
): Promise<NarrativeSpaceDocument | null> {
  const res = await fetch(`${base()}/narrative-spaces/${encodeURIComponent(slug)}/editor`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = await res.json().catch(() => null)
  if (!json?.success) return null
  return (json.data || null) as NarrativeSpaceDocument | null
}

export async function saveDraftNarrativeSpace(
  token: string,
  slug: string,
  payload: Partial<NarrativeSpaceDocument>,
): Promise<{ ok: boolean; data?: NarrativeSpaceDocument; error?: string }> {
  try {
    const res = await fetch(`${base()}/narrative-spaces/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.success) {
      return { ok: false, error: json?.error || `HTTP ${res.status}` }
    }
    return { ok: true, data: json.data as NarrativeSpaceDocument }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export async function publishNarrativeSpace(
  token: string,
  slug: string,
  published: boolean,
): Promise<{ ok: boolean; data?: NarrativeSpaceDocument; error?: string }> {
  try {
    const res = await fetch(`${base()}/narrative-spaces/${encodeURIComponent(slug)}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ published }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.success) {
      return { ok: false, error: json?.error || `HTTP ${res.status}` }
    }
    return { ok: true, data: json.data as NarrativeSpaceDocument }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
