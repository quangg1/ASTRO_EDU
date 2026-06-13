import { getApiPathBase } from '@/lib/apiConfig'
import { hasClientSession } from '@/features/auth/public'
import { apiFetch } from '@/lib/apiRequestInit'

const API = `${getApiPathBase()}/showcase`

export type ShowcaseContentType = 'story' | 'orbit'

export type ShowcaseCatalogEntryWithUnlocks = {
  id: string
  storyUnlocked?: boolean
  orbitUnlocked?: boolean
  storyCost?: number
  orbitCost?: number
  [key: string]: unknown
}

export async function fetchShowcaseGamificationCatalog(): Promise<{
  catalog: ShowcaseCatalogEntryWithUnlocks[]
} | null> {
  if (!hasClientSession()) return null
  try {
    const res = await apiFetch(`${API}/catalog`)
    const data = await res.json()
    if (!data?.success || !data?.data?.catalog) return null
    return { catalog: data.data.catalog as ShowcaseCatalogEntryWithUnlocks[] }
  } catch {
    return null
  }
}

export async function postShowcaseUnlock(
  entityId: string,
  contentType: ShowcaseContentType,
): Promise<{ ok: boolean; error?: string; gemBalance?: number }> {
  if (!hasClientSession()) return { ok: false, error: 'Chưa đăng nhập' }
  try {
    const res = await apiFetch(`${API}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ entityId, contentType }),
    })
    const data = await res.json().catch(() => ({}))
    if (data?.success && data?.data) {
      return { ok: true, gemBalance: Number(data.data.gemBalance) }
    }
    if (res.status === 402) return { ok: false, error: 'Không đủ gem' }
    return { ok: false, error: data?.error || data?.code || 'Unlock thất bại' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}
