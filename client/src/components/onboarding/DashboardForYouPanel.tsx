'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import {
  fetchOnboardingStatus,
  type OnboardingProfile,
  type OnboardingRecommendation,
} from '@/features/onboarding/public'
import { LEARNING_TOPICS } from '@/data/learningTopics'

const chamfer = (cut = 12) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function topicLabel(id: string) {
  return LEARNING_TOPICS.find((t) => t.id === id)?.labelVi || id
}

function RecCard({ item }: { item: OnboardingRecommendation }) {
  return (
    <Link
      href={item.href}
      className="block p-4 transition-colors hover:bg-ds-surface/50"
      style={{
        ...chamfer(10),
        border: '1px solid var(--color-accent-soft)',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <p className="text-sm font-medium text-white flex items-center justify-between gap-2">
        {item.labelVi}
        <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />
      </p>
      {item.descriptionVi ? (
        <p className="text-xs text-ds-subtle mt-1.5 line-clamp-2">{item.descriptionVi}</p>
      ) : null}
    </Link>
  )
}

export function DashboardForYouPanel() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<OnboardingProfile | null>(null)

  useEffect(() => {
    if (!user) return
    void fetchOnboardingStatus().then((s) => {
      if (s?.completed && s.profile) setProfile(s.profile)
    })
  }, [user])

  if (!profile?.completed || !profile.recommendations?.length) return null

  const picks = profile.recommendations.slice(0, 4)

  return (
    <section
      className="relative p-5 mb-6"
      style={{
        ...chamfer(16),
        border: '1px solid var(--color-border)',
        background: 'linear-gradient(135deg,var(--color-bg-elevated) 0%,var(--color-panel-glass) 100%)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <p className="dash-mono text-[10px] uppercase flex items-center gap-2 text-cyan-400/90 tracking-[0.18em]">
            <Sparkles className="w-3.5 h-3.5" />
            Dành cho bạn
          </p>
          <p className="text-sm text-ds-muted mt-1">
            Gợi ý từ onboarding
            {profile.topicIds?.length ? (
              <>
                {' '}
                ·{' '}
                {profile.topicIds.slice(0, 3).map(topicLabel).join(', ')}
              </>
            ) : null}
          </p>
        </div>
        {profile.primaryHref ? (
          <Link
            href={profile.primaryHref}
            className="text-xs text-amber-300 hover:text-amber-200 border border-amber-400/30 px-3 py-1.5 rounded-lg"
          >
            Tiếp tục hành trình →
          </Link>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {picks.map((item) => (
          <RecCard key={`${item.kind}-${item.href}`} item={item} />
        ))}
      </div>
    </section>
  )
}
