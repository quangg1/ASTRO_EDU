import { getApiPathBase } from '@/lib/apiConfig'
import type { LearnerTierPublic } from '@/features/rewards/public'
import type { LearnerProfile } from '@/features/users/api/learnerProfileApi'

const API = `${getApiPathBase()}/users`

export interface PublicUserProfile {
  id: string
  displayName: string
  avatar: string | null
  equippedOverlayUrl: string | null
  role: 'student' | 'teacher' | 'moderator' | 'admin' | string
  memberSince: string | null
  learnerTier: LearnerTierPublic
  totalGemsEarned: number
  learnerProfile: LearnerProfile | null
  stats: {
    postCount: number
    commentCount: number
  }
}

export async function fetchPublicUserProfile(userId: string): Promise<PublicUserProfile | null> {
  const id = String(userId || '').trim()
  if (!id) return null
  try {
    const res = await fetch(`${API}/${encodeURIComponent(id)}/public`, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok || !data?.success || !data?.data) return null
    return data.data as PublicUserProfile
  } catch {
    return null
  }
}
