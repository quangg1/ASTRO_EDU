import { getApiPathBase } from '@/lib/apiConfig'

const API = `${getApiPathBase()}/showcase-orbits`

export type ShowcaseJplOrbitDTO = {
  id: string
  source: 'jpl-horizons'
  horizonsId?: string
  orbitAround?: string
  parentId?: string
  radiusKm?: number
  massKg?: number
  rotRateRadS?: number
  vectorAu?: { x: number; y: number; z: number; vx: number; vy: number; vz: number }
  vectorSim?: { x: number; y: number; z: number }
  orbitEccentricity: number
  inclinationDeg: number
  ascendingNodeDeg: number
  phaseDeg: number
  period: number
  periodDays?: number | null
  semiMajorAxisAu?: number | null
  orbitalElements?: {
    a: number
    e: number
    i: number
    om: number
    w: number
    m: number
    periodDays: number
  } | null
}

export async function fetchJplShowcaseOrbits(whenIso?: string): Promise<ShowcaseJplOrbitDTO[]> {
  try {
    const params = new URLSearchParams()
    params.set('includeParents', '1')
    if (whenIso) params.set('when', whenIso)
    const q = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${API}/jpl${q}`, { cache: 'no-store' })
    const data = await res.json()
    if (!data.success || !Array.isArray(data.data?.items)) return []
    return data.data.items as ShowcaseJplOrbitDTO[]
  } catch {
    return []
  }
}

export async function syncShowcaseOrbitEntityFromJpl(
  token: string,
  entityId: string,
  whenIso?: string,
): Promise<{ ok: boolean; item?: ShowcaseJplOrbitDTO; error?: string }> {
  try {
    const res = await fetch(`${API}/sync-entity`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entityId, when: whenIso || undefined }),
    })
    const data = await res.json()
    if (data.success && data.data?.item) {
      return { ok: true, item: data.data.item as ShowcaseJplOrbitDTO }
    }
    return { ok: false, error: data.error || 'Sync failed' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}
