'use client'

import Link from 'next/link'
import { AvatarWithDecoration } from '@/components/profile/AvatarWithDecoration'
import { LearnerTierBadge } from '@/components/profile/LearnerTierBadge'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n/public'

type Size = 'sm' | 'md'

type LearnerTierSnippet = {
  id: string
  nameVi?: string
  emoji?: string
}

type Props = {
  userId: string
  displayName: string
  avatarUrl?: string | null
  overlayUrl?: string | null
  learnerTier?: LearnerTierSnippet | null
  size?: Size
  showName?: boolean
  showTierBadge?: boolean
  className?: string
  nameClassName?: string
  /** Tránh nested link (vd. card bài viết). */
  stopPropagation?: boolean
}

export function userProfilePath(userId: string): string {
  return `/users/${encodeURIComponent(String(userId).trim())}`
}

/**
 * Avatar (+ tên + huy hiệu hạng) dẫn tới hồ sơ công khai.
 */
export function UserProfileLink({
  userId,
  displayName,
  avatarUrl,
  overlayUrl,
  learnerTier,
  size = 'sm',
  showName = true,
  showTierBadge = true,
  className = '',
  nameClassName = '',
  stopPropagation = false,
}: Props) {
  const { t } = useT()
  const id = String(userId || '').trim()
  if (!id) {
    return (
      <span className={cn('inline-flex items-center gap-2 min-w-0', className)}>
        <AvatarWithDecoration
          avatarUrl={avatarUrl}
          displayName={displayName}
          overlayUrl={overlayUrl}
          size={size === 'md' ? 'md' : 'sm'}
        />
        {showName && <span className={cn('truncate text-sm text-ds-muted', nameClassName)}>{displayName}</span>}
      </span>
    )
  }

  const href = userProfilePath(id)
  const tierId = learnerTier?.id

  return (
    <Link
      href={href}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={cn(
        'inline-flex items-center gap-2 min-w-0 rounded-lg transition-colors hover:bg-white/[0.06] -m-1 p-1',
        className,
      )}
    >
      <AvatarWithDecoration
        avatarUrl={avatarUrl}
        displayName={displayName}
        overlayUrl={overlayUrl}
        size={size === 'md' ? 'md' : 'sm'}
      />
      {showName && (
        <span className={cn('truncate text-sm text-slate-200 group-hover:text-white', nameClassName)}>
          {displayName}
        </span>
      )}
      {showTierBadge && tierId && (
        <LearnerTierBadge
          tierId={tierId}
          size="xs"
          title={learnerTier?.nameVi ? t('tiers.profileTooltip', { name: learnerTier.nameVi }) : undefined}
        />
      )}
    </Link>
  )
}
