'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Compass, Search, X } from 'lucide-react'
import { parseOnboardingLanding } from '@/lib/onboardingLanding'
import { OnboardingWelcomeBanner } from '@/components/onboarding/OnboardingWelcomeBanner'

const TOUR_STEPS = [
  { title: 'Xoay bản đồ', body: 'Giữ chuột trái và kéo để xoay 4.673 thiên hà quanh Dải Ngân Hà.' },
  { title: 'Zoom', body: 'Cuộn chuột để tiến/lùi — mỗi điểm là một thiên hà (~26,8 kpc).' },
  { title: 'Center thiên hà', body: 'Click trái vào điểm để center (vàng). Dải Ngân Hà luôn màu magenta.' },
  { title: 'Tìm theo tên', body: 'Dùng ô tìm kiếm góc dưới để nhảy tới catalog (M31, NGC…).' },
]

function CosmosTour({ show, onClose }: { show: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0)
  if (!show) return null
  const current = TOUR_STEPS[step]
  const isLast = step >= TOUR_STEPS.length - 1

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[min(420px,calc(100vw-2rem))] p-5"
      style={{
        background: 'var(--color-panel-solid)',
        border: '1px solid rgba(126,231,255,0.3)',
        clipPath:
          'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[10px] font-[JetBrains_Mono,monospace] uppercase tracking-[0.18em] text-ds-accent">
          Hướng dẫn · {step + 1}/{TOUR_STEPS.length}
        </p>
        <button type="button" onClick={onClose} className="text-ds-subtle hover:text-white" aria-label="Đóng">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm font-medium text-white mb-1">{current.title}</p>
      <p className="text-xs text-ds-muted leading-relaxed mb-4">{current.body}</p>
      <div className="flex justify-end gap-2">
        {!isLast ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="px-4 py-2 text-xs font-medium text-[#031018] bg-ds-accent rounded-none"
            style={{
              clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
            }}
          >
            Tiếp
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#1a0e00] bg-ds-amber"
            style={{
              clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
            }}
          >
            Bắt đầu khám phá
          </button>
        )}
      </div>
    </div>
  )
}

function CosmosPageInner() {
  const searchParams = useSearchParams()
  const landing = parseOnboardingLanding(searchParams)
  const [tourOpen, setTourOpen] = useState(landing.fromOnboarding && landing.tour)

  const iframeSrc = useMemo(() => {
    const qs = new URLSearchParams()
    if (landing.focus) qs.set('focus', landing.focus)
    if (!landing.tour) qs.set('ui', 'minimal')
    const q = qs.toString()
    return `/cosmos/embed.html${q ? `?${q}` : ''}`
  }, [landing.focus, landing.tour])

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black">
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between gap-3 px-4 py-3 pointer-events-none">
        <Link
          href="/dashboard"
          className="pointer-events-auto text-xs font-[JetBrains_Mono,monospace] uppercase tracking-[0.14em] text-ds-accent hover:text-white"
        >
          ← Dashboard
        </Link>
        <div className="pointer-events-auto flex items-center gap-2">
          {landing.focus === 'search' ? (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-ds-muted">
              <Search className="w-3 h-3" /> Gợi ý: thử M31
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-ds-muted">
              <Compass className="w-3 h-3" /> 200 Mpc · MW magenta
            </span>
          )}
          {!tourOpen ? (
            <button
              type="button"
              onClick={() => setTourOpen(true)}
              className="text-[10px] uppercase tracking-wider text-ds-subtle hover:text-ds-accent pointer-events-auto"
            >
              Hướng dẫn
            </button>
          ) : null}
        </div>
      </div>

      {landing.fromOnboarding ? (
        <div className="absolute top-14 inset-x-4 z-20 max-w-lg mx-auto pointer-events-auto">
          <OnboardingWelcomeBanner
            dismissKey="onboarding-cosmos-banner"
            title="Bản đồ thiên hà quanh Dải Ngân Hà"
            description="Mô phỏng phân bố 3D &lt; 200 Mpc — dữ liệu từ RiteshSingh/galaxies (MIT). Đây là tầm vũ trụ, không phải bản đồ sao đêm GPS."
          />
        </div>
      ) : null}

      <iframe
        title="Bản đồ thiên hà CosmoLearn"
        src={iframeSrc}
        className="absolute inset-0 w-full h-full border-0"
        allow="fullscreen"
      />

      <CosmosTour show={tourOpen} onClose={() => setTourOpen(false)} />

      {landing.fromOnboarding && landing.topics.includes('telescopes') ? (
        <Link
          href={`/community/quan-sat-thiet-bi?from=onboarding&topics=${landing.topics.join(',')}`}
          className="absolute top-36 right-4 z-20 text-[11px] text-amber-300 border border-amber-400/30 px-3 py-1.5 hover:bg-amber-400/10"
          style={{
            clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
          }}
        >
          Diễn đàn kính thiên văn →
        </Link>
      ) : null}
    </main>
  )
}

export default function CosmosPage() {
  return (
    <Suspense fallback={<div className="relative z-10 text-ds-text w-full" />}>
      <CosmosPageInner />
    </Suspense>
  )
}
