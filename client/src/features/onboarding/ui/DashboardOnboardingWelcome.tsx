'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { parseOnboardingLanding } from '@/lib/onboardingLanding'
import { OnboardingWelcomeBanner } from '@/features/onboarding/ui/OnboardingWelcomeBanner'
import {
  fetchOnboardingStatus,
  type OnboardingProfile,
} from '@/features/onboarding/api/onboardingApi'
import { LEARNING_TOPICS } from '@/data/learningTopics'
import { useLearnerNextAction } from '@/features/learning-path/public'

type Props = {
  /** Chỉ giải thích next action — không render widget CTA cạnh tranh. */
  explainOnly?: boolean
}

export function DashboardOnboardingWelcome({ explainOnly = false }: Props) {
  const searchParams = useSearchParams()
  const landing = parseOnboardingLanding(searchParams)
  const [profile, setProfile] = useState<OnboardingProfile | null>(null)
  const { nextAction } = useLearnerNextAction()

  useEffect(() => {
    if (!landing.welcome && !landing.fromOnboarding) return
    void fetchOnboardingStatus().then((s) => {
      if (s?.profile?.completed) setProfile(s.profile)
    })
  }, [landing.welcome, landing.fromOnboarding])

  if (!landing.welcome || !profile) return null

  const topicLabels = (profile.topicIds ?? [])
    .slice(0, 3)
    .map((id) => LEARNING_TOPICS.find((t) => t.id === id)?.labelVi || id)
    .join(', ')

  const intentLabel = profile.primaryIntent?.replace(/_/g, ' ') || 'học tập'

  return (
    <section className="mb-6">
      <OnboardingWelcomeBanner
        dismissKey="onboarding-dashboard-welcome"
        title="Hành trình của bạn đã sẵn sàng"
        description={
          explainOnly
            ? topicLabels
              ? `Mục tiêu: ${intentLabel} · Chủ đề: ${topicLabels}. Bước tiếp theo: ${nextAction.ctaLabel} — “${nextAction.title}”.`
              : `Bước tiếp theo: ${nextAction.ctaLabel} — “${nextAction.title}”. Một nút chính bên dưới là đủ để bắt đầu.`
            : topicLabels
              ? `Mục tiêu: ${intentLabel} · Chủ đề: ${topicLabels}.`
              : 'Dashboard đã cá nhân hóa theo onboarding của bạn.'
        }
      />
    </section>
  )
}
