'use client'

import { cn } from '@/lib/cn'
import { useT } from '@/i18n/public'

export type LearnerTierId =
  | 'observer'
  | 'navigator'
  | 'astronomer'
  | 'pioneer'
  | 'voyager'
  | string

type Size = 'xs' | 'sm' | 'md' | 'lg'

const SIZE_PX: Record<Size, number> = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 36,
}

const TIER_META: Record<
  string,
  { label: string; ring: string; fill: string; accent: string }
> = {
  observer: {
    label: 'Observer',
    ring: '#475569',
    fill: '#1e293b',
    accent: '#94a3b8',
  },
  navigator: {
    label: 'Navigator',
    ring: '#0e7490',
    fill: '#164e63',
    accent: '#22d3ee',
  },
  astronomer: {
    label: 'Astronomer',
    ring: '#ca8a04',
    fill: '#713f12',
    accent: '#fde047',
  },
  pioneer: {
    label: 'Pioneer',
    ring: '#7c3aed',
    fill: '#4c1d95',
    accent: '#c4b5fd',
  },
  voyager: {
    label: 'Voyager',
    ring: '#db2777',
    fill: '#831843',
    accent: '#f9a8d4',
  },
}

function TierGlyph({ tierId, px }: { tierId: string; px: number }) {
  const s = px
  const c = s / 2
  switch (tierId) {
    case 'navigator':
      return (
        <>
          <circle cx={c} cy={c} r={s * 0.38} fill="none" stroke="currentColor" strokeWidth={s * 0.07} />
          <path
            d={`M${c} ${s * 0.2} L${c} ${s * 0.55} M${c - s * 0.18} ${s * 0.38} L${c} ${s * 0.2} L${c + s * 0.18} ${s * 0.38}`}
            stroke="currentColor"
            strokeWidth={s * 0.07}
            strokeLinecap="round"
            fill="none"
          />
        </>
      )
    case 'astronomer':
      return (
        <path
          d={`M${c} ${s * 0.18} L${c + s * 0.1} ${s * 0.42} L${c + s * 0.36} ${s * 0.44} L${c + s * 0.16} ${s * 0.58} L${c + s * 0.24} ${s * 0.82} L${c} ${s * 0.66} L${c - s * 0.24} ${s * 0.82} L${c - s * 0.16} ${s * 0.58} L${c - s * 0.36} ${s * 0.44} L${c - s * 0.1} ${s * 0.42} Z`}
          fill="currentColor"
        />
      )
    case 'pioneer':
      return (
        <path
          d={`M${c} ${s * 0.14} L${c + s * 0.14} ${s * 0.72} L${c} ${s * 0.58} L${c - s * 0.14} ${s * 0.72} Z`}
          fill="currentColor"
        />
      )
    case 'voyager':
      return (
        <>
          <circle cx={c} cy={c} r={s * 0.12} fill="currentColor" />
          <path
            d={`M${c} ${s * 0.22} L${c + s * 0.28} ${c} L${c} ${c + s * 0.28} L${c - s * 0.28} ${c} Z`}
            fill="currentColor"
            opacity={0.85}
          />
        </>
      )
    default:
      return <circle cx={c} cy={c} r={s * 0.22} fill="currentColor" opacity={0.9} />
  }
}

type Props = {
  tierId: LearnerTierId
  size?: Size
  className?: string
  showTooltip?: boolean
  title?: string
}

/** Huy hiệu hạng Learner — SVG shield, dùng trên hồ sơ công khai & cộng đồng. */
export function LearnerTierBadge({
  tierId,
  size = 'sm',
  className = '',
  showTooltip = true,
  title,
}: Props) {
  const { t } = useT()
  const id = String(tierId || 'observer').toLowerCase()
  const meta = TIER_META[id] ?? TIER_META.observer
  const px = SIZE_PX[size]
  const tip = title || t('tiers.rankTooltip', { label: meta.label })

  return (
    <span
      className={cn('inline-flex shrink-0 align-middle', className)}
      title={showTooltip ? tip : undefined}
      aria-label={tip}
      role="img"
    >
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        className="drop-shadow-sm"
        aria-hidden
      >
        <defs>
          <linearGradient id={`tier-shield-${id}-${px}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={meta.fill} />
            <stop offset="100%" stopColor={meta.ring} />
          </linearGradient>
        </defs>
        <path
          d={`M${px / 2} ${px * 0.06} L${px * 0.92} ${px * 0.28} L${px * 0.78} ${px * 0.88} L${px / 2} ${px * 0.98} L${px * 0.22} ${px * 0.88} L${px * 0.08} ${px * 0.28} Z`}
          fill={`url(#tier-shield-${id}-${px})`}
          stroke={meta.ring}
          strokeWidth={px * 0.04}
        />
        <g style={{ color: meta.accent }}>
          <TierGlyph tierId={id} px={px} />
        </g>
      </svg>
    </span>
  )
}

export function learnerTierLabel(tierId: LearnerTierId): string {
  const id = String(tierId || 'observer').toLowerCase()
  return TIER_META[id]?.label ?? 'Observer'
}
