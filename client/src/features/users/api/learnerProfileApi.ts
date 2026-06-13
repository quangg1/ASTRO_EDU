import { getApiPathBase } from '@/lib/apiConfig'
import { apiFetchInit } from '@/lib/apiClientHeaders'
import { hasClientSession } from '@/features/auth/public'

const API = `${getApiPathBase()}/users`

export type EducationEntry = {
  school: string
  degree: string
  field: string
  yearEnd: number | null
}

export type LearnerProfile = {
  bio: string
  location: string
  education: EducationEntry[]
  interests: string[]
  isPublic: boolean
  updatedAt?: string | null
}

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

export async function fetchMyLearnerProfile(): Promise<LearnerProfile | null> {
  if (!hasClientSession()) return null
  try {
    const res = await fetch(`${API}/me/learner-profile`, apiFetchInit({ headers: authHeaders(), cache: 'no-store' }))
    const data = await res.json()
    if (!res.ok || !data?.success) return null
    return data.data as LearnerProfile
  } catch {
    return null
  }
}

export async function updateMyLearnerProfile(
  patch: Partial<LearnerProfile>,
): Promise<{ success: boolean; data?: LearnerProfile; error?: string }> {
  if (!hasClientSession()) return { success: false, error: 'Chưa đăng nhập' }
  const res = await fetch(`${API}/me/learner-profile`, apiFetchInit({
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(patch),
  }))
  const data = await res.json()
  if (!res.ok || !data?.success) {
    return { success: false, error: data?.error || 'Lưu thất bại' }
  }
  return { success: true, data: data.data as LearnerProfile }
}
