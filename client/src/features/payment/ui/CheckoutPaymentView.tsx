'use client'

import Link from 'next/link'
import { ArrowLeft, Lock } from 'lucide-react'
import type { CheckoutQuote, CheckoutSession } from '../api/paymentApi'
import {
  CheckoutCardForm,
  type CheckoutCardFormValues,
} from './CheckoutCardForm'
import { CheckoutGlassPanel } from './CheckoutGlassPanel'
import { CheckoutOrderPanel } from './CheckoutOrderPanel'

export function CheckoutPaymentView({
  slug,
  quote,
  session,
  courseTitle,
  courseThumbnail,
  card,
  onCardChange,
  cardError,
  errorMsg,
  confirming,
  onBack,
  onSubmit,
}: {
  slug: string
  quote: CheckoutQuote
  session: CheckoutSession
  courseTitle: string
  courseThumbnail?: string | null
  card: CheckoutCardFormValues
  onCardChange: (next: CheckoutCardFormValues) => void
  cardError: string
  errorMsg: string
  confirming: boolean
  onBack: () => void
  onSubmit: () => void
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
      <CheckoutGlassPanel className="p-6 sm:p-8 space-y-6">
        <div className="space-y-4">
          <button
            type="button"
            onClick={onBack}
            disabled={confirming}
            className="inline-flex items-center gap-2 text-sm text-ds-muted hover:text-ds-accent transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Quay lại
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ds-text tracking-tight">Thanh toán</h1>
            <p className="mt-2 text-sm text-ds-muted leading-relaxed">
              Hoàn tất thanh toán của bạn một cách an toàn
            </p>
          </div>
        </div>

        <CheckoutCardForm
          values={card}
          onChange={onCardChange}
          disabled={confirming}
          variant="glass"
        />

        {cardError && <p className="text-sm text-ds-warning">{cardError}</p>}
        {errorMsg && (
          <p className="text-sm text-ds-warning rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
            {errorMsg}
          </p>
        )}

        <div className="flex items-center gap-2.5 rounded-xl border border-ds-border/60 bg-ds-base/40 px-3.5 py-2.5 text-xs text-ds-muted">
          <Lock className="h-4 w-4 shrink-0 text-ds-accent" aria-hidden />
          <span>Thông tin thanh toán của bạn được mã hóa an toàn</span>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={confirming}
          className="checkout-pay-cta w-full inline-flex items-center justify-center gap-2.5 rounded-[var(--radius-control)] px-5 py-3.5 text-sm font-semibold text-ds-accent-fg transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {confirming ? (
            <>
              <span
                className="h-4 w-4 rounded-full border-2 border-ds-accent-fg/30 border-t-ds-accent-fg animate-spin"
                aria-hidden
              />
              Đang xử lý…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" aria-hidden />
              Hoàn tất thanh toán
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-ds-subtle">
          <Link href={`/courses/${slug}`} className="hover:text-ds-accent transition-colors">
            Quay lại trang khóa học
          </Link>
        </p>
      </CheckoutGlassPanel>

      <CheckoutOrderPanel
        quote={quote}
        session={session}
        courseThumbnail={courseThumbnail}
        courseTitle={courseTitle}
      />
    </div>
  )
}
