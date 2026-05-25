import { getToken } from '@/features/auth/api/authApi'
import { getApiPathBase } from '@/lib/apiConfig'

const BASE = `${getApiPathBase()}/admin/promo-codes`

function authHeaders(): HeadersInit {
  const token = getToken()
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`
  return h
}

export interface PromoCodeAdmin {
  id: string
  code: string
  labelVi: string
  descriptionVi: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  courseIds: string[]
  startsAt: string | null
  endsAt: string | null
  maxRedemptions: number | null
  redemptionCount: number
  maxPerUser: number
  active: boolean
  eventKey: string | null
  bannerTitleVi: string
  bannerBodyVi: string
  bannerAccentColor: string
}

export async function fetchAdminPromoCodes(): Promise<PromoCodeAdmin[]> {
  const res = await fetch(BASE, { headers: authHeaders() })
  const data = await res.json()
  if (data?.success && Array.isArray(data.data)) return data.data as PromoCodeAdmin[]
  return []
}

export async function createAdminPromoCode(
  body: Partial<PromoCodeAdmin> & { code: string; discountType: 'percent' | 'fixed'; discountValue: number },
): Promise<{ success: boolean; data?: PromoCodeAdmin; error?: string }> {
  const res = await fetch(BASE, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) })
  const data = await res.json()
  if (data?.success) return { success: true, data: data.data }
  return { success: false, error: data?.error || 'Tạo mã thất bại' }
}

export async function patchAdminPromoCode(
  id: string,
  body: Partial<PromoCodeAdmin>,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data?.success) return { success: true }
  return { success: false, error: data?.error || 'Cập nhật thất bại' }
}

export async function deleteAdminPromoCode(id: string): Promise<boolean> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const data = await res.json()
  return Boolean(data?.success)
}
