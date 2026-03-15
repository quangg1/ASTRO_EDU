'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function PaymentReturnPage() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === '1' || searchParams.get('enrolled') === '1'
  const slug = searchParams.get('slug')
  const error = searchParams.get('error')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <p className="text-gray-500">Đang tải...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black pt-20 px-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0a0f17] p-8 text-center">
        {success ? (
          <>
            <p className="text-2xl mb-2">✓ Thanh toán thành công</p>
            <p className="text-gray-400 text-sm mb-6">Bạn đã mở khóa khóa học. Bắt đầu học ngay.</p>
            {slug ? (
              <Link
                href={`/courses/${slug}`}
                className="inline-block px-6 py-3 rounded-xl bg-cyan-600 text-white font-medium hover:bg-cyan-500"
              >
                Vào khóa học
              </Link>
            ) : (
              <Link href="/courses" className="inline-block px-6 py-3 rounded-xl bg-cyan-600 text-white font-medium hover:bg-cyan-500">
                Danh sách khóa học
              </Link>
            )}
          </>
        ) : (
          <>
            <p className="text-xl text-amber-300 mb-2">Thanh toán chưa hoàn tất</p>
            <p className="text-gray-400 text-sm mb-6">
              {error === 'payment_failed' && 'Giao dịch thất bại hoặc bị hủy.'}
              {error === 'order_not_found' && 'Không tìm thấy đơn hàng.'}
              {error === 'server' && 'Lỗi hệ thống. Vui lòng thử lại sau.'}
              {!error && 'Bạn đã thoát trang thanh toán.'}
            </p>
            {slug ? (
              <Link
                href={`/courses/${slug}`}
                className="inline-block px-6 py-3 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20"
              >
                Quay lại khóa học
              </Link>
            ) : (
              <Link href="/courses" className="inline-block px-6 py-3 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20">
                Khóa học
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}
