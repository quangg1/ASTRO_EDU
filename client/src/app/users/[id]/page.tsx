'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft, Gem } from 'lucide-react'
import { AvatarWithDecoration } from '@/components/profile/AvatarWithDecoration'
import { LearnerTierBadge } from '@/components/profile/LearnerTierBadge'
import { useAuthStore } from '@/features/auth/public'
import { fetchPublicUserProfile, type PublicUserProfile } from '@/features/users/public'
import { formatGemsEarnedRange } from '@/features/rewards/public'

function roleLabelVi(role: string): string | null {
  switch (role) {
    case 'teacher':
      return 'Giảng viên'
    case 'moderator':
      return 'Điều hành viên'
    case 'admin':
      return 'Quản trị'
    default:
      return null
  }
}

function formatMemberSince(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(+d)) return ''
  return d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
}

export default function PublicUserProfilePage() {
  const params = useParams()
  const userId = String(params?.id ?? '').trim()
  const { user: me } = useAuthStore()
  const [profile, setProfile] = useState<PublicUserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const isSelf = me?.id && userId && String(me.id) === userId

  useEffect(() => {
    if (!userId) {
      setNotFound(true)
      setLoading(false)
      return
    }
    let cancelled = false
    void fetchPublicUserProfile(userId).then((data) => {
      if (cancelled) return
      if (!data) {
        setNotFound(true)
        setProfile(null)
      } else {
        setProfile(data)
        setNotFound(false)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-sm text-slate-500">Đang tải hồ sơ…</p>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-black px-4 pt-20 pb-12 max-w-lg mx-auto">
        <Link href="/community" className="text-sm text-cyan-400 hover:text-cyan-300 mb-6 inline-block">
          ← Cộng đồng
        </Link>
        <h1 className="text-xl font-semibold text-white">Không tìm thấy hồ sơ</h1>
        <p className="mt-2 text-sm text-slate-500">Người dùng này không tồn tại hoặc đã ngừng hoạt động.</p>
      </div>
    )
  }

  const roleChip = roleLabelVi(profile.role)
  const tier = profile.learnerTier

  return (
    <div className="min-h-screen bg-black">
      <main className="pt-20 px-4 pb-12 max-w-lg mx-auto">
        <Link
          href="/community"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-cyan-300 mb-6"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Cộng đồng
        </Link>

        <section className="glass rounded-2xl p-6 sm:p-8 text-center">
          <div className="flex justify-center mb-4">
            <AvatarWithDecoration
              avatarUrl={profile.avatar}
              displayName={profile.displayName}
              overlayUrl={profile.equippedOverlayUrl}
              size="xl"
            />
          </div>

          <h1 className="text-2xl font-bold text-white">{profile.displayName}</h1>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <LearnerTierBadge tierId={tier.id} size="lg" />
            <span className="text-sm font-medium text-cyan-100">
              {tier.emoji} {tier.nameVi}
            </span>
            {roleChip && (
              <span className="text-xs px-2.5 py-0.5 rounded-full border border-violet-400/35 bg-violet-500/15 text-violet-200">
                {roleChip}
              </span>
            )}
          </div>

          <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">{tier.taglineVi}</p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-400">
            <Gem className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
            <span>
              {profile.totalGemsEarned.toLocaleString('vi-VN')} gem đã kiếm · {formatGemsEarnedRange(tier)}
            </span>
          </div>

          {tier.checkoutDiscountPct > 0 && (
            <p className="mt-3 text-xs text-cyan-200/80">
              Ưu đãi hạng: giảm {tier.checkoutDiscountPct}% khóa trả phí (không trừ gem)
            </p>
          )}
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-[#0c0a12] p-4 text-center">
            <p className="text-2xl font-semibold text-white tabular-nums">{profile.stats.postCount}</p>
            <p className="text-xs text-slate-500 mt-1">Bài viết</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0c0a12] p-4 text-center">
            <p className="text-2xl font-semibold text-white tabular-nums">{profile.stats.commentCount}</p>
            <p className="text-xs text-slate-500 mt-1">Bình luận</p>
          </div>
        </section>

        {profile.memberSince && (
          <p className="mt-4 text-center text-xs text-slate-600">
            Thành viên từ {formatMemberSince(profile.memberSince)}
          </p>
        )}

        <ul className="mt-6 space-y-2 text-sm text-slate-300">
          {tier.perks.map((p) => (
            <li key={p.id} className="flex gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
              <span className="text-cyan-400 shrink-0">✓</span>
              <span className={p.highlight ? 'text-slate-100' : ''}>{p.labelVi}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {isSelf ? (
            <Link
              href="/profile"
              className="px-4 py-2 rounded-lg bg-cyan-600/25 border border-cyan-500/40 text-cyan-100 text-sm hover:bg-cyan-600/35"
            >
              Chỉnh sửa hồ sơ của tôi
            </Link>
          ) : null}
          <Link
            href="/gem/tiers"
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/15 text-slate-300 text-sm hover:bg-white/10"
          >
            Các hạng Learner
          </Link>
        </div>
      </main>
    </div>
  )
}
