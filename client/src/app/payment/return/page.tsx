'use client'

/**
 * Landing page after the VNPay hosted-redirect flow.
 *
 * The actual fulfillment happens via the server-side IPN callback
 * (`GET /api/payments/ipn`) — this page is purely UI: it shows the user a
 * confirmation while the IPN may still be racing, then links them into the
 * paid course once their enrollment is visible.
 *
 * Query params (set by `GET /api/payments/return` → redirect):
 *   slug   — course slug
 *   txn    — VNPay vnp_TxnRef
 *   status — 'success' | 'failed' | 'invalid' | 'error'
 */

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button, Card } from '@/design-system'
import { fetchPaymentStatus } from '@/features/payment/public'

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" aria-busy />}>
      <PaymentReturnInner />
    </Suspense>
  )
}

function PaymentReturnInner() {
  const params = useSearchParams()
  const slug = params.get('slug') || ''
  const txn = params.get('txn') || ''
  const status = (params.get('status') || '').toLowerCase()

  // Server reports 'success' as soon as VNPay return-URL is verified, but
  // the enrollment is fulfilled by IPN — poll a few times so the user sees
  // their course immediately if both calls completed.
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (status !== 'success' || !txn) return
    let cancelled = false
    let attempts = 0
    const tick = async () => {
      attempts += 1
      const s = await fetchPaymentStatus(txn)
      if (cancelled) return
      if (s?.status === 'completed') {
        setConfirmed(true)
        return
      }
      if (attempts < 5) window.setTimeout(tick, 1500)
    }
    tick()
    return () => {
      cancelled = true
    }
  }, [status, txn])

  const isSuccess = status === 'success'

  return (
    <main className="surface-edu min-h-screen flex items-center justify-center px-4 py-16">
      <Card className="max-w-md w-full text-center space-y-4 p-ds-content">
        <div
          aria-hidden
          className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center text-2xl ${
            isSuccess ? 'bg-ds-accent-soft text-ds-accent' : 'bg-ds-warning-soft text-ds-warning'
          }`}
        >
          {isSuccess ? '✓' : '!'}
        </div>

        <h1 className="text-xl font-semibold text-ds-text">
          {isSuccess ? 'Thanh toán thành công' : 'Giao dịch không hoàn tất'}
        </h1>

        {isSuccess ? (
          <p className="text-sm text-ds-muted">
            {confirmed
              ? 'Bạn đã được enroll vào khoá học.'
              : 'Đang xác nhận từ VNPay… việc enroll sẽ tự động kích hoạt trong vài giây.'}
          </p>
        ) : (
          <p className="text-sm text-ds-muted">
            {status === 'invalid'
              ? 'Chữ ký URL từ VNPay không hợp lệ.'
              : status === 'failed'
                ? 'VNPay báo giao dịch không thành công.'
                : 'Đã xảy ra lỗi khi xử lý kết quả thanh toán.'}
          </p>
        )}

        {txn ? <p className="text-xs text-ds-muted font-mono">Mã đơn: {txn}</p> : null}

        <div className="flex flex-col gap-2 pt-2">
          {slug && (
            <Link href={`/courses/${slug}`}>
              <Button className="w-full">Quay lại khoá học</Button>
            </Link>
          )}
          <Link href="/my-courses">
            <Button variant="ghost" className="w-full">
              Xem khoá học của tôi
            </Button>
          </Link>
        </div>
      </Card>
    </main>
  )
}
