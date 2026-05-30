import { getApiPathBase } from '@/lib/apiConfig'
import { getToken } from '@/features/auth/public'

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
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch(`${API}/catalog`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
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
  const token = getToken()
  if (!token) return { ok: false, error: 'Chưa đăng nhập' }
  try {
    const res = await fetch(`${API}/unlock`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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
