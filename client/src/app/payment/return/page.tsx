'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { viText } from '@/messages/vi'

function PaymentReturnContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === '1' || searchParams.get('enrolled') === '1'
  const slug = searchParams.get('slug')
  const error = searchParams.get('error')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!mounted) return
    trackEvent('payment_return_viewed', {
      success,
      slug: slug || null,
      error: error || null,
    })
  }, [mounted, success, slug, error])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <p className="text-gray-500">{viText.common.loading}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black pt-20 px-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0a0f17] p-8 text-center">
        {success ? (
          <>
            <p className="text-2xl mb-2">✓ {viText.payment.successTitle}</p>
            <p className="text-gray-400 text-sm mb-6">{viText.payment.successSubtitle}</p>
            {slug ? (
              <Link
                href={`/courses/${slug}`}
                className="inline-block px-6 py-3 rounded-xl bg-cyan-600 text-white font-medium hover:bg-cyan-500"
              >
                {viText.payment.goToCourse}
              </Link>
            ) : (
              <Link href="/courses" className="inline-block px-6 py-3 rounded-xl bg-cyan-600 text-white font-medium hover:bg-cyan-500">
                {viText.payment.browseCourses}
              </Link>
            )}
          </>
        ) : (
          <>
            <p className="text-xl text-amber-300 mb-2">{viText.payment.failedTitle}</p>
            <p className="text-gray-400 text-sm mb-6">
              {error === 'payment_failed' && viText.payment.failedPayment}
              {error === 'order_not_found' && viText.payment.failedOrder}
              {error === 'server' && viText.payment.failedServer}
              {!error && viText.payment.failedDefault}
            </p>
            {slug ? (
              <Link
                href={`/courses/${slug}`}
                className="inline-block px-6 py-3 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20"
              >
                {viText.payment.backToCourse}
              </Link>
            ) : (
              <Link href="/courses" className="inline-block px-6 py-3 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20">
                {viText.nav.courses}
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black pt-20 flex items-center justify-center"><p className="text-gray-500">{viText.common.loading}</p></div>}>
      <PaymentReturnContent />
    </Suspense>
  )
}
