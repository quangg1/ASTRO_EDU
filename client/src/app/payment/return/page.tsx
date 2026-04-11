'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function PaymentReturnContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === '1' || searchParams.get('enrolled') === '1'
  const slug = searchParams.get('slug')
  const error = searchParams.get('error')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black pt-20 px-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0a0f17] p-8 text-center">
        {success ? (
          <>
            <p className="text-2xl mb-2">✓ Payment successful</p>
            <p className="text-gray-400 text-sm mb-6">Your course is unlocked. Start learning now.</p>
            {slug ? (
              <Link
                href={`/courses/${slug}`}
                className="inline-block px-6 py-3 rounded-xl bg-cyan-600 text-white font-medium hover:bg-cyan-500"
              >
                Go to course
              </Link>
            ) : (
              <Link href="/courses" className="inline-block px-6 py-3 rounded-xl bg-cyan-600 text-white font-medium hover:bg-cyan-500">
                Browse courses
              </Link>
            )}
          </>
        ) : (
          <>
            <p className="text-xl text-amber-300 mb-2">Payment not completed</p>
            <p className="text-gray-400 text-sm mb-6">
              {error === 'payment_failed' && 'The transaction failed or was cancelled.'}
              {error === 'order_not_found' && 'Order not found.'}
              {error === 'server' && 'Server error. Please try again later.'}
              {!error && 'You exited the checkout page.'}
            </p>
            {slug ? (
              <Link
                href={`/courses/${slug}`}
                className="inline-block px-6 py-3 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20"
              >
                Back to course
              </Link>
            ) : (
              <Link href="/courses" className="inline-block px-6 py-3 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20">
                Courses
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
    <Suspense fallback={<div className="min-h-screen bg-black pt-20 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <PaymentReturnContent />
    </Suspense>
  )
}
