import { getApiPathBase } from '@/lib/apiConfig'
import { getToken } from '@/features/auth/public'
import type { ExplorePassportApiPayload } from '@/features/explore/lib/explorePassportTypes'

export async function fetchExplorePassport(): Promise<ExplorePassportApiPayload | null> {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch(`${getApiPathBase()}/explore/passport`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const data = await res.json()
    if (!data?.success || !data?.data) return null
    return data.data as ExplorePassportApiPayload
  } catch {
    return null
  }
}
