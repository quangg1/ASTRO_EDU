'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Receipt } from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import { Card } from '@/design-system'
import { formatOrderAmount, formatVnd, sumCompletedOrdersVnd } from '@/lib/money'
import { fetchMyOrders, type Order } from '../api/paymentApi'
import {
  discountSourceLabelVi,
  formatOrderDateVi,
  orderKindLabelVi,
  orderStatusLabelVi,
  orderStatusTone,
} from '../lib/orderLabels'

function StatusBadge({ status }: { status: string }) {
  const tone = orderStatusTone(status)
  const cls =
    tone === 'success'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
      : tone === 'warning'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
        : tone === 'danger'
          ? 'border-red-500/40 bg-red-500/10 text-red-300'
          : 'border-ds-border bg-white/5 text-ds-muted'
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}
    >
      {orderStatusLabelVi(status)}
    </span>
  )
}

function OrderRow({ order }: { order: Order }) {
  const kind = order.orderKind || (order.cohortId ? 'cohort' : 'catalog')
  const hasDiscount = (order.discountAmount ?? 0) > 0

  return (
    <article className="rounded-xl border border-ds-border bg-ds-base/40 p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Link
            href={`/courses/${order.courseSlug}`}
            className="text-sm font-semibold text-ds-text hover:text-ds-accent truncate block"
          >
            {order.courseSlug}
          </Link>
          <p className="text-xs text-ds-muted">{orderKindLabelVi(kind)}</p>
          {order.cohortTitle && (
            <p className="text-xs text-purple-200/90">Lớp: {order.cohortTitle}</p>
          )}
          {order.upgradeFromCatalog && (order.catalogCredit ?? 0) > 0 && (
            <p className="text-xs text-emerald-300/90">
              Đã trừ {formatOrderAmount(order.catalogCredit!, order.currency)} (gói tự học)
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-semibold text-ds-accent tabular-nums">
            {formatOrderAmount(order.amount, order.currency)}
          </p>
          {hasDiscount && (order.listPrice ?? 0) > order.amount && (
            <p className="text-xs text-ds-muted line-through tabular-nums">
              {formatOrderAmount(order.listPrice!, order.currency)}
            </p>
          )}
          <StatusBadge status={order.status} />
        </div>
      </div>

      <dl className="grid gap-2 sm:grid-cols-2 text-xs">
        <div>
          <dt className="text-ds-muted">Mã đơn</dt>
          <dd className="font-mono text-ds-text break-all">{order.txnRef}</dd>
        </div>
        {order.transactionId && (
          <div>
            <dt className="text-ds-muted">Mã giao dịch</dt>
            <dd className="font-mono text-ds-text break-all">{order.transactionId}</dd>
          </div>
        )}
        <div>
          <dt className="text-ds-muted">Tạo lúc</dt>
          <dd className="text-ds-text">{formatOrderDateVi(order.createdAt)}</dd>
        </div>
        {order.status === 'pending' && order.expiresAt && (
          <div>
            <dt className="text-ds-muted">Hết hạn thanh toán</dt>
            <dd className="text-amber-200/90">{formatOrderDateVi(order.expiresAt)}</dd>
          </div>
        )}
        <div>
          <dt className="text-ds-muted">Thanh toán lúc</dt>
          <dd className="text-ds-text">{formatOrderDateVi(order.paidAt)}</dd>
        </div>
        {hasDiscount && (
          <>
            <div>
              <dt className="text-ds-muted">Giảm giá</dt>
              <dd className="text-ds-accent tabular-nums">
                −{formatOrderAmount(order.discountAmount!, order.currency)}
                {order.discountPct ? ` (${order.discountPct}%)` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-ds-muted">Loại ưu đãi</dt>
              <dd className="text-ds-text">
                {discountSourceLabelVi(order.discountSource || 'none')}
                {order.promoCode ? ` · ${order.promoCode}` : ''}
              </dd>
            </div>
          </>
        )}
        {(order.cohortFullPrice ?? 0) > 0 && order.upgradeFromCatalog && (
          <div className="sm:col-span-2">
            <dt className="text-ds-muted">Học phí lớp (đủ)</dt>
            <dd className="text-ds-text tabular-nums">
              {formatOrderAmount(order.cohortFullPrice!, order.currency)}
            </dd>
          </div>
        )}
      </dl>
    </article>
  )
}

export function OrderHistoryClient() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!checked) return
    if (!user) {
      router.replace('/login?redirect=/my-orders')
      return
    }
    let cancelled = false
    void fetchMyOrders().then((list) => {
      if (!cancelled) {
        setOrders(list)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [checked, user, router])

  const stats = useMemo(() => {
    const completed = orders.filter((o) => o.status === 'completed')
    return {
      total: orders.length,
      completed: completed.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      failed: orders.filter((o) => o.status === 'failed' || o.status === 'cancelled').length,
      totalVnd: sumCompletedOrdersVnd(completed),
    }
  }, [orders])

  if (!checked || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ds-muted">
        Đang chuyển đến đăng nhập…
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-ds-muted mb-1 flex items-center gap-2">
          <Receipt className="h-4 w-4" aria-hidden />
          Tài khoản
        </p>
        <h1 className="text-2xl font-bold text-ds-text">Lịch sử thanh toán</h1>
        <p className="mt-2 text-sm text-ds-muted max-w-2xl">
          Các đơn mua khóa học, đăng ký lớp và nâng cấp từ gói tự học. Mã đơn dùng khi liên hệ hỗ trợ.
        </p>
      </header>

      {!loading && orders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tổng đơn', value: String(stats.total) },
            { label: 'Đã thanh toán', value: String(stats.completed) },
            { label: 'Đang chờ', value: String(stats.pending) },
            { label: 'Tổng đã chi (VND)', value: formatVnd(stats.totalVnd) },
          ].map((s) => (
            <Card key={s.label} className="p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-ds-muted">{s.label}</p>
              <p className="mt-1 text-sm font-semibold text-ds-text tabular-nums">{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <Card className="p-8 text-center text-sm text-ds-muted">Đang tải đơn hàng…</Card>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-ds-muted">Chưa có đơn thanh toán nào.</p>
          <Link href="/courses" className="text-sm text-ds-accent hover:underline">
            Khám phá khóa học
          </Link>
        </Card>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o._id}>
              <OrderRow order={o} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-ds-muted">
        <Link href="/my-courses" className="text-ds-accent hover:underline">
          ← Khóa học của tôi
        </Link>
        {' · '}
        <Link href="/profile" className="text-ds-accent hover:underline">
          Hồ sơ
        </Link>
      </p>
    </div>
  )
}
