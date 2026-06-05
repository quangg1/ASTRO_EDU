'use client'

/**
 * Checkout khóa học — giao dịch nội bộ (demo):
 * đơn pending → form thẻ (validate client) → confirm → enroll + trừ gem voucher.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, useToast } from '@/design-system'
import { CosmoPageBackdrop } from '@/components/layout/CosmoPageBackdrop'
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
import { validateDemoCardForm, type CheckoutCardFormValues } from './CheckoutCardForm'
import { CheckoutOrderPanel } from './CheckoutOrderPanel'
import { CheckoutPaymentView } from './CheckoutPaymentView'
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
  courseThumbnail?: string | null
  /** Từ server (cohort checkout) — fallback nếu query chưa sync. */
  initialCohortId?: string | null
}

function isAlreadyOwnedCode(code?: string) {
  return code === 'ALREADY_ENROLLED' || code === 'ALREADY_PURCHASED'
}

export function CourseCheckoutClient({
  slug,
  courseId,
  courseTitle,
  courseThumbnail,
  initialCohortId,
}: CourseCheckoutClientProps) {
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
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const promoLocked = Boolean(appliedPromoCode)
  const cohortIdFromUrl =
    searchParams.get('cohortId')?.trim() || initialCohortId?.trim() || null

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
        cohortId: cohortIdFromUrl,
      })
      if (!result.success) {
        if (isAlreadyOwnedCode(result.code)) {
          router.replace(`/courses/${slug}?owned=1`)
          return
        }
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
    [courseId, user, cohortIdFromUrl, router, slug],
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
      const result = await fetchCheckoutQuote({
        courseId,
        voucherTierId: tierId,
        promoCode: null,
        cohortId: cohortIdFromUrl,
      })
      if (result.success) setQuote(result.data)
    },
    [courseId, promoLocked, cohortIdFromUrl],
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
    const result = await fetchCheckoutQuote({
      courseId,
      promoCode: code,
      voucherTierId: null,
      cohortId: cohortIdFromUrl,
    })
    setPromoBusy(false)
    if (result.success) {
      setQuote(result.data)
      toast.show(`Đã áp dụng mã ${code}`, { tone: 'success' })
    } else {
      setErrorMsg(forUserFacingError(result.error, userMessages.loadDataFailed))
    }
  }, [courseId, promoInput, toast, cohortIdFromUrl])

  const clearPromo = useCallback(async () => {
    setAppliedPromoCode(null)
    setPromoInput('')
    await loadQuote({ tierId: null, promoCode: null })
  }, [loadQuote])

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
      if (isAlreadyOwnedCode(result.code)) {
        router.replace(`/courses/${slug}?owned=1`)
        return
      }
      setErrorMsg(forUserFacingError(result.error, userMessages.checkoutSessionFailed))
      setPhase('error')
      return
    }
    setSession(result.data)
    if (result.data.reusedPending) {
      toast.show('Tiếp tục đơn thanh toán đang chờ', { tone: 'info' })
    }
    setPhase('payment')
  }, [courseId, selectedTierId, appliedPromoCode, promoLocked, cohortIdFromUrl, router, slug, toast])

  const completePurchase = useCallback(async () => {
    if (!session) return
    const validationError = validateDemoCardForm(card)
    if (validationError) {
      setCardError(validationError)
      return
    }
    setCardError('')
    setErrorMsg('')
    setConfirmingPayment(true)
    try {
      const result = await confirmCheckout({ txnRef: session.txnRef, paymentMethod: 'card' })
      if (!result.success) {
        setErrorMsg(forUserFacingError(result.error, userMessages.paymentConfirmFailed))
        setConfirmingPayment(false)
        return
      }
      setPhase('completed')
      toast.show('Thanh toán thành công — đã mở khóa học', { tone: 'success' })
      trackEvent('payment_return_viewed', {
        course_slug: result.data.courseSlug,
        status: 'success',
      })
      const placed = cohortIdFromUrl ? '&cohortPlaced=1' : ''
      const target = `/courses/${result.data.courseSlug}?enrolled=1${placed}`
      router.refresh()
      window.setTimeout(() => {
        router.push(target)
      }, 1200)
    } catch {
      setErrorMsg(userMessages.paymentConfirmFailed)
      setConfirmingPayment(false)
    }
  }, [session, card, toast, router, cohortIdFromUrl])

  if (!checked || !user) {
    return (
      <main className="surface-edu min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-ds-muted">Đang chuyển đến đăng nhập…</p>
      </main>
    )
  }

  const displayTitle = quote?.courseTitle || courseTitle
  const isPaymentPhase = phase === 'payment' && quote && session

  return (
    <main className="surface-edu relative min-h-screen px-4 pb-16 pt-20">
      {isPaymentPhase && <CosmoPageBackdrop />}
      <div className={isPaymentPhase ? 'relative z-10 max-w-6xl mx-auto' : 'max-w-4xl mx-auto'}>
        {!isPaymentPhase && (
        <nav className="text-sm text-ds-muted mb-6 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href="/courses" className="text-ds-accent hover:text-ds-text">
            Khóa học
          </Link>
          <span aria-hidden>/</span>
          <Link
            href={`/courses/${slug}`}
            className="text-ds-accent hover:text-ds-text truncate max-w-[12rem] sm:max-w-xs"
          >
            {displayTitle}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ds-text">Thanh toán</span>
        </nav>
        )}

        {!isPaymentPhase && (
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-ds-text">Thanh toán</h1>
          <p className="mt-2 text-sm text-ds-muted leading-relaxed max-w-2xl">
            {quote?.exclusiveDiscountVi ||
              'Mỗi khóa học chỉ một mã giảm: coupon hoặc voucher gem.'}{' '}
            {quote?.gemPolicyVi || ''}
          </p>
          {cohortIdFromUrl && (
            <p className="mt-3 text-sm text-emerald-200/90 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 max-w-2xl">
              {quote?.checkoutKind === 'cohort' && quote.cohortTitle ? (
                <>
                  <strong>Học phí lớp:</strong> {quote.cohortTitle} — giá có GV, lịch theo tuần.
                  {quote.isCatalogUpgrade && quote.catalogCredit ? (
                    <>
                      {' '}
                      Bạn đã có gói tự học — chỉ thanh toán phần chênh lệch.
                    </>
                  ) : null}
                </>
              ) : (
                'Đăng ký kèm lớp đã chọn.'
              )}{' '}
              Sau thanh toán, mã lớp gửi qua email — không hiển thị trên web.
            </p>
          )}
        </header>
        )}

        {(phase === 'loading' || (phase === 'processing' && !isPaymentPhase)) && (
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

            <div className="space-y-4">
              <CheckoutOrderPanel
                quote={quote}
                session={null}
                courseThumbnail={courseThumbnail}
                courseTitle={courseTitle}
              />
              <Link
                href={`/courses/${slug}`}
                className="block text-center text-sm text-ds-muted hover:text-ds-accent"
              >
                ← Quay lại
              </Link>
            </div>
          </div>
        )}

        {isPaymentPhase && (
          <CheckoutPaymentView
            slug={slug}
            quote={quote}
            session={session}
            courseTitle={courseTitle}
            courseThumbnail={courseThumbnail}
            card={card}
            onCardChange={setCard}
            cardError={cardError}
            errorMsg={errorMsg}
            confirming={confirmingPayment}
            onBack={() => setPhase('review')}
            onSubmit={() => void completePurchase()}
          />
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
          <Card className="p-10 flex flex-col items-center text-center gap-3">
            <div
              aria-hidden
              className="h-12 w-12 rounded-full bg-ds-accent-soft flex items-center justify-center text-ds-accent text-2xl"
            >
              ✓
            </div>
            <p className="text-base font-medium text-ds-text">Giao dịch thành công</p>
            <p className="text-sm text-ds-muted max-w-sm">
              Đã ghi danh khóa học
              {cohortIdFromUrl ? ' và đăng ký lớp' : ''}. Mã lớp (nếu có) gửi qua email.
            </p>
            {session?.txnRef && (
              <p className="text-xs text-ds-muted font-mono">Mã đơn: {session.txnRef}</p>
            )}
            <p className="text-sm text-ds-accent">Đang chuyển đến khóa học…</p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Link href={`/courses/${slug}?enrolled=1${cohortIdFromUrl ? '&cohortPlaced=1' : ''}`}>
                <Button>Vào khóa học ngay</Button>
              </Link>
              <Link href="/my-orders">
                <Button variant="ghost">Lịch sử thanh toán</Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </main>
  )
}
