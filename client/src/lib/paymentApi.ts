import { getToken } from './authApi'
import { getApiPathBase } from './apiConfig'

const PAYMENT_BASE = getApiPathBase()

function authHeaders(): HeadersInit {
  const token = getToken()
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`
  return h
}

export async function createPayment(params: {
  courseId: string
  courseSlug: string
  amount: number
  currency?: string
}): Promise<{ success: boolean; paymentUrl?: string; error?: string }> {
  const res = await fetch(`${PAYMENT_BASE}/payments/create`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (data.success && data.data?.paymentUrl) {
    return { success: true, paymentUrl: data.data.paymentUrl }
  }
  return { success: false, error: data.error || 'Tạo thanh toán thất bại' }
}
