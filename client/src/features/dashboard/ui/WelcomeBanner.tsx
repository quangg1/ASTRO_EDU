'use client'

import { Flame } from 'lucide-react'

type Props = {
  userName: string
  userAvatar?: string | null
  onboardingTip?: string
  streakDays: number
}

const chamfer = (cut = 12) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

export function WelcomeBanner({ userName, userAvatar, onboardingTip, streakDays }: Props) {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(126,231,255,0.10) 0%, rgba(245,165,36,0.08) 100%)',
        border: '1px solid rgba(126,231,255,0.22)',
        padding: '20px 24px',
        ...chamfer(14),
      }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar / Initials */}
          <div
            className="shrink-0 flex items-center justify-center font-bold"
            style={{
              width: 48,
              height: 48,
              border: '1.5px solid rgba(126,231,255,0.4)',
              background: 'linear-gradient(135deg, rgba(126,231,255,0.15) 0%, rgba(77,210,255,0.10) 100%)',
              color: 'var(--color-accent)',
              fontSize: 18,
              ...chamfer(10),
            }}
          >
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>

          {/* Greeting & Tip */}
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
              Chào mừng trở lại, <span style={{ color: 'var(--color-accent)' }}>{userName}</span>
            </p>
            {onboardingTip ? (
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {onboardingTip}
              </p>
            ) : null}
          </div>
        </div>

        {/* Streak Chip */}
        {streakDays > 0 ? (
          <div
            className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5"
            style={{
              border: '1px solid rgba(245,165,36,0.35)',
              background: 'rgba(245,165,36,0.12)',
              ...chamfer(8),
            }}
          >
            <Flame size={16} style={{ color: 'var(--color-brand-amber)' }} strokeWidth={2} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-brand-amber)' }}>
              {streakDays}
            </span>
            <span className="dash-mono text-[10px] uppercase" style={{ color: 'var(--color-brand-amber)', letterSpacing: '0.12em' }}>
              ngày liên tiếp
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
