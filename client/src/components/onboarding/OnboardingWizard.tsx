'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  ChevronLeft,
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
import {
  AuthEyebrow,
  AuthHudPanel,
  AuthPrimaryButton,
  AuthProgressBar,
  AuthSingleColumnLayout,
} from '@/components/auth/AuthFlowShell'
import { SiteLogo } from '@/components/ui/SiteLogo'
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

function HudSelectCard({
  active,
  disabled,
  onClick,
  icon: Icon,
  title,
  description,
  multi,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  icon: LucideIcon
  title: string
  description?: string
  multi?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-4 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: active ? 'rgba(126,231,255,0.06)' : 'rgba(10,16,36,0.85)',
        border: `1px solid ${active ? 'rgba(126,231,255,0.45)' : 'rgba(126,231,255,0.14)'}`,
        clipPath:
          'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
      }}
    >
      <span
        className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
        style={{
          borderColor: active ? '#7ee7ff' : '#3d4460',
          background: multi && active ? '#7ee7ff' : 'transparent',
        }}
      >
        {active && !multi ? <span className="w-2 h-2 rounded-full bg-[#7ee7ff]" /> : null}
        {active && multi ? (
          <svg viewBox="0 0 12 12" className="w-3 h-3 text-[#03060f]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6l3 3 5-6" />
          </svg>
        ) : null}
      </span>
      <span
        className="shrink-0 w-10 h-10 flex items-center justify-center"
        style={{
          background: 'rgba(126,231,255,0.06)',
          border: '1px solid rgba(126,231,255,0.18)',
          clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
        }}
      >
        <Icon className="w-5 h-5 text-[#7ee7ff]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-white">{title}</span>
        {description ? (
          <span className="block text-[12px] text-[#5c6886] mt-0.5 leading-snug">{description}</span>
        ) : null}
      </span>
    </button>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-[#5c6886] shrink-0 w-16 font-[JetBrains_Mono,monospace] text-[11px] uppercase">{label}</span>
      <span className="text-[#eaf6ff]">{value}</span>
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
        <div className="text-center text-[#5c6886] text-sm py-20">Đang chuẩn bị trải nghiệm cá nhân hóa…</div>
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
      <div className="flex flex-col items-center text-center gap-6">
        <div
          className="w-[72px] h-[72px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(126,231,255,0.25), rgba(245,165,36,0.2))',
            border: '1px solid rgba(126,231,255,0.35)',
            clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
          }}
        >
          <Sparkles className="w-8 h-8 text-[#7ee7ff]" />
        </div>
        <div
          className="w-full text-left rounded-none p-4 space-y-2.5"
          style={{
            background: 'rgba(10,16,36,0.85)',
            border: '1px solid rgba(126,231,255,0.14)',
            clipPath:
              'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
          }}
        >
          <SummaryRow label="Mục tiêu" value={options.intents.find((x) => x.id === intent)?.labelVi || '—'} />
          <SummaryRow
            label="Chủ đề"
            value={topics.map((id) => options.topics.find((t) => t.id === id)?.labelVi || id).join(', ')}
          />
          <SummaryRow
            label="Trình độ"
            value={options.experienceLevels.find((x) => x.id === experience)?.labelVi || '—'}
          />
          <p className="text-xs text-[#f5a524] pt-1 font-[JetBrains_Mono,monospace]">+5 GEM khi khởi hành</p>
        </div>
      </div>
    )
  } else if (step === 0) {
    body = (
      <div className="space-y-3">
        <p className="text-[13px] font-[JetBrains_Mono,monospace] uppercase tracking-[0.12em] text-[#9aa8c4] mb-1">
          Bạn vào {APP_DISPLAY_NAME} chủ yếu để…
        </p>
        {options.intents.map((item) => (
          <HudSelectCard
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
            <HudSelectCard
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
          <HudSelectCard
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
      <AuthSingleColumnLayout
      topRight={
        !isFinalStep ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSkip()}
            className="absolute top-6 right-4 sm:right-8 z-20 text-[11px] font-[JetBrains_Mono,monospace] uppercase tracking-[0.18em] text-[#5c6886] hover:text-[#7ee7ff] disabled:opacity-50"
          >
            Bỏ qua
          </button>
        ) : null
      }
    >
      <div className="mb-4">
        <SiteLogo className="text-lg" />
      </div>
      <AuthHudPanel className="max-h-[calc(100dvh-5.5rem)] min-h-0">
        <div className="flex items-center justify-between min-h-[28px] shrink-0">
          {step > 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1 text-sm text-[#7ee7ff] hover:text-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              Quay lại
            </button>
          ) : (
            <span />
          )}
        </div>

        <div className="shrink-0 space-y-7 sm:space-y-8">
          <AuthProgressBar step={step} total={TOTAL} label={STEPS[step]} />
          <AuthEyebrow label={`// ${APP_DISPLAY_NAME.toLowerCase()} · onboarding / ${String(step + 1).padStart(2, '0')}`} />

          <div>
            <h2
              className="font-[Space_Grotesk,sans-serif] text-white leading-[1.05] mb-2"
              style={{ fontSize: 'clamp(28px, 4vw, 40px)', letterSpacing: '-0.03em', fontWeight: 500 }}
            >
              {stepTitle}
            </h2>
            <p className="text-[14px] text-[#5c6886] leading-relaxed">{stepDescription}</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 px-1">{body}</div>

        <div className="shrink-0 pt-1 border-t border-[rgba(126,231,255,0.1)]">
          {!canNext && !isFinalStep ? (
            <p className="text-[12px] text-[#5c6886] text-center mb-2">
              {step === 0 ? 'Chọn một mục tiêu để tiếp tục' : step === 1 ? 'Chọn ít nhất một chủ đề' : 'Chọn trình độ của bạn'}
            </p>
          ) : null}
          {isFinalStep ? (
            <AuthPrimaryButton disabled={!canNext || busy} onClick={() => void handleFinish()} showArrow={false}>
              {busy ? 'Đang chuẩn bị tọa độ…' : 'Khởi hành ngay'}
            </AuthPrimaryButton>
          ) : (
            <AuthPrimaryButton disabled={!canNext || busy} onClick={() => setStep((s) => s + 1)} variant="cyan">
              Tiếp tục
            </AuthPrimaryButton>
          )}
        </div>
      </AuthHudPanel>
    </AuthSingleColumnLayout>
    </>
  )
}
