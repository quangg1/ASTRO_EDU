import { getApiPathBase } from './apiConfig'
import { getToken } from './authApi'

const API_BASE = getApiPathBase()

function authHeaders(): HeadersInit {
  const token = getToken()
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`
  return h
}

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
  const res = await fetch(`${API_BASE}/payments/orders`, { headers: authHeaders() })
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return data.data
  return []
}

export async function fetchAdminOrderStats(): Promise<{ stats: AdminOrderStats | null; orders: Order[] }> {
  const res = await fetch(`${API_BASE}/payments/admin/overview`, { headers: authHeaders() })
  const data = await res.json()
  if (!data.success) return { stats: null, orders: [] }
  return {
    stats: data.stats as AdminOrderStats,
    orders: Array.isArray(data.orders) ? (data.orders as Order[]) : [],
  }
}

