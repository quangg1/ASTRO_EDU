import { getToken } from '@/features/auth/public'
import { getApiPathBase } from '@/lib/apiConfig'
import { forUserFacingError } from '@/lib/sanitizeUserError'
import { userMessages } from '@/lib/userMessages'

const BASE = getApiPathBase()

function authHeaders(): HeadersInit {
  const token = getToken()
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`
  return h
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
  const res = await fetch(`${BASE}/promotions/active?limit=${limit}`, { cache: 'no-store' })
  const data = await res.json()
  if (data?.success && Array.isArray(data.data)) return data.data as ActivePromoCampaign[]
  return []
}

export async function fetchCoursePromoBanner(courseId: string): Promise<CoursePromoBanner | null> {
  const res = await fetch(`${BASE}/promotions/course/${encodeURIComponent(courseId)}/banner`, {
    cache: 'no-store',
  })
  const data = await res.json()
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
  const res = await fetch(`${BASE}/promotions/validate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ courseId: params.courseId, code: params.code }),
  })
  const data = await res.json()
  if (data?.success && data.data) {
    return { success: true, data: data.data as ValidatedPromo }
  }
  return {
    success: false,
    error: forUserFacingError(data?.error, userMessages.loadDataFailed),
    code: data?.code,
  }
}
