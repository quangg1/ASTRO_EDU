export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded'
export type OrderKind = 'catalog' | 'cohort' | 'cohort_upgrade'
export type DiscountSource = 'promo' | 'gem_voucher' | 'learner_tier' | 'none'

const STATUS_VI: Record<PaymentStatus, string> = {
  pending: 'Chờ thanh toán',
  completed: 'Đã thanh toán',
  failed: 'Thất bại',
  cancelled: 'Đã huỷ',
  refunded: 'Đã hoàn tiền',
}

const KIND_VI: Record<OrderKind, string> = {
  catalog: 'Tự học (catalog)',
  cohort: 'Lớp có GV',
  cohort_upgrade: 'Nâng cấp lên lớp',
}

const DISCOUNT_VI: Record<DiscountSource, string> = {
  promo: 'Mã coupon',
  gem_voucher: 'Voucher gem',
  learner_tier: 'Ưu đãi hạng Learner',
  none: '—',
}

export function orderStatusLabelVi(status: string): string {
  return STATUS_VI[status as PaymentStatus] ?? status
}

export function orderStatusTone(status: string): 'success' | 'warning' | 'danger' | 'muted' {
  if (status === 'completed') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'failed' || status === 'cancelled' || status === 'refunded') return 'danger'
  return 'muted'
}

export function orderKindLabelVi(kind: string): string {
  return KIND_VI[kind as OrderKind] ?? kind
}

export function discountSourceLabelVi(source: string): string {
  return DISCOUNT_VI[source as DiscountSource] ?? source
}

export function formatOrderDateVi(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}
