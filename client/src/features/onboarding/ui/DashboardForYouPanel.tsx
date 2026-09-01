'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import {
  fetchOnboardingStatus,
  type OnboardingProfile,
} from '@/features/onboarding/api/onboardingApi'
import { LEARNING_TOPICS } from '@/data/learningTopics'

const chamfer = (cut = 12) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function topicLabel(id: string) {
  return LEARNING_TOPICS.find((t) => t.id === id)?.labelVi || id
}

type Props = {
  /** Chỉ hiện chip phụ — không có CTA “Tiếp tục hành trình” cạnh tranh primary. */
  secondaryOnly?: boolean
}

export function DashboardForYouPanel({ secondaryOnly = false }: Props) {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<OnboardingProfile | null>(null)

  useEffect(() => {
    if (!user) return
    void fetchOnboardingStatus().then((s) => {
      if (s?.completed && s.profile) setProfile(s.profile)
    })
  }, [user])

  if (!profile?.completed || !profile.recommendations?.length) return null

  const picks = profile.recommendations.slice(0, secondaryOnly ? 3 : 4)

  return (
    <section
      className="relative p-4 mb-6"
      style={{
        ...chamfer(16),
        border: '1px solid var(--color-border)',
        background: 'linear-gradient(135deg,var(--color-bg-elevated) 0%,var(--color-panel-glass) 100%)',
      }}
    >
      <div className="mb-3">
        <p className="dash-mono text-[10px] uppercase flex items-center gap-2 text-cyan-400/90 tracking-[0.18em]">
          <Sparkles className="w-3.5 h-3.5" />
          {secondaryOnly ? 'Gợi ý phụ' : 'Dành cho bạn'}
        </p>
        <p className="text-xs text-ds-muted mt-1">
          {secondaryOnly
            ? 'Các lối vào phụ — ưu tiên nút chính phía trên.'
            : 'Gợi ý từ onboarding'}
          {profile.topicIds?.length ? (
            <>
              {' '}
              · {profile.topicIds.slice(0, 3).map(topicLabel).join(', ')}
            </>
          ) : null}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {picks.map((item) => (
          <Link
            key={`${item.kind}-${item.href}`}
            href={item.href}
            className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.08]"
            title={item.descriptionVi}
          >
            {item.labelVi}
          </Link>
        ))}
      </div>
    </section>
  )
}
