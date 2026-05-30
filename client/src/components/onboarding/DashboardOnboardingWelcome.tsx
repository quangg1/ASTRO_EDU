'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Compass, Globe2, MessageCircle, Sparkles } from 'lucide-react'
import { parseOnboardingLanding } from '@/lib/onboardingLanding'
import { OnboardingWelcomeBanner } from '@/components/onboarding/OnboardingWelcomeBanner'
import {
  fetchOnboardingStatus,
  type OnboardingProfile,
  type OnboardingRecommendation,
} from '@/features/onboarding/public'
import { LEARNING_TOPICS } from '@/data/learningTopics'

const chamfer = (cut = 12) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function WidgetCard({
  href,
  icon: Icon,
  title,
  description,
  accent = 'cyan',
}: {
  href: string
  icon: typeof Sparkles
  title: string
  description: string
  accent?: 'cyan' | 'amber'
}) {
  const border = accent === 'amber' ? 'rgba(245,165,36,0.3)' : 'rgba(126,231,255,0.22)'
  return (
    <Link
      href={href}
      className="block p-4 transition-colors hover:bg-white/[0.04]"
      style={{
        ...chamfer(10),
        border: `1px solid ${border}`,
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 shrink-0 ${accent === 'amber' ? 'text-amber-400' : 'text-cyan-400'}`} />
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{description}</p>
        </div>
      </div>
    </Link>
  )
}

function pickWidgetRecs(profile: OnboardingProfile): OnboardingRecommendation[] {
  const recs = profile.recommendations ?? []
  const lesson = recs.find((r) => r.kind === 'lesson')
  const explore = recs.find((r) => r.kind === 'explore_entity' || r.kind === 'explore')
  const forum = recs.find((r) => r.kind === 'forum')
  const cosmos = recs.find((r) => r.kind === 'cosmos')
  const out: OnboardingRecommendation[] = []
  if (lesson) out.push(lesson)
  if (explore) out.push(explore)
  if (cosmos) out.push(cosmos)
  if (forum) out.push(forum)
  return out.slice(0, 3)
}

export function DashboardOnboardingWelcome() {
  const searchParams = useSearchParams()
  const landing = parseOnboardingLanding(searchParams)
  const [profile, setProfile] = useState<OnboardingProfile | null>(null)

  useEffect(() => {
    if (!landing.welcome && !landing.fromOnboarding) return
    void fetchOnboardingStatus().then((s) => {
      if (s?.profile?.completed) setProfile(s.profile)
    })
  }, [landing.welcome, landing.fromOnboarding])

  if (!landing.welcome || !profile) return null

  const widgets = pickWidgetRecs(profile)
  const topicLabels = (profile.topicIds ?? [])
    .slice(0, 3)
    .map((id) => LEARNING_TOPICS.find((t) => t.id === id)?.labelVi || id)
    .join(', ')

  return (
    <section className="mb-6">
      <OnboardingWelcomeBanner
        dismissKey="onboarding-dashboard-welcome"
        title="Dashboard cá nhân hóa đã sẵn sàng"
        description={
          topicLabels
            ? `Mục tiêu: ${profile.primaryIntent?.replace('_', ' ')} · Chủ đề: ${topicLabels}. Chọn widget bên dưới để bắt đầu ngay.`
            : 'Chọn một trong các lối vào được gợi ý từ onboarding.'
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {widgets[0] ? (
          <WidgetCard
            href={widgets[0].href}
            icon={Sparkles}
            title={widgets[0].labelVi}
            description={widgets[0].descriptionVi || 'Tiếp tục lộ trình'}
            accent="amber"
          />
        ) : null}
        {widgets[1] ? (
          <WidgetCard
            href={widgets[1].href}
            icon={widgets[1].kind === 'cosmos' ? Compass : Globe2}
            title={widgets[1].labelVi}
            description={widgets[1].descriptionVi || 'Khám phá 3D / cosmos'}
          />
        ) : null}
        {widgets[2] ? (
          <WidgetCard
            href={widgets[2].href}
            icon={MessageCircle}
            title={widgets[2].labelVi}
            description={widgets[2].descriptionVi || 'Cộng đồng'}
            accent="amber"
          />
        ) : null}
      </div>
    </section>
  )
}
