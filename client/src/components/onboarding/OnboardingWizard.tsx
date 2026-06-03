'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Compass,
  Globe2,
  MessageCircle,
  Rocket,
  Sparkles,
  Star,
  Telescope,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import { useToast } from '@/design-system'
import { syncGemWallet } from '@/features/rewards/public'
import {
  completeOnboarding,
  fetchOnboardingOptions,
  fetchOnboardingStatus,
  skipOnboarding,
  type OnboardingExperienceId,
  type OnboardingIntentId,
  type OnboardingOptions,
} from '@/features/onboarding/public'
import { OnboardingLaunchOverlay } from '@/components/onboarding/OnboardingLaunchOverlay'
import { getOnboardingLaunchVideoSrc } from '@/lib/onboardingLaunchVideo'
import { AuthSingleColumnLayout } from '@/components/auth/AuthFlowShell'
import { SpaceSelectCard } from '@/components/space-premium'
import {
  OnboardingPrimaryButton,
  OnboardingSpaceShell,
} from '@/components/onboarding/OnboardingSpaceShell'
import { APP_DISPLAY_NAME } from '@/lib/appBrand'

const STEPS = ['Mục tiêu', 'Chủ đề', 'Trình độ', 'Sẵn sàng'] as const
const TOTAL = STEPS.length

const INTENT_ICONS: Record<OnboardingIntentId, LucideIcon> = {
  learn_path: BookOpen,
  explore_3d: Globe2,
  stargazing: Telescope,
  community: MessageCircle,
  mixed: Sparkles,
}

const EXPERIENCE_ICONS: Record<OnboardingExperienceId, LucideIcon> = {
  beginner: Star,
  some: Compass,
  advanced: Rocket,
}

const TOPIC_ICONS: Record<string, LucideIcon> = {
  'solar-system': Globe2,
  'stars-constellations': Star,
  exoplanets: Rocket,
  astrophysics: Sparkles,
  'space-exploration': Rocket,
  'galaxies-nebulae': Sparkles,
  stargazing: Telescope,
  telescopes: Telescope,
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-[#888] shrink-0 w-16 text-[11px] uppercase tracking-wide">{label}</span>
      <span className="text-black font-medium">{value}</span>
    </div>
  )
}

export function OnboardingWizard() {
  const router = useRouter()
  const toast = useToast()
  const { user, checked, loading } = useAuthStore()
  const [options, setOptions] = useState<OnboardingOptions | null>(null)
  const [step, setStep] = useState(0)
  const [intent, setIntent] = useState<OnboardingIntentId | null>(null)
  const [topics, setTopics] = useState<string[]>([])
  const [experience, setExperience] = useState<OnboardingExperienceId | null>(null)
  const [busy, setBusy] = useState(false)
  const [booting, setBooting] = useState(true)
  const [launch, setLaunch] = useState<{
    href: string
    intent: OnboardingIntentId
    gems: number
    apiReady: boolean
  } | null>(null)
  const launchHrefRef = useRef('/dashboard')

  useEffect(() => {
    if (!checked && loading) return
    if (!user) {
      router.replace('/login?redirect=/onboarding')
      return
    }
    if (user.role && user.role !== 'student') {
      router.replace('/dashboard')
      return
    }
    let cancelled = false
    void Promise.all([fetchOnboardingOptions(), fetchOnboardingStatus()]).then(([opts, status]) => {
      if (cancelled) return
      if (status?.completed) {
        router.replace(status.profile?.primaryHref || '/dashboard')
        return
      }
      setOptions(opts)
      setBooting(false)
    })
    return () => {
      cancelled = true
    }
  }, [user, checked, loading, router])

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'video'
    link.href = getOnboardingLaunchVideoSrc()
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  const maxTopics = options?.maxTopicPicks ?? 3
  const isFinalStep = step === TOTAL - 1

  const toggleTopic = (id: string) => {
    setTopics((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= maxTopics) return prev
      return [...prev, id]
    })
  }

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(intent)
    if (step === 1) return topics.length >= 1
    if (step === 2) return Boolean(experience)
    return true
  }, [step, intent, topics, experience])

  const handleFinish = () => {
    if (!intent || !experience || topics.length < 1) return
    setBusy(true)
    launchHrefRef.current = '/dashboard'
    setLaunch({
      href: '/dashboard',
      intent: intent as OnboardingIntentId,
      gems: 0,
      apiReady: false,
    })

    void (async () => {
      const res = await completeOnboarding({
        primaryIntent: intent,
        topicIds: topics,
        experienceLevel: experience,
      })
      setBusy(false)
      if (!res.success || !res.profile) {
        setLaunch(null)
        toast.show(res.error || 'Lỗi lưu onboarding', { tone: 'danger' })
        return
      }
      if (res.gemReward?.gemsEarned) {
        await syncGemWallet(user?.id)
        window.dispatchEvent(new CustomEvent('gem-wallet-changed'))
      }
      const href = res.profile.primaryHref || '/dashboard'
      launchHrefRef.current = href
      setLaunch({
        href,
        intent: intent as OnboardingIntentId,
        gems: res.gemReward?.gemsEarned ?? 0,
        apiReady: true,
      })
    })()
  }

  const handleSkip = async () => {
    setBusy(true)
    const res = await skipOnboarding()
    setBusy(false)
    if (!res.success) {
      toast.show(res.error || 'Không bỏ qua được', { tone: 'danger' })
      return
    }
    router.replace('/dashboard')
  }

  if (booting || !options) {
    return (
      <AuthSingleColumnLayout>
        <div className="text-center text-ds-subtle text-sm py-20">Đang chuẩn bị trải nghiệm cá nhân hóa…</div>
      </AuthSingleColumnLayout>
    )
  }

  const stepTitle = isFinalStep
    ? 'Chào mừng phi hành gia!'
    : step === 0
      ? `${APP_DISPLAY_NAME} dành cho bạn`
      : step === 1
        ? 'Chủ đề bạn quan tâm'
        : 'Trình độ hiện tại'

  const stepDescription = isFinalStep
    ? `Tài khoản ${APP_DISPLAY_NAME} đã sẵn sàng. Hệ thống đang chuẩn bị tọa độ cho chuyến thám hiểm đầu tiên.`
    : step === 0
      ? `Vài câu hỏi để gợi ý điểm bắt đầu — lộ trình, Explore 3D hoặc cộng đồng trên ${APP_DISPLAY_NAME}.`
      : step === 1
        ? `Chọn tối đa ${maxTopics} chủ đề.`
        : 'Giúp chúng tôi gợi ý độ sâu nội dung phù hợp.'

  let body: ReactNode

  if (isFinalStep) {
    body = (
      <div className="flex flex-col gap-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-black" />
          </div>
        </div>
        <div className="w-full bg-white text-black rounded-xl p-6 space-y-3">
          <SummaryRow label="Mục tiêu" value={options.intents.find((x) => x.id === intent)?.labelVi || '—'} />
          <SummaryRow
            label="Chủ đề"
            value={topics.map((id) => options.topics.find((t) => t.id === id)?.labelVi || id).join(', ')}
          />
          <SummaryRow
            label="Trình độ"
            value={options.experienceLevels.find((x) => x.id === experience)?.labelVi || '—'}
          />
          <p className="text-xs text-[var(--sp-accent)] pt-2 font-medium">+5 GEM khi khởi hành</p>
        </div>
      </div>
    )
  } else if (step === 0) {
    body = (
      <div className="space-y-3">
        <p className="text-[13px] font-[JetBrains_Mono,monospace] uppercase tracking-[0.12em] text-ds-muted mb-1">
          Bạn vào {APP_DISPLAY_NAME} chủ yếu để…
        </p>
        {options.intents.map((item) => (
          <SpaceSelectCard
            key={item.id}
            active={intent === item.id}
            onClick={() => setIntent(item.id)}
            icon={INTENT_ICONS[item.id]}
            title={item.labelVi}
          />
        ))}
      </div>
    )
  } else if (step === 1) {
    body = (
      <div className="space-y-3">
        {options.topics.map((t) => {
          const active = topics.includes(t.id)
          const disabled = !active && topics.length >= maxTopics
          return (
            <SpaceSelectCard
              key={t.id}
              active={active}
              disabled={disabled}
              onClick={() => toggleTopic(t.id)}
              icon={TOPIC_ICONS[t.id] || Sparkles}
              title={t.labelVi}
              description={t.descriptionVi}
              multi
            />
          )
        })}
      </div>
    )
  } else {
    body = (
      <div className="space-y-3">
        {options.experienceLevels.map((item) => (
          <SpaceSelectCard
            key={item.id}
            active={experience === item.id}
            onClick={() => setExperience(item.id)}
            icon={EXPERIENCE_ICONS[item.id]}
            title={item.labelVi}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      {launch ? (
        <OnboardingLaunchOverlay
          intent={launch.intent}
          gemsEarned={launch.gems}
          apiReady={launch.apiReady}
          onComplete={() => router.replace(launchHrefRef.current)}
        />
      ) : null}
      <OnboardingSpaceShell
        step={step}
        stepLabels={STEPS}
        title={stepTitle}
        description={stepDescription}
        showBack={step > 0}
        onBack={() => setStep((s) => s - 1)}
        onSkip={!isFinalStep ? () => void handleSkip() : undefined}
        skipDisabled={busy}
        footer={
          <>
            {!canNext && !isFinalStep ? (
              <p className="text-[12px] text-white/35 mr-2 hidden sm:block">
                {step === 0 ? 'Chọn mục tiêu' : step === 1 ? 'Chọn chủ đề' : 'Chọn trình độ'}
              </p>
            ) : null}
            {isFinalStep ? (
              <OnboardingPrimaryButton disabled={!canNext || busy} onClick={() => void handleFinish()}>
                {busy ? 'Đang chuẩn bị…' : 'Khởi hành ngay'}
              </OnboardingPrimaryButton>
            ) : (
              <OnboardingPrimaryButton disabled={!canNext || busy} onClick={() => setStep((s) => s + 1)}>
                Tiếp tục
              </OnboardingPrimaryButton>
            )}
          </>
        }
      >
        {body}
      </OnboardingSpaceShell>
    </>
  )
}
