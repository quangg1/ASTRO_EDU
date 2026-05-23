import { getToken } from '@/features/auth/public'
import { getApiPathBase } from '@/lib/apiConfig'
import { forUserFacingError } from '@/lib/sanitizeUserError'
import { userMessages } from '@/lib/userMessages'

const PAYMENT_BASE = getApiPathBase()

function authHeaders(): HeadersInit {
  const token = getToken()
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`
  return h
}

// ────────────────────────────────────────────────────────────────────────────
// VNPay in-app QR (primary checkout path).
// Returns the raw `qrcontent` string from VNPay's `generateQr` endpoint —
// the modal renders it with `qrcode.react` so the QR lives inside our UI.
// ────────────────────────────────────────────────────────────────────────────

export interface PaymentQRTicket {
  qrContent: string
  txnRef: string
  amount: number
  currency: string
  expiresInSec: number
}

export type CreatePaymentQRResult =
  | { success: true; data: PaymentQRTicket }
  | { success: false; error: string; code?: string; txnRef?: string }

export async function createPaymentQR(params: { courseId: string }): Promise<CreatePaymentQRResult> {
  const res = await fetch(`${PAYMENT_BASE}/payments/create-qr`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (data?.success && data.data?.qrContent) {
    return { success: true, data: data.data as PaymentQRTicket }
  }
  return {
    success: false,
    error: forUserFacingError(data?.error, userMessages.paymentQrFailed),
    code: data?.code,
    txnRef: data?.txnRef,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// VNPay hosted-redirect URL (fallback when Merchant-hosted QR is not enabled
// on the merchant account). Caller opens the URL in a new tab.
// ────────────────────────────────────────────────────────────────────────────

export type CreatePaymentUrlResult =
  | { success: true; paymentUrl: string; txnRef: string; amount: number; currency: string }
  | { success: false; error: string }

export async function createPaymentUrl(params: {
  courseId: string
}): Promise<CreatePaymentUrlResult> {
  const res = await fetch(`${PAYMENT_BASE}/payments/create-url`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (data?.success && data.data?.paymentUrl) {
    return {
      success: true,
      paymentUrl: data.data.paymentUrl,
      txnRef: data.data.txnRef,
      amount: data.data.amount,
      currency: data.data.currency,
    }
  }
  return {
    success: false,
    error: forUserFacingError(data?.error, userMessages.paymentUrlFailed),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Status polling — called by the modal every few seconds while open.
// ────────────────────────────────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

export interface PaymentStatusResponse {
  status: PaymentStatus
  courseSlug: string
  paidAt: string | null
}

export async function fetchPaymentStatus(
  txnRef: string,
): Promise<PaymentStatusResponse | null> {
  const res = await fetch(`${PAYMENT_BASE}/payments/status/${encodeURIComponent(txnRef)}`, {
    headers: authHeaders(),
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data?.success && data.data) return data.data as PaymentStatusResponse
  return null
}

// ────────────────────────────────────────────────────────────────────────────
// Orders
// ────────────────────────────────────────────────────────────────────────────

export interface Order {
  _id: string
  courseId: string
  courseSlug: string
  amount: number
  currency: string
  status: PaymentStatus
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

export async function fetchAdminOrderStats(): Promise<{
  stats: AdminOrderStats | null
  orders: Order[]
}> {
  const res = await fetch(`${PAYMENT_BASE}/admin/orders/overview`, { headers: authHeaders() })
  const data = await res.json()
  if (!data.success) return { stats: null, orders: [] }
  return {
    stats: data.stats as AdminOrderStats,
    orders: Array.isArray(data.orders) ? (data.orders as Order[]) : [],
  }
}
