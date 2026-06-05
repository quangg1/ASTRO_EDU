'use client'

import { CircleCheck } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/apiConfig'
import type { CheckoutQuote, CheckoutSession } from '../api/paymentApi'
import { formatCourseMoney } from './formatCourseMoney'
import { CheckoutGlassPanel } from './CheckoutGlassPanel'

export function CheckoutOrderPanel({
  quote,
  session,
  courseThumbnail,
  courseTitle,
}: {
  quote: CheckoutQuote
  session: CheckoutSession | null
  courseThumbnail?: string | null
  courseTitle: string
}) {
  const currency = session?.currency || quote.currency || 'VND'
  const listPrice = session?.listPrice ?? quote.listPrice ?? 0
  const discountAmount = session?.discountAmount ?? quote.selected.discountAmount ?? 0
  const finalAmount = session?.amount ?? quote.selected.finalAmount ?? listPrice
  const title = session?.courseTitle || quote.courseTitle || courseTitle
  const isUpgrade = Boolean(quote.isCatalogUpgrade && quote.catalogCredit)
  const cohortFull = quote.cohortFullPrice ?? null
  const thumbSrc = courseThumbnail ? resolveMediaUrl(courseThumbnail) : null

  return (
    <CheckoutGlassPanel className="p-6 lg:sticky lg:top-24 flex flex-col gap-5 h-fit">
      <h2 className="text-lg font-semibold text-ds-text">Đơn hàng</h2>

      <div className="flex gap-3 items-start">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-ds-border bg-ds-elevated">
          {thumbSrc ? (
            <img src={thumbSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-950/80 via-ds-base to-violet-950/60 text-2xl"
              aria-hidden
            >
              🌌
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-medium text-ds-text leading-snug line-clamp-2">{title}</p>
          <p className="mt-1 text-xs text-ds-muted">Khóa học trực tuyến</p>
        </div>
      </div>

      <dl className="space-y-2.5 text-sm">
        {isUpgrade && cohortFull != null && cohortFull > listPrice ? (
          <>
            <div className="flex justify-between gap-3">
              <dt className="text-ds-muted">Học phí lớp (đủ)</dt>
              <dd className="text-ds-text tabular-nums">{formatCourseMoney(cohortFull, currency)}</dd>
            </div>
            <div className="flex justify-between gap-3 text-emerald-300/90">
              <dt>Đã trả gói tự học</dt>
              <dd className="tabular-nums">−{formatCourseMoney(quote.catalogCredit!, currency)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ds-muted">Phần cần trả thêm</dt>
              <dd className="text-ds-text tabular-nums">{formatCourseMoney(listPrice, currency)}</dd>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between gap-3">
              <dt className="text-ds-muted">Khóa học</dt>
              <dd className="text-ds-text tabular-nums">{formatCourseMoney(listPrice, currency)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ds-muted">Giá gốc</dt>
              <dd className="text-ds-text tabular-nums">{formatCourseMoney(listPrice, currency)}</dd>
            </div>
          </>
        )}
        {discountAmount > 0 && (
          <div className="flex justify-between gap-3 text-ds-accent">
            <dt>
              Giảm giá
              {quote.discountSource === 'promo' && quote.selected.promoLabelVi
                ? ` (${quote.selected.promoCode})`
                : quote.discountSource === 'gem_voucher'
                  ? ' (voucher gem)'
                  : quote.discountSource === 'learner_tier' && quote.selected.learnerTierLabelVi
                    ? ` (${quote.selected.learnerTierLabelVi})`
                    : ''}
            </dt>
            <dd className="tabular-nums">−{formatCourseMoney(discountAmount, currency)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3 pt-3 border-t border-ds-border/80">
          <dt className="text-ds-text font-medium">Tổng</dt>
          <dd className="text-xl font-bold text-ds-accent tabular-nums">
            {formatCourseMoney(finalAmount, currency)}
          </dd>
        </div>
      </dl>

      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3.5">
        <div className="flex gap-3">
          <CircleCheck className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-medium text-emerald-100/95">Cam kết hoàn tiền 30 ngày</p>
            <p className="mt-1 text-xs text-emerald-200/70 leading-relaxed">
              Nếu không hài lòng, bạn sẽ được hoàn lại 100% số tiền.
            </p>
          </div>
        </div>
      </div>

      {session?.txnRef && (
        <p className="text-[11px] text-ds-subtle font-mono text-center break-all">
          ID: {session.txnRef}
        </p>
      )}
    </CheckoutGlassPanel>
  )
}
