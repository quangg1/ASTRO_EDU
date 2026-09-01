'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  BookOpen,
  ChevronLeft,
  Gem,
  GraduationCap,
  MapPin,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { MessageUserButton } from '@/components/messages/MessageUserButton'
import { useAuthStore } from '@/features/auth/public'
import {
  AvatarWithDecoration,
  LearnerTierBadge,
  fetchPublicUserProfile,
  type PublicUserProfile,
} from '@/features/users/public'
import { formatGemsEarnedRange } from '@/features/rewards/public'
import { useT } from '@/i18n/public'

function formatMemberSince(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(+d)) return ''
  return d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
}

export default function PublicUserProfilePage() {
  const { t } = useT()
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
      <div className="relative z-10 flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-ds-accent/30 border-t-ds-accent animate-spin" />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="relative z-10 px-4 pt-2 pb-12 max-w-lg mx-auto">
        <Link href="/community" className="text-sm text-ds-accent hover:text-ds-text mb-6 inline-block">
          {t('community.backLink')}
        </Link>
        <h1 className="text-xl font-semibold text-white">{t('publicUser.notFound')}</h1>
        <p className="mt-2 text-sm text-ds-subtle">{t('publicUser.notFoundDesc')}</p>
      </div>
    )
  }

  const roleChip =
    profile.role === 'teacher'
      ? t('publicUser.roleTeacher')
      : profile.role === 'moderator'
        ? t('publicUser.roleModerator')
        : profile.role === 'admin'
          ? t('publicUser.roleAdmin')
          : null
  const tier = profile.learnerTier
  const lp = profile.learnerProfile
  const hasBio = Boolean(lp?.bio?.trim())
  const hasEducation = (lp?.education?.length ?? 0) > 0
  const hasInterests = (lp?.interests?.length ?? 0) > 0

  return (
    <div className="relative z-10 overflow-x-hidden text-ds-text">
      <main className="relative pt-2 pb-16 px-4 max-w-3xl mx-auto">
        <Link
          href="/community"
          className="inline-flex items-center gap-1 text-sm text-ds-muted hover:text-ds-text mb-6"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {t('nav.community')}
        </Link>

        {/* Hero */}
        <section className="relative rounded-3xl border border-cyan-500/20 overflow-hidden mb-6">
          <div
            className="absolute inset-0 bg-gradient-to-br from-cyan-950/80 via-[#0a0f24] to-violet-950/60"
            aria-hidden
          />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(var(--color-accent-strong) 1px, transparent 1px), linear-gradient(90deg, var(--color-accent-strong) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
            aria-hidden
          />

          <div className="relative px-6 sm:px-10 pt-10 pb-8 text-center">
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div
                  className="absolute -inset-3 rounded-full bg-cyan-400/20 blur-xl"
                  aria-hidden
                />
                <AvatarWithDecoration
                  avatarUrl={profile.avatar}
                  displayName={profile.displayName}
                  overlayUrl={profile.equippedOverlayUrl}
                  size="xl"
                />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              {profile.displayName}
            </h1>

            {lp?.location ? (
              <p className="mt-2 text-sm text-ds-muted inline-flex items-center justify-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-cyan-500/80" aria-hidden />
                {lp.location}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <LearnerTierBadge tierId={tier.id} size="lg" />
              <span className="text-sm font-medium text-ds-text">
                {tier.emoji} {tier.nameVi}
              </span>
              {roleChip ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full border border-violet-400/35 bg-violet-500/15 text-violet-200">
                  {roleChip}
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-sm text-ds-muted max-w-md mx-auto leading-relaxed">
              {tier.taglineVi}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {!isSelf ? <MessageUserButton userId={profile.id} displayName={profile.displayName} /> : null}
              {isSelf ? (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-ds-text text-sm hover:bg-ds-accent/15"
                >
                  {t('publicUser.editProfile')}
                </Link>
              ) : null}
              <Link
                href="/messages"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-ds-border bg-white/5 text-ds-muted text-sm hover:bg-white/10"
              >
                <MessageSquare className="h-4 w-4" aria-hidden />
                {t('publicUser.messages')}
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-ds-border bg-white/[0.03] p-4 text-center">
            <p className="text-2xl font-semibold tabular-nums text-white">{profile.stats.postCount}</p>
            <p className="text-[11px] text-ds-subtle mt-1 uppercase tracking-wide">{t('publicUser.statPosts')}</p>
          </div>
          <div className="rounded-xl border border-ds-border bg-white/[0.03] p-4 text-center">
            <p className="text-2xl font-semibold tabular-nums text-white">
              {profile.stats.commentCount}
            </p>
            <p className="text-[11px] text-ds-subtle mt-1 uppercase tracking-wide">{t('publicUser.statComments')}</p>
          </div>
          <div className="rounded-xl border border-ds-border bg-white/[0.03] p-4 text-center col-span-2 sm:col-span-2">
            <p className="text-lg font-semibold text-ds-text inline-flex items-center justify-center gap-1.5">
              <Gem className="h-4 w-4 text-cyan-400" aria-hidden />
              {profile.totalGemsEarned.toLocaleString('vi-VN')}
            </p>
            <p className="text-[11px] text-ds-subtle mt-1">
              {t('publicUser.gemsEarned', { range: formatGemsEarnedRange(tier) })}
            </p>
          </div>
        </div>

        {/* Bio */}
        {hasBio ? (
          <section className="rounded-2xl border border-ds-border bg-ds-surface/40 p-6 mb-4">
            <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-cyan-400/90 mb-3 flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              {t('publicUser.bio')}
            </h2>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-wrap">
              {lp!.bio}
            </p>
          </section>
        ) : !isSelf ? (
          <p className="text-sm text-slate-600 text-center mb-4 italic">
            {t('publicUser.noBioOther')}
          </p>
        ) : (
          <div className="rounded-2xl border border-dashed border-cyan-500/25 bg-cyan-500/[0.04] p-5 mb-4 text-center">
            <p className="text-sm text-ds-muted">
              {t('publicUser.emptyBioSelf')}{' '}
              <Link href="/profile" className="text-cyan-400 hover:underline">
                {t('publicUser.addBio')}
              </Link>{' '}
              {t('publicUser.emptyBioTail')}
            </p>
          </div>
        )}

        {/* Education */}
        {hasEducation ? (
          <section className="rounded-2xl border border-ds-border bg-ds-surface/40 p-6 mb-4">
            <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-cyan-400/90 mb-4 flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden />
              {t('publicUser.education')}
            </h2>
            <ul className="space-y-4">
              {lp!.education.map((edu, i) => (
                <li
                  key={i}
                  className="relative pl-4 border-l-2 border-cyan-500/30"
                >
                  <p className="font-medium text-white">{edu.school || '—'}</p>
                  <p className="text-sm text-ds-muted mt-0.5">
                    {[edu.degree, edu.field].filter(Boolean).join(' · ') || '—'}
                  </p>
                  {edu.yearEnd ? (
                    <p className="text-xs text-ds-subtle mt-1">{t('publicUser.graduated', { year: edu.yearEnd })}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Interests */}
        {hasInterests ? (
          <section className="rounded-2xl border border-ds-border bg-ds-surface/40 p-6 mb-4">
            <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-cyan-400/90 mb-3 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t('publicUser.interests')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {lp!.interests.map((tag) => (
                <span
                  key={tag}
                  className="text-sm px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/20 to-cyan-500/15 border border-violet-400/25 text-violet-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {/* Tier perks */}
        <section className="rounded-2xl border border-ds-border bg-ds-surface/40 p-6 mb-4">
          <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-ds-subtle mb-3">
            {t('publicUser.tierPerks', { tier: tier.nameVi })}
          </h2>
          <ul className="space-y-2 text-sm text-ds-muted">
            {tier.perks.map((p) => (
              <li key={p.id} className="flex gap-2 rounded-lg border border-white/5 px-3 py-2">
                <span className="text-cyan-400 shrink-0">✓</span>
                <span className={p.highlight ? 'text-slate-100' : ''}>{p.labelVi}</span>
              </li>
            ))}
          </ul>
          {tier.checkoutDiscountPct > 0 && (
            <p className="mt-4 text-xs text-cyan-200/80">
              {t('publicUser.checkoutDiscount', { pct: tier.checkoutDiscountPct })}
            </p>
          )}
        </section>

        {profile.memberSince && (
          <p className="text-center text-xs text-slate-600">
            {t('publicUser.memberSince', { date: formatMemberSince(profile.memberSince) })}
          </p>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            href="/gem/tiers"
            className="text-sm text-ds-subtle hover:text-ds-text"
          >
            {t('publicUser.viewTiers')}
          </Link>
        </div>
      </main>
    </div>
  )
}
