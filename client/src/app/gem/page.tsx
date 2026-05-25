'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Gem, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import { LearnerTierBadge } from '@/components/profile/LearnerTierBadge'
import { loadGemWallet, syncGemWallet, type GemWalletState } from '@/features/rewards/public'

function formatTransactionDate(input: string) {
  const date = new Date(input)
  if (Number.isNaN(+date)) return ''
  return date.toLocaleDateString('vi-VN')
}

export default function GemPage() {
  const { user } = useAuthStore()
  const userId = user?.id ?? null
  const [wallet, setWallet] = useState<GemWalletState>({ balance: 0, transactions: [] })

  useEffect(() => {
    const refresh = () => setWallet(loadGemWallet(userId))
    refresh()
    void syncGemWallet(userId).then((next) => setWallet(next))
    window.addEventListener('gem-wallet-changed', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('gem-wallet-changed', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [userId])

  const earnWays = useMemo(
    () => [
      { label: 'Hoàn thành bài học (lộ trình, đủ thời gian)', reward: '+5 Gem' },
      { label: 'Hoàn thành depth / recall quiz', reward: '+8–20 Gem' },
      { label: 'Khám phá thực thể 3D (Deep History)', reward: '+5 Gem' },
      { label: 'Duy trì chuỗi ngày học', reward: 'Streak' },
    ],
    [],
  )

  return (
    <div className="space-y-5 max-w-3xl">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Gem</h1>
        <Link
          href="/gem-shop"
          className="inline-flex items-center rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/30 transition-colors"
        >
          Vào cửa hàng
        </Link>
      </header>

      <section className="rounded-2xl border border-white/10 bg-[#0c0a12] p-5">
        <p className="text-sm text-slate-300 leading-relaxed">
          Gem là phần thưởng học tập — ghi nhận effort của học sinh. Gem giúp học sinh tiết kiệm khi đầu tư thêm,
          không phải thay thế đầu tư đó. Khóa học trả phí thanh toán trên trang checkout; gem chỉ dùng voucher
          giảm giá tối đa 15% hoặc mở thử module.
        </p>
      </section>

      {wallet.learnerTier && (
        <Link
          href="/gem/tiers"
          className="block rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 p-5 hover:border-violet-400/45 transition-colors group"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-slate-500">Hạng Learner</p>
              <p className="mt-1 text-lg font-semibold text-white flex items-center gap-2">
                <LearnerTierBadge tierId={wallet.learnerTier.current.id} size="md" />
                {wallet.learnerTier.current.emoji} {wallet.learnerTier.current.nameVi}
              </p>
              {wallet.learnerTier.next ? (
                <p className="mt-1 text-xs text-slate-400">
                  {(wallet.totalGemsEarned ?? wallet.learnerTier.gemsEarned).toLocaleString('vi-VN')} gem đã kiếm ·
                  Còn {wallet.learnerTier.gemsToNext.toLocaleString('vi-VN')} tới{' '}
                  {wallet.learnerTier.next.emoji} {wallet.learnerTier.next.nameVi}
                </p>
              ) : (
                <p className="mt-1 text-xs text-amber-200/80">Hạng cao nhất</p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-cyan-300 shrink-0" aria-hidden />
          </div>
          {wallet.learnerTier.next && (
            <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                style={{ width: `${wallet.learnerTier.progressPct}%` }}
              />
            </div>
          )}
          {wallet.learnerTier.current.checkoutDiscountPct > 0 && (
            <p className="mt-3 text-xs text-cyan-200/90">
              Giảm {wallet.learnerTier.current.checkoutDiscountPct}% khóa trả phí (không trừ gem) — xem so sánh hạng
            </p>
          )}
        </Link>
      )}

      <section className="rounded-2xl border border-cyan-500/35 bg-[#101224] p-5 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
        <div className="mx-auto max-w-sm rounded-2xl border border-cyan-500/35 bg-[#0d1020] py-9 px-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-500/35">
            <Gem className="h-8 w-8 text-cyan-300" />
          </div>
          <p className="text-5xl font-bold text-cyan-100 tabular-nums">{wallet.balance}</p>
          <p className="mt-1 text-xs tracking-[0.35em] text-slate-500 uppercase">Gem</p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0c0a12] p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Cách kiếm Gem</h2>
        <ul className="space-y-2">
          {earnWays.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-300">{item.label}</span>
              <span className="text-cyan-300 font-medium">{item.reward}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0c0a12] p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Lịch sử giao dịch</h2>
        {wallet.transactions.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có giao dịch Gem.</p>
        ) : (
          <ul className="space-y-2">
            {wallet.transactions.slice(0, 8).map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-200">{tx.reason}</p>
                  <p className="text-xs text-slate-500">{formatTransactionDate(tx.createdAt)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-200 tabular-nums">
                  {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
