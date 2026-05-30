import { getAuthBase } from '@/lib/apiConfig'
import { getToken } from './authApi'

const AUTH_BASE = getAuthBase()

export interface PublicTeacherProfile {
  userId: string
  fullName: string
  headline: string
  bio: string
  organization: string
  expertise: string[]
  education: string
  yearsExperience: number | null
  website: string
  linkedin: string
  avatarUrl: string | null
  email: string | null
  verified: boolean
}

export async function fetchMyTeacherProfile(): Promise<{
  success: boolean
  profile?: PublicTeacherProfile
  error?: string
}> {
  const token = getToken()
  if (!token) return { success: false, error: 'Chưa đăng nhập' }
  const res = await fetch(`${AUTH_BASE}/auth/teacher-profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const data = await res.json()
  if (data.success && data.profile) return { success: true, profile: data.profile }
  return { success: false, error: data.error || 'Không tải được hồ sơ' }
}

export async function updateMyTeacherProfile(
  body: Partial<PublicTeacherProfile>,
): Promise<{ success: boolean; profile?: PublicTeacherProfile; error?: string }> {
  const token = getToken()
  if (!token) return { success: false, error: 'Chưa đăng nhập' }
  const res = await fetch(`${AUTH_BASE}/auth/teacher-profile/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.success && data.profile) return { success: true, profile: data.profile }
  return { success: false, error: data.error || 'Cập nhật thất bại' }
}
