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

export interface CheckoutVoucherTier {
  id: string
  labelVi: string
  discountPct: number
  gemCost: number
  discountAmount: number
  finalAmount: number
  eligible: boolean
  lockedReason: string | null
  supersededByLearnerTier?: boolean
}

export interface CheckoutLearnerTierMeta {
  current: {
    id: string
    nameVi: string
    emoji: string
    checkoutDiscountPct: number
  }
  next: { id: string; nameVi: string; minGemsEarned: number } | null
  gemsEarned: number
  gemsToNext: number
  progressPct: number
}

export interface CheckoutQuote {
  courseId: string
  courseSlug: string
  courseTitle: string
  cohortId?: string | null
  cohortTitle?: string | null
  checkoutKind?: 'catalog' | 'cohort'
  currency: string
  listPrice: number
  /** Giá lớp đủ (trước trừ gói tự học) — chỉ cohort checkout */
  cohortFullPrice?: number | null
  /** Số đã trả cho catalog được trừ khi nâng lên lớp */
  catalogCredit?: number
  isCatalogUpgrade?: boolean
  gemBalance: number
  totalGemsEarned?: number
  maxDiscountPct: number
  learnerTier?: CheckoutLearnerTierMeta
  tiers: CheckoutVoucherTier[]
  selected: {
    tierId: string | null
    labelVi: string | null
    discountPct: number
    gemCost: number
    discountAmount: number
    finalAmount: number
    promoCode: string | null
    promoCodeId: string | null
    promoLabelVi: string | null
    learnerTierId: string | null
    learnerTierLabelVi: string | null
  }
  discountSource: 'promo' | 'gem_voucher' | 'learner_tier' | 'none'
  exclusiveDiscountVi: string
  gemPolicyVi: string
}

export type FetchCheckoutQuoteResult =
  | { success: true; data: CheckoutQuote }
  | { success: false; error: string; code?: string }

export async function fetchCheckoutQuote(params: {
  courseId: string
  voucherTierId?: string | null
  promoCode?: string | null
  cohortId?: string | null
}): Promise<FetchCheckoutQuoteResult> {
  const q = new URLSearchParams({ courseId: params.courseId })
  if (params.voucherTierId) q.set('voucherTierId', params.voucherTierId)
  if (params.promoCode) q.set('promoCode', params.promoCode)
  if (params.cohortId) q.set('cohortId', params.cohortId)
  const res = await fetch(`${PAYMENT_BASE}/payments/checkout-quote?${q.toString()}`, {
    headers: authHeaders(),
  })
  const data = await res.json()
  if (data?.success && data.data) {
    return { success: true, data: data.data as CheckoutQuote }
  }
  return {
    success: false,
    error: forUserFacingError(data?.error, userMessages.loadDataFailed),
    code: data?.code,
  }
}

export interface CheckoutSession {
  txnRef: string
  amount: number
  listPrice: number
  discountAmount: number
  discountPct: number
  currency: string
  courseSlug: string
  courseTitle: string
  gemsCommitted: number
  promoCode?: string | null
  discountSource?: string
  expiresAt: string
  demoMode: boolean
  reusedPending?: boolean
}

export type CreateCheckoutSessionResult =
  | { success: true; data: CheckoutSession }
  | { success: false; error: string; code?: string }

export async function createCheckoutSession(params: {
  courseId: string
  voucherTierId?: string | null
  promoCode?: string | null
  cohortId?: string | null
}): Promise<CreateCheckoutSessionResult> {
  const res = await fetch(`${PAYMENT_BASE}/payments/checkout`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      courseId: params.courseId,
      voucherTierId: params.voucherTierId || undefined,
      promoCode: params.promoCode || undefined,
      cohortId: params.cohortId || undefined,
    }),
  })
  const data = await res.json()
  if (data?.success && data.data) {
    return { success: true, data: data.data as CheckoutSession }
  }
  return {
    success: false,
    error: forUserFacingError(data?.error, userMessages.checkoutSessionFailed),
    code: data?.code,
  }
}

export interface ConfirmCheckoutResult {
  status: 'completed'
  courseSlug: string
  txnRef: string
  transactionId?: string
  paidAt?: string
  alreadyCompleted?: boolean
}

export type ConfirmCheckoutResponse =
  | { success: true; data: ConfirmCheckoutResult }
  | { success: false; error: string; code?: string }

export async function confirmCheckout(params: {
  txnRef: string
  paymentMethod?: 'card'
}): Promise<ConfirmCheckoutResponse> {
  const res = await fetch(
    `${PAYMENT_BASE}/payments/checkout/${encodeURIComponent(params.txnRef)}/confirm`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ paymentMethod: params.paymentMethod || 'card' }),
    },
  )
  const data = await res.json()
  if (data?.success && data.data) {
    return { success: true, data: data.data as ConfirmCheckoutResult }
  }
  return {
    success: false,
    error: forUserFacingError(data?.error, userMessages.paymentConfirmFailed),
    code: data?.code,
  }
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

export interface PaymentStatusResponse {
  status: PaymentStatus
  courseSlug: string
  paidAt: string | null
  transactionId?: string | null
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

export type OrderKind = 'catalog' | 'cohort' | 'cohort_upgrade'

export interface Order {
  _id: string
  courseId: string
  courseSlug: string
  cohortId?: string | null
  cohortTitle?: string | null
  orderKind?: OrderKind
  amount: number
  listPrice?: number
  discountPct?: number
  discountAmount?: number
  discountSource?: 'promo' | 'gem_voucher' | 'learner_tier' | 'none'
  promoCode?: string | null
  currency: string
  status: PaymentStatus
  gateway: string
  transactionId?: string | null
  txnRef: string
  createdAt: string
  paidAt?: string | null
  expiresAt?: string | null
  catalogCredit?: number | null
  cohortFullPrice?: number | null
  upgradeFromCatalog?: boolean
}

export interface AdminOrder extends Order {
  userId?: string
  buyerEmail?: string | null
  buyerName?: string | null
  cohortTitle?: string | null
  adminNote?: string
  discountPct?: number
  discountAmount?: number
  discountSource?: string
  promoCode?: string | null
  gemsCommitted?: number
  gateway?: string
  refundedAt?: string | null
  refundReason?: string
}

export interface AdminOrderStats {
  totalOrders: number
  completedOrders: number
  failedOrders: number
  refundedOrders?: number
  cancelledOrders?: number
  pendingOrders?: number
  /** Tổng đã quy đổi VND (USD × tỷ giá) */
  totalRevenue: number
  revenueCurrency?: 'VND'
  usdToVndRate?: number
}

export async function fetchMyOrders(): Promise<Order[]> {
  const res = await fetch(`${PAYMENT_BASE}/payments/orders`, { headers: authHeaders() })
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return data.data
  return []
}

export async function fetchAdminOrderStats(): Promise<{
  stats: AdminOrderStats | null
  orders: AdminOrder[]
}> {
  try {
    const res = await fetch(`${PAYMENT_BASE}/admin/orders/overview`, { headers: authHeaders() })
    const data = await res.json()
    if (!res.ok || !data.success) return { stats: null, orders: [] }
    return {
      stats: data.stats as AdminOrderStats,
      orders: Array.isArray(data.orders) ? (data.orders as AdminOrder[]) : [],
    }
  } catch {
    return { stats: null, orders: [] }
  }
}
