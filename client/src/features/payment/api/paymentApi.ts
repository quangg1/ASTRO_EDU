import { getToken } from '@/features/auth/public'
import { getApiPathBase } from '@/lib/apiConfig'

const PAYMENT_BASE = getApiPathBase()

function authHeaders(): HeadersInit {
  const token = getToken()
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`
  return h
}

// ────────────────────────────────────────────────────────────────────────────
// Create payment (was: lib/paymentApi.ts)
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// Orders (was: lib/paymentsApi.ts)
// ────────────────────────────────────────────────────────────────────────────

export interface Order {
  _id: string
  courseId: string
  courseSlug: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  gateway: string
  transactionId?: string | null
  txnRef: string
  createdAt: string
  paidAt?: string | null
}

export interface AdminOrderStats {
  totalOrders: number
  completedOrders: number
  failedOrders: number
  totalRevenue: number
}

export async function fetchMyOrders(): Promise<Order[]> {
  const res = await fetch(`${PAYMENT_BASE}/payments/orders`, { headers: authHeaders() })
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return data.data
  return []
}

export async function fetchAdminOrderStats(): Promise<{ stats: AdminOrderStats | null; orders: Order[] }> {
  const res = await fetch(`${PAYMENT_BASE}/admin/orders/overview`, { headers: authHeaders() })
  const data = await res.json()
  if (!data.success) return { stats: null, orders: [] }
  return {
    stats: data.stats as AdminOrderStats,
    orders: Array.isArray(data.orders) ? (data.orders as Order[]) : [],
  }
}
