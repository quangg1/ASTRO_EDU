import { getApiPathBase } from '@/lib/apiConfig'
import { apiFetch } from '@/lib/apiRequestInit'

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

export type SyncShowcaseOrbitFromJplInput = {
  entityId: string
  whenIso?: string
  /** Giá trị form Studio hiện tại — dùng trước khi user bấm Lưu. */
  horizonsId?: string
  orbitAround?: string
  parentId?: string
  parentPlanetName?: string
  horizonsCommand?: string
  horizonsCenter?: string
}

export async function syncShowcaseOrbitEntityFromJpl(
  entityId: string,
  whenIsoOrOpts?: string | Omit<SyncShowcaseOrbitFromJplInput, 'entityId'>,
): Promise<{ ok: boolean; item?: ShowcaseJplOrbitDTO; whenUsed?: string | null; error?: string }> {
  try {
    const opts =
      typeof whenIsoOrOpts === 'string' || whenIsoOrOpts == null
        ? { whenIso: whenIsoOrOpts || undefined }
        : whenIsoOrOpts
    const res = await apiFetch(`${API}/sync-entity`, {
      method: 'POST',
      body: JSON.stringify({
        entityId,
        when: opts.whenIso || undefined,
        horizonsId: opts.horizonsId?.trim() || undefined,
        orbitAround: opts.orbitAround?.trim() || undefined,
        parentId: opts.parentId?.trim() || undefined,
        parentPlanetName: opts.parentPlanetName?.trim() || undefined,
        horizonsCommand: opts.horizonsCommand?.trim() || undefined,
        horizonsCenter: opts.horizonsCenter?.trim() || undefined,
      }),
    })
    const data = await res.json()
    if (data.success && data.data?.item) {
      return {
        ok: true,
        item: data.data.item as ShowcaseJplOrbitDTO,
        whenUsed: data.data.whenUsed ?? null,
      }
    }
    return { ok: false, error: data.error || 'Sync failed' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}
