import { getToken } from '@/features/auth/public'
import { getApiPathBase } from '@/lib/apiConfig'
import { apiClientHeaders, apiFetchInit } from '@/lib/apiClientHeaders'
import { forUserFacingError } from '@/lib/sanitizeUserError'
import { userMessages } from '@/lib/userMessages'

function apiBase(): string {
  return getApiPathBase()
}

async function promoFetch(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(`${apiBase()}${path}`, apiFetchInit({ cache: 'no-store', ...init }))
  } catch {
    return null
  }
}

function authHeaders(): HeadersInit {
  return apiClientHeaders()
}

export interface CoursePromoBanner {
  code: string
  promoCodeId: string
  labelVi: string
  eventKey: string | null
  bannerTitleVi: string
  bannerBodyVi: string
  bannerAccentColor: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  discountLabelVi: string
  endsAt: string | null
}

export interface PromoCampaignCourse {
  id: string
  title: string
  slug: string
  href: string
  checkoutHref: string
}

export interface ActivePromoCampaign extends CoursePromoBanner {
  appliesToAll: boolean
  courses: PromoCampaignCourse[]
  primaryHref: string
  primaryCheckoutHref: string
}

export async function fetchActivePromotions(limit = 5): Promise<ActivePromoCampaign[]> {
  const res = await promoFetch(`/promotions/active?limit=${limit}`)
  if (!res?.ok) return []
  const data = await res.json().catch(() => null)
  if (data?.success && Array.isArray(data.data)) return data.data as ActivePromoCampaign[]
  return []
}

export async function fetchCoursePromoBanner(courseId: string): Promise<CoursePromoBanner | null> {
  const res = await promoFetch(`/promotions/course/${encodeURIComponent(courseId)}/banner`)
  if (!res?.ok) return null
  const data = await res.json().catch(() => null)
  if (data?.success && data.data) return data.data as CoursePromoBanner
  return null
}

export interface ValidatedPromo {
  code: string
  labelVi: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  discountAmount: number
  finalAmount: number
  discountPct: number
  currency: string
}

export async function validatePromoCode(params: {
  courseId: string
  code: string
}): Promise<{ success: true; data: ValidatedPromo } | { success: false; error: string; code?: string }> {
  const res = await promoFetch(`/promotions/validate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ courseId: params.courseId, code: params.code }),
  })
  if (!res) {
    return { success: false, error: userMessages.loadDataFailed }
  }
  const data = await res.json().catch(() => ({}))
  if (data?.success && data.data) {
    return { success: true, data: data.data as ValidatedPromo }
  }
  return {
    success: false,
    error: forUserFacingError(data?.error, userMessages.loadDataFailed),
    code: data?.code,
  }
}
