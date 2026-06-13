import { getApiPathBase } from '@/lib/apiConfig'
import { hasClientSession } from '@/features/auth/public'
import { apiFetch } from '@/lib/apiRequestInit'
import type { ExplorePassportApiPayload } from '@/features/explore/lib/explorePassportTypes'

export async function fetchExplorePassport(): Promise<ExplorePassportApiPayload | null> {
  if (!hasClientSession()) return null
  try {
    const res = await apiFetch(`${getApiPathBase()}/explore/passport`)
    const data = await res.json()
    if (!data?.success || !data?.data) return null
    return data.data as ExplorePassportApiPayload
  } catch {
    return null
  }
}
