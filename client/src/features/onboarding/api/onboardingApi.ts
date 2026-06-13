import { hasClientSession } from '@/features/auth/public'
import { getApiPathBase } from '@/lib/apiConfig'
import { apiClientHeaders, apiFetchInit } from '@/lib/apiClientHeaders'

const BASE = getApiPathBase()

function authHeaders(): HeadersInit {
  return apiClientHeaders()
}

export type OnboardingIntentId = 'learn_path' | 'explore_3d' | 'stargazing' | 'community' | 'mixed'
export type OnboardingExperienceId = 'beginner' | 'some' | 'advanced'

export interface OnboardingTopicOption {
  id: string
  labelVi: string
  descriptionVi: string
}

export interface OnboardingRecommendation {
  kind: string
  href: string
  labelVi: string
  descriptionVi?: string
}

export interface OnboardingProfile {
  completed: boolean
  skipped?: boolean
  completedAt?: string | null
  primaryIntent?: OnboardingIntentId | null
  topicIds?: string[]
  experienceLevel?: OnboardingExperienceId | null
  preferredDepth?: string | null
  primaryTopicId?: string | null
  primaryHref?: string
  starterLessonId?: string | null
  recommendations?: OnboardingRecommendation[]
}

export interface OnboardingGemReward {
  gemsEarned: number
  newBalance: number
  label: string
}

export interface OnboardingOptions {
  intents: { id: OnboardingIntentId; labelVi: string }[]
  experienceLevels: { id: OnboardingExperienceId; labelVi: string; preferredDepth: string }[]
  topics: OnboardingTopicOption[]
  maxTopicPicks: number
}

export async function fetchOnboardingOptions(): Promise<OnboardingOptions | null> {
  const res = await fetch(`${BASE}/onboarding/options`, apiFetchInit({ cache: 'no-store' }))
  const json = await res.json()
  if (json.success && json.data) return json.data
  return null
}

export async function fetchOnboardingStatus(): Promise<{
  completed: boolean
  profile: OnboardingProfile | null
} | null> {
  if (!hasClientSession()) return null
  try {
    const res = await fetch(`${BASE}/onboarding/me`, apiFetchInit({ headers: authHeaders(), cache: 'no-store' }))
    const json = await res.json()
    if (json.success && json.data) return json.data
    // Đã đăng nhập nhưng chưa có profile / API lỗi → coi như chưa onboarding
    return { completed: false, profile: null }
  } catch {
    return { completed: false, profile: null }
  }
}

export async function completeOnboarding(body: {
  primaryIntent: OnboardingIntentId
  topicIds: string[]
  experienceLevel: OnboardingExperienceId
}): Promise<{
  success: boolean
  profile?: OnboardingProfile
  gemReward?: OnboardingGemReward | null
  error?: string
}> {
  const res = await fetch(`${BASE}/onboarding/complete`, apiFetchInit({
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  }))
  const json = await res.json()
  if (json.success) {
    return {
      success: true,
      profile: json.data?.profile,
      gemReward: json.data?.gemReward ?? null,
    }
  }
  return { success: false, error: json.error || 'Không lưu được onboarding' }
}

export async function skipOnboarding(): Promise<{ success: boolean; profile?: OnboardingProfile; error?: string }> {
  const res = await fetch(`${BASE}/onboarding/skip`, apiFetchInit({
    method: 'POST',
    headers: authHeaders(),
  }))
  const json = await res.json()
  if (json.success) return { success: true, profile: json.data?.profile }
  return { success: false, error: json.error || 'Không bỏ qua được' }
}
