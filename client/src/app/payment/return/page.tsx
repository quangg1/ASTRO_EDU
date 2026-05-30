'use client'

/**
 * Trang xác nhận sau thanh toán (deep link / bookmark).
 * Luồng chính redirect thẳng từ checkout → khóa học.
 *
 * Query: slug, txn, status=success|failed
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button, Card } from '@/design-system'

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

        <p className="text-sm text-ds-muted">
          {isSuccess
            ? 'Bạn đã được ghi danh vào khóa học.'
            : status === 'failed'
              ? 'Giao dịch không thành công hoặc đã bị huỷ.'
              : 'Đã xảy ra lỗi khi xử lý kết quả thanh toán.'}
        </p>

        {txn ? <p className="text-xs text-ds-muted font-mono">Mã đơn: {txn}</p> : null}

        <div className="flex flex-col gap-2 pt-2">
          {slug && (
            <Link href={`/courses/${slug}?enrolled=1`}>
              <Button className="w-full">Vào khóa học</Button>
            </Link>
          )}
          <Link href="/my-orders">
            <Button variant="ghost" className="w-full">
              Lịch sử thanh toán
            </Button>
          </Link>
          <Link href="/my-courses">
            <Button variant="ghost" className="w-full">
              Khóa học của tôi
            </Button>
          </Link>
        </div>
      </Card>
    </main>
  )
}
