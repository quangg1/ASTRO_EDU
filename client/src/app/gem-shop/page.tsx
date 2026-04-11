'use client'

import Link from 'next/link'
import { Store } from 'lucide-react'

export default function GemShopPage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl border border-violet-500/35 bg-violet-500/20 flex items-center justify-center">
          <Store className="w-5 h-5 text-violet-200" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Gem Shop</h1>
          <p className="text-sm text-slate-400">Sắp mở. Bạn sẽ đổi Gem lấy vật phẩm và quyền lợi tại đây.</p>
        </div>
      </header>

      <section className="rounded-2xl border border-white/10 bg-[#0c0a12] p-6">
        <p className="text-slate-300 text-sm">Hiện tại shop chưa bật mua vật phẩm.</p>
        <p className="text-slate-500 text-sm mt-2">
          Mình đã dựng route và giao diện nền để nối hệ thống reward sau.
        </p>
        <Link href="/gem" className="inline-block mt-4 text-cyan-400 text-sm hover:underline">
          Quay lại ví Gem →
        </Link>
      </section>
    </div>
  )
}
