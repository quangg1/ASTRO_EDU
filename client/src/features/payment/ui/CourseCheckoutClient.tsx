'use client'

/**
 * Checkout khóa học — giao dịch nội bộ (demo):
 * đơn pending → form thẻ (validate client) → confirm → enroll + trừ gem voucher.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, useToast } from '@/design-system'
import { useAuthStore } from '@/features/auth/public'
import { forUserFacingError } from '@/lib/sanitizeUserError'
import { userMessages } from '@/lib/userMessages'
import { trackEvent } from '@/lib/analytics'
import {
  confirmCheckout,
  createCheckoutSession,
  fetchCheckoutQuote,
  type CheckoutQuote,
  type CheckoutSession,
} from '../api/paymentApi'
import { formatCourseMoney } from './formatCourseMoney'
import {
  CheckoutCardForm,
  validateDemoCardForm,
  type CheckoutCardFormValues,
} from './CheckoutCardForm'
import { validatePromoCode } from '@/features/promotions/api/promoApi'

type Phase = 'loading' | 'review' | 'payment' | 'processing' | 'completed' | 'error'

const EMPTY_CARD: CheckoutCardFormValues = {
  nameOnCard: '',
  cardNumber: '',
  expiry: '',
  cvc: '',
}

export interface CourseCheckoutClientProps {
  slug: string
  courseId: string
  courseTitle: string
}

function OrderSummary({
  quote,
  session,
}: {
  quote: CheckoutQuote | null
  session: CheckoutSession | null
}) {
  const currency = session?.currency || quote?.currency || 'VND'
  const listPrice = session?.listPrice ?? quote?.listPrice ?? 0
  const discountAmount = session?.discountAmount ?? quote?.selected.discountAmount ?? 0
  const finalAmount = session?.amount ?? quote?.selected.finalAmount ?? listPrice
  const title = session?.courseTitle || quote?.courseTitle || ''

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between gap-2">
        <dt className="text-ds-muted">Khóa học</dt>
        <dd className="text-ds-text font-medium text-right">{title}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-ds-muted">Giá gốc</dt>
        <dd className="text-ds-text tabular-nums">{formatCourseMoney(listPrice, currency)}</dd>
      </div>
      {discountAmount > 0 && (
        <div className="flex justify-between gap-2 text-ds-accent">
          <dt>
            Giảm giá
            {quote?.discountSource === 'promo' && quote.selected.promoLabelVi
              ? ` (${quote.selected.promoCode})`
              : quote?.discountSource === 'gem_voucher'
                ? ' (voucher gem)'
                : quote?.discountSource === 'learner_tier' && quote.selected.learnerTierLabelVi
                  ? ` (${quote.selected.learnerTierLabelVi})`
                  : ''}
          </dt>
          <dd className="tabular-nums">−{formatCourseMoney(discountAmount, currency)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-2 pt-2 border-t border-ds-border">
        <dt className="text-ds-muted font-medium">Tổng</dt>
        <dd className="text-lg font-semibold text-ds-accent tabular-nums">
          {formatCourseMoney(finalAmount, currency)}
        </dd>
      </div>
      {quote && (
        <div className="flex justify-between gap-2 text-xs pt-1">
          <dt className="text-ds-muted">Số dư gem</dt>
          <dd className="text-ds-text tabular-nums">{quote.gemBalance}</dd>
        </div>
      )}
      {session?.txnRef && (
        <div className="flex justify-between gap-2 text-xs">
          <dt className="text-ds-muted">Mã đơn</dt>
          <dd className="text-ds-text font-mono text-right break-all">{session.txnRef}</dd>
        </div>
      )}
    </dl>
  )
}

export function CourseCheckoutClient({ slug, courseId, courseTitle }: CourseCheckoutClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { user, checked } = useAuthStore()

  const [phase, setPhase] = useState<Phase>('loading')
  const [quote, setQuote] = useState<CheckoutQuote | null>(null)
  const [session, setSession] = useState<CheckoutSession | null>(null)
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [promoInput, setPromoInput] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null)
  const [promoBusy, setPromoBusy] = useState(false)
  const [card, setCard] = useState<CheckoutCardFormValues>(EMPTY_CARD)
  const [cardError, setCardError] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const promoLocked = Boolean(appliedPromoCode)

  useEffect(() => {
    if (!checked) return
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(`/courses/${slug}/checkout`)}`)
    }
  }, [checked, user, router, slug])

  const loadQuote = useCallback(
    async (opts?: { tierId?: string | null; promoCode?: string | null }) => {
      if (!user) return
      setPhase('loading')
      setErrorMsg('')
      const result = await fetchCheckoutQuote({
        courseId,
        voucherTierId: opts?.promoCode ? null : (opts?.tierId ?? null),
        promoCode: opts?.promoCode ?? null,
      })
      if (!result.success) {
        setErrorMsg(forUserFacingError(result.error, userMessages.loadDataFailed))
        setPhase('error')
        return
      }
      setQuote(result.data)
      setSelectedTierId(result.data.selected.tierId)
      if (result.data.selected.promoCode) {
        setAppliedPromoCode(result.data.selected.promoCode)
        setPromoInput(result.data.selected.promoCode)
      }
      setPhase('review')
    },
    [courseId, user],
  )

  useEffect(() => {
    if (!checked || !user) return
    trackEvent('checkout_started', { course_slug: slug, surface: 'checkout_page' })
    const fromUrl = searchParams.get('promo')?.trim().toUpperCase() || null
    if (fromUrl) {
      setPromoInput(fromUrl)
      void loadQuote({ promoCode: fromUrl })
    } else {
      void loadQuote({ tierId: null })
    }
  }, [checked, user, slug, loadQuote, searchParams])

  const onTierChange = useCallback(
    async (tierId: string | null) => {
      if (promoLocked) return
      setSelectedTierId(tierId)
      setAppliedPromoCode(null)
      setPromoInput('')
      const result = await fetchCheckoutQuote({ courseId, voucherTierId: tierId, promoCode: null })
      if (result.success) setQuote(result.data)
    },
    [courseId, promoLocked],
  )

  const applyPromo = useCallback(async () => {
    const code = promoInput.trim().toUpperCase()
    if (!code) return
    setPromoBusy(true)
    setErrorMsg('')
    const validated = await validatePromoCode({ courseId, code })
    if (!validated.success) {
      setPromoBusy(false)
      setErrorMsg(validated.error)
      return
    }
    setSelectedTierId(null)
    setAppliedPromoCode(code)
    const result = await fetchCheckoutQuote({ courseId, promoCode: code, voucherTierId: null })
    setPromoBusy(false)
    if (result.success) {
      setQuote(result.data)
      toast.show(`Đã áp dụng mã ${code}`, { tone: 'success' })
    } else {
      setErrorMsg(forUserFacingError(result.error, userMessages.loadDataFailed))
    }
  }, [courseId, promoInput, toast])

  const clearPromo = useCallback(async () => {
    setAppliedPromoCode(null)
    setPromoInput('')
    await loadQuote({ tierId: null, promoCode: null })
  }, [loadQuote])

  const cohortIdFromUrl = searchParams.get('cohortId')?.trim() || null

  const continueToPayment = useCallback(async () => {
    setPhase('processing')
    setErrorMsg('')
    const result = await createCheckoutSession({
      courseId,
      voucherTierId: promoLocked ? null : selectedTierId,
      promoCode: appliedPromoCode,
      cohortId: cohortIdFromUrl,
    })
    if (!result.success) {
      setErrorMsg(forUserFacingError(result.error, userMessages.checkoutSessionFailed))
      setPhase('error')
      return
    }
    setSession(result.data)
    setPhase('payment')
  }, [courseId, selectedTierId, appliedPromoCode, promoLocked, cohortIdFromUrl])

  const completePurchase = useCallback(async () => {
    if (!session) return
    const validationError = validateDemoCardForm(card)
    if (validationError) {
      setCardError(validationError)
      return
    }
    setCardError('')
    setPhase('processing')
    const result = await confirmCheckout({ txnRef: session.txnRef, paymentMethod: 'card' })
    if (!result.success) {
      setErrorMsg(forUserFacingError(result.error, userMessages.paymentConfirmFailed))
      setPhase('payment')
      return
    }
    setPhase('completed')
    toast.show('Thanh toán thành công — đã mở khóa học', { tone: 'success' })
    trackEvent('payment_return_viewed', {
      course_slug: result.data.courseSlug,
      status: 'success',
    })
    const placed = cohortIdFromUrl ? '&cohortPlaced=1' : ''
    window.setTimeout(() => {
      router.push(`/courses/${result.data.courseSlug}?enrolled=1${placed}`)
    }, 1000)
  }, [session, card, toast, router, cohortIdFromUrl])

  if (!checked || !user) {
    return (
      <main className="surface-edu min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-ds-muted">Đang chuyển đến đăng nhập…</p>
      </main>
    )
  }

  const displayTitle = quote?.courseTitle || courseTitle

  return (
    <main className="surface-edu min-h-screen px-4 pb-16 pt-20">
      <div className="max-w-4xl mx-auto">
        <nav className="text-sm text-ds-muted mb-6 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href="/courses" className="text-ds-accent hover:text-cyan-100">
            Khóa học
          </Link>
          <span aria-hidden>/</span>
          <Link
            href={`/courses/${slug}`}
            className="text-ds-accent hover:text-cyan-100 truncate max-w-[12rem] sm:max-w-xs"
          >
            {displayTitle}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ds-text">Thanh toán</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-2xl font-bold text-ds-text">Thanh toán</h1>
          <p className="mt-2 text-sm text-ds-muted leading-relaxed max-w-2xl">
            {quote?.exclusiveDiscountVi ||
              'Mỗi khóa học chỉ một mã giảm: coupon hoặc voucher gem.'}{' '}
            {quote?.gemPolicyVi || ''}
          </p>
          {cohortIdFromUrl && (
            <p className="mt-3 text-sm text-emerald-200/90 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 max-w-2xl">
              Đăng ký kèm lớp đã chọn. Sau thanh toán, mã lớp gửi qua email — không hiển thị trên web.
            </p>
          )}
        </header>

        {(phase === 'loading' || phase === 'processing') && (
          <Card className="p-10 flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-ds-border border-t-ds-accent animate-spin" />
            <p className="text-sm text-ds-muted">
              {phase === 'processing' ? 'Đang xử lý giao dịch…' : 'Đang tải báo giá…'}
            </p>
          </Card>
        )}

        {phase === 'review' && quote && (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
            <Card className="p-6 space-y-5">
              <h2 className="text-sm font-semibold text-ds-text">1. Tóm tắt đơn hàng</h2>

              <div>
                <label htmlFor="promo-code" className="text-xs font-medium text-ds-muted block mb-2">
                  Mã coupon
                </label>
                <div className="flex gap-2">
                  <input
                    id="promo-code"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    disabled={promoBusy}
                    placeholder="VD: SUMMER20"
                    className="flex-1 rounded-xl border border-ds-border bg-ds-base px-3 py-2.5 text-sm text-ds-text uppercase"
                  />
                  {appliedPromoCode ? (
                    <Button variant="ghost" onClick={() => void clearPromo()}>
                      Gỡ
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled={promoBusy || !promoInput.trim()} onClick={() => void applyPromo()}>
                      {promoBusy ? '…' : 'Áp dụng'}
                    </Button>
                  )}
                </div>
                {appliedPromoCode && quote.selected.promoLabelVi && (
                  <p className="mt-2 text-xs text-ds-accent">
                    Đã áp dụng {quote.selected.promoLabelVi} (−
                    {formatCourseMoney(quote.selected.discountAmount, quote.currency)}).
                  </p>
                )}
              </div>

              {quote.discountSource === 'learner_tier' && quote.selected.learnerTierLabelVi && (
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm">
                  <p className="text-ds-text font-medium">
                    Ưu đãi hạng {quote.selected.learnerTierLabelVi}: −
                    {formatCourseMoney(quote.selected.discountAmount, quote.currency)} (
                    {quote.selected.discountPct}% — không trừ gem)
                  </p>
                  <Link href="/gem/tiers" className="mt-1 inline-block text-xs text-ds-accent hover:underline">
                    Xem các hạng Learner →
                  </Link>
                </div>
              )}

              {quote.learnerTier &&
                quote.learnerTier.current.checkoutDiscountPct > 0 &&
                quote.discountSource !== 'learner_tier' &&
                !promoLocked && (
                  <p className="text-xs text-ds-muted">
                    Hạng {quote.learnerTier.current.emoji} {quote.learnerTier.current.nameVi} cho giảm{' '}
                    {quote.learnerTier.current.checkoutDiscountPct}% khi không dùng coupon/voucher thấp hơn.{' '}
                    <Link href="/gem/tiers" className="text-ds-accent hover:underline">
                      So sánh hạng
                    </Link>
                  </p>
                )}

              <div>
                <label htmlFor="voucher-tier" className="text-xs font-medium text-ds-muted block mb-2">
                  Voucher gem (tùy chọn)
                </label>
                <select
                  id="voucher-tier"
                  disabled={promoLocked}
                  className="w-full rounded-xl border border-ds-border bg-ds-base px-3 py-2.5 text-sm text-ds-text disabled:opacity-50"
                  value={selectedTierId ?? ''}
                  onChange={(e) => void onTierChange(e.target.value || null)}
                >
                  <option value="">Không dùng voucher</option>
                  {quote.tiers.map((t) => (
                    <option key={t.id} value={t.id} disabled={!t.eligible}>
                      {t.labelVi} — trừ {formatCourseMoney(t.discountAmount, quote.currency)} (
                      {t.gemCost} gem)
                      {t.supersededByLearnerTier
                        ? ' (hạng Learner tốt hơn)'
                        : !t.eligible
                          ? ` (${t.lockedReason || 'chưa đủ gem'})`
                          : ''}
                    </option>
                  ))}
                </select>
                {promoLocked && (
                  <p className="mt-2 text-xs text-ds-subtle">
                    Đã dùng coupon — không thể chọn voucher gem hoặc ưu đãi hạng cùng lúc.
                  </p>
                )}
                {!promoLocked && quote.discountSource === 'learner_tier' && (
                  <p className="mt-2 text-xs text-ds-subtle">
                    Đang áp giảm giá hạng — voucher gem bị vô hiệu nếu % thấp hơn.
                  </p>
                )}
                {!promoLocked && quote.selected.gemCost > 0 && (
                  <p className="mt-2 text-xs text-ds-accent">
                    Gem sẽ trừ khi bạn hoàn tất thanh toán ({quote.selected.gemCost} gem).
                  </p>
                )}
              </div>

              <Button onClick={() => void continueToPayment()}>Tiếp tục — thanh toán</Button>
            </Card>

            <Card className="p-6 lg:sticky lg:top-20">
              <h2 className="text-sm font-semibold text-ds-text mb-4">Đơn hàng</h2>
              <OrderSummary quote={quote} session={null} />
              <Link
                href={`/courses/${slug}`}
                className="block text-center text-sm text-ds-muted hover:text-ds-accent mt-4"
              >
                ← Quay lại
              </Link>
            </Card>
          </div>
        )}

        {phase === 'payment' && quote && session && (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
            <Card className="p-6 space-y-5">
              <h2 className="text-sm font-semibold text-ds-text">2. Thanh toán bằng thẻ</h2>
              <CheckoutCardForm values={card} onChange={setCard} />
              {cardError && <p className="text-sm text-ds-warning">{cardError}</p>}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={() => void completePurchase()}>Hoàn tất thanh toán</Button>
                <Button variant="ghost" onClick={() => setPhase('review')}>
                  Quay lại
                </Button>
              </div>
            </Card>

            <Card className="p-6 lg:sticky lg:top-20">
              <h2 className="text-sm font-semibold text-ds-text mb-4">Đơn hàng</h2>
              <OrderSummary quote={quote} session={session} />
            </Card>
          </div>
        )}

        {phase === 'error' && (
          <Card className="p-6 space-y-4">
            <p className="text-sm text-ds-warning">{errorMsg || 'Đã xảy ra lỗi.'}</p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() =>
                  void loadQuote({
                    tierId: selectedTierId,
                    promoCode: appliedPromoCode,
                  })
                }
              >
                Thử lại
              </Button>
              <Link
                href={`/courses/${slug}`}
                className="inline-flex items-center text-sm text-ds-muted hover:text-ds-accent"
              >
                Quay lại khóa học
              </Link>
            </div>
          </Card>
        )}

        {phase === 'completed' && (
          <Card className="p-10 flex flex-col items-center text-center gap-2">
            <div
              aria-hidden
              className="h-12 w-12 rounded-full bg-ds-accent-soft flex items-center justify-center text-ds-accent text-2xl"
            >
              ✓
            </div>
            <p className="text-base font-medium text-ds-text">Giao dịch thành công</p>
            <p className="text-sm text-ds-muted">Đang chuyển đến khóa học…</p>
          </Card>
        )}
      </div>
    </main>
  )
}
