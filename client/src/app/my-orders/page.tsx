'use client'

import { OrderHistoryClient } from '@/features/payment/public'

export default function MyOrdersPage() {
  return (
    <div className="px-4 py-8 sm:py-10">
      <OrderHistoryClient />
    </div>
  )
}
