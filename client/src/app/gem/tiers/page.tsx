'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronLeft } from 'lucide-react'
import { Button, Card } from '@/design-system'
import { LearnerTierBadge } from '@/components/profile/LearnerTierBadge'
import {
  fetchLearnerTiersWithProgress,
  formatGemsEarnedRange,
  type LearnerTierPublic,
  type LearnerTierProgress,
} from '@/features/rewards/public'

const COMPARE_ROWS: { key: string; label: string; value: (t: LearnerTierPublic) => string | boolean }[] = [
  {
    key: 'checkout',
    label: 'Giảm giá khóa trả phí (không trừ gem)',
    value: (t) => (t.checkoutDiscountPct > 0 ? `${t.checkoutDiscountPct}%` : '—'),
  },
  {
    key: 'badge',
    label: 'Huy hiệu hồ sơ',
    value: (t) => t.id !== 'observer',
  },
  {
    key: 'cosmetic',
    label: 'Trang trí / hiệu ứng avatar',
    value: (t) => t.perks.some((p) => /trail|khung|trang trí|cosmetic/i.test(p.labelVi)),
  },
  {
    key: 'beta',
    label: 'Ưu tiên beta',
    value: (t) => t.id === 'pioneer' || t.id === 'voyager',
  },
  {
    key: 'featured',
    label: 'Nổi bật cộng đồng',
    value: (t) => t.id === 'voyager',
  },
]

function TierColumn({
  tier,
  isCurrent,
  isNext,
}: {
  tier: LearnerTierPublic
  isCurrent: boolean
  isNext: boolean
}) {
  const accent =
    tier.id === 'voyager'
      ? 'border-amber-400/50 bg-gradient-to-b from-amber-500/10 to-transparent'
      : tier.id === 'pioneer'
        ? 'border-violet-400/45 bg-gradient-to-b from-violet-500/10 to-transparent'
        : isCurrent
          ? 'border-cyan-400/50 bg-cyan-500/5 ring-1 ring-cyan-400/30'
          : 'border-ds-border bg-ds-elevated'

  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-5 sm:p-6 ${accent}`}
    >
      {isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#0a0f18]">
          Hạng của bạn
        </span>
      )}
      {isNext && !isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-[#1a1528] px-3 py-0.5 text-[10px] font-medium text-ds-muted">
          Tiếp theo
        </span>
      )}
      <div className="text-center pt-2">
        <div className="flex justify-center">
          <LearnerTierBadge tierId={tier.id} size="lg" />
        </div>
        <h2 className="mt-2 text-lg font-semibold text-white">
          {tier.emoji} {tier.nameVi}
        </h2>
        <p className="mt-1 text-xs text-ds-muted">{formatGemsEarnedRange(tier)}</p>
        {tier.checkoutDiscountPct > 0 && (
          <p className="mt-3 text-sm font-medium text-cyan-200">
            Giảm {tier.checkoutDiscountPct}% khi mua khóa
          </p>
        )}
      </div>
      <ul className="mt-5 flex-1 space-y-2.5 text-sm">
        {tier.perks.map((perk) => (
          <li key={perk.id} className="flex gap-2 text-ds-muted">
            <Check
              className={`mt-0.5 h-4 w-4 shrink-0 ${perk.highlight ? 'text-cyan-400' : 'text-ds-subtle'}`}
              aria-hidden
            />
            <span className={perk.highlight ? 'text-slate-100' : ''}>{perk.labelVi}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ds-subtle leading-relaxed border-t border-white/5 pt-4">
        {tier.taglineVi}
      </p>
    </article>
  )
}

function ProgressBanner({ progress, gemBalance }: { progress: LearnerTierProgress; gemBalance: number }) {
  const { current, next, gemsEarned, gemsToNext, progressPct } = progress
  return (
    <Card className="p-5 sm:p-6 border-cyan-500/25 bg-ds-elevated">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-ds-subtle">Hạng hiện tại</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {current.emoji} {current.nameVi}
          </p>
          <p className="mt-1 text-sm text-ds-muted">
            {gemsEarned.toLocaleString('vi-VN')} gem đã kiếm · Số dư {gemBalance.toLocaleString('vi-VN')}
          </p>
        </div>
        {next && (
          <div className="min-w-[200px] flex-1 max-w-md">
            <div className="flex justify-between text-xs text-ds-muted mb-1.5">
              <span>Tiến tới {next.emoji} {next.nameVi}</span>
              <span className="tabular-nums">{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-ds-subtle">
              Còn {gemsToNext.toLocaleString('vi-VN')} gem đã kiếm
            </p>
          </div>
        )}
        {!next && (
          <p className="text-sm text-amber-200/90">Bạn đã đạt hạng cao nhất — cảm ơn vì đồng hành!</p>
        )}
      </div>
    </Card>
  )
}

export default function LearnerTiersPage() {
  const [loading, setLoading] = useState(true)
  const [tiers, setTiers] = useState<LearnerTierPublic[]>([])
  const [policyVi, setPolicyVi] = useState('')
  const [progress, setProgress] = useState<LearnerTierProgress | null>(null)
  const [gemBalance, setGemBalance] = useState(0)

  useEffect(() => {
    let cancelled = false
    void fetchLearnerTiersWithProgress().then((data) => {
      if (cancelled || !data) {
        setLoading(false)
        return
      }
      setTiers(data.catalog.tiers)
      setPolicyVi(data.catalog.policyVi)
      setProgress(data.progress)
      setGemBalance(data.gemBalance)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const currentId = progress?.current.id ?? null
  const nextId = progress?.next?.id ?? null

  const sortedTiers = useMemo(() => [...tiers].sort((a, b) => a.order - b.order), [tiers])

  return (
    <div className="space-y-8 max-w-6xl pb-12">
      <header>
        <Link
          href="/gem"
          className="inline-flex items-center gap-1 text-sm text-ds-muted hover:text-cyan-200 mb-4"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Về Gem
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
          Hạng Learner
        </h1>
        <p className="mt-2 text-sm text-ds-muted max-w-2xl leading-relaxed">
          {policyVi ||
            'Tiến bộ theo tổng gem bạn đã kiếm khi học — không mất hạng khi tiêu gem. Giống các gói Pro trên nền tảng khác, mỗi hạng mở thêm quyền lợi; tại checkout chỉ chọn một ưu đãi.'}
        </p>
      </header>

      {loading && (
        <p className="text-sm text-ds-subtle py-12 text-center">Đang tải hạng…</p>
      )}

      {!loading && progress && (
        <ProgressBanner progress={progress} gemBalance={gemBalance} />
      )}

      {!loading && sortedTiers.length > 0 && (
        <>
          <section
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
            aria-label="So sánh các hạng"
          >
            {sortedTiers.map((tier) => (
              <TierColumn
                key={tier.id}
                tier={tier}
                isCurrent={tier.id === currentId}
                isNext={tier.id === nextId}
              />
            ))}
          </section>

          <section className="rounded-2xl border border-ds-border overflow-hidden">
            <h2 className="sr-only">Bảng so sánh chi tiết</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-ds-border bg-white/[0.03]">
                    <th className="text-left p-4 text-ds-muted font-medium w-[40%]">Quyền lợi</th>
                    {sortedTiers.map((t) => (
                      <th
                        key={t.id}
                        className={`p-4 text-center font-medium ${
                          t.id === currentId ? 'text-cyan-200' : 'text-ds-muted'
                        }`}
                      >
                        <span className="block text-lg" aria-hidden>
                          {t.emoji}
                        </span>
                        {t.nameVi}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row) => (
                    <tr key={row.key} className="border-b border-white/5">
                      <td className="p-4 text-ds-muted">{row.label}</td>
                      {sortedTiers.map((t) => {
                        const v = row.value(t)
                        return (
                          <td key={t.id} className="p-4 text-center text-slate-200">
                            {typeof v === 'boolean' ? (
                              v ? (
                                <Check className="inline h-4 w-4 text-cyan-400" aria-label="Có" />
                              ) : (
                                <span className="text-slate-600">—</span>
                              )
                            ) : (
                              v
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-ds-border bg-ds-elevated p-5 text-sm text-ds-muted space-y-2">
        <p>
          <strong className="text-slate-200">Thanh toán:</strong> Coupon, voucher gem (đốt gem), hoặc giảm giá hạng —
          chỉ một loại mỗi đơn. Nếu hạng của bạn đã cho % cao hơn voucher, hệ thống tự áp ưu đãi hạng.
        </p>
        <p>
          <strong className="text-slate-200">Pioneer trở lên:</strong> Giảm 10–15%, trang trí độc quyền, và ưu tiên
          mời thử tính năng beta theo từng đợt.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/gem">
          <Button type="button" variant="secondary">
            Xem ví Gem
          </Button>
        </Link>
        <Link href="/courses">
          <Button type="button" variant="ghost">
            Khám phá khóa học
          </Button>
        </Link>
      </div>
    </div>
  )
}
