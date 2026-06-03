'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import {
  buildExploreTourSteps,
  EXPLORE_TOUR_ALT_MODE_STEPS,
  type ExploreTourContext,
  type ExploreTourPlacement,
  type ExploreTourStep,
} from '../lib/exploreTourSteps'
import { markExploreTourCompleted } from '../lib/exploreTourPrefs'

type Props = {
  open: boolean
  onClose: () => void
  context: ExploreTourContext
  onRequestShowcase?: () => void
}

type SpotlightRect = {
  left: number
  top: number
  width: number
  height: number
}

const CARD_W = 400
const PAD = 12
const VIEWPORT_MARGIN = 16

function resolveAnchorElement(anchor: string | undefined): HTMLElement | null {
  if (!anchor) return null
  if (anchor === 'cosmo-fab') {
    return document.querySelector<HTMLElement>('[data-cosmo-assistant-fab]')
  }
  return document.querySelector<HTMLElement>(`[data-explore-tour="${anchor}"]`)
}

function measureAnchor(anchor: string | undefined): SpotlightRect | null {
  const el = resolveAnchorElement(anchor)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width < 2 && r.height < 2) return null
  return {
    left: Math.max(0, r.left - PAD),
    top: Math.max(0, r.top - PAD),
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  }
}

function cardPosition(
  placement: ExploreTourPlacement,
  spotlight: SpotlightRect | null,
): { left: number; top: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const cardH = 200

  if (!spotlight || placement === 'center') {
    return {
      left: Math.max(VIEWPORT_MARGIN, (vw - CARD_W) / 2),
      top: Math.max(VIEWPORT_MARGIN, vh - cardH - 28),
    }
  }

  let left = spotlight.left
  let top = spotlight.top

  switch (placement) {
    case 'right':
      left = spotlight.left + spotlight.width + 16
      top = spotlight.top
      break
    case 'left':
      left = spotlight.left - CARD_W - 16
      top = spotlight.top
      break
    case 'top':
      left = spotlight.left
      top = spotlight.top - cardH - 16
      break
    case 'bottom':
    default:
      left = spotlight.left
      top = spotlight.top + spotlight.height + 16
      break
  }

  left = Math.min(Math.max(VIEWPORT_MARGIN, left), vw - CARD_W - VIEWPORT_MARGIN)
  top = Math.min(Math.max(VIEWPORT_MARGIN, top), vh - cardH - VIEWPORT_MARGIN)
  return { left, top }
}

function TourCard({
  step,
  stepIndex,
  stepCount,
  spotlight,
  onClose,
  onSkip,
  onBack,
  onNext,
  isLast,
  showBack,
  showShowcaseCta,
  onRequestShowcase,
}: {
  step: ExploreTourStep
  stepIndex: number
  stepCount: number
  spotlight: SpotlightRect | null
  onClose: () => void
  onSkip: () => void
  onBack: () => void
  onNext: () => void
  isLast: boolean
  showBack: boolean
  showShowcaseCta?: boolean
  onRequestShowcase?: () => void
}) {
  const placement = step.placement ?? (step.anchor ? 'bottom' : 'center')
  const pos = cardPosition(placement, spotlight)
  const missingAnchor = Boolean(step.anchor && !spotlight && !step.optionalAnchor)

  return (
    <div
      className="fixed z-[72] w-[min(400px,calc(100vw-2rem))] p-5 pointer-events-auto"
      style={{
        left: pos.left,
        top: pos.top,
        background: 'rgba(6,9,26,0.96)',
        border: '1px solid rgba(126,231,255,0.38)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
        clipPath:
          'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
      }}
      role="dialog"
      aria-labelledby="explore-tour-title"
      aria-describedby="explore-tour-body"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-[10px] font-[JetBrains_Mono,monospace] uppercase tracking-[0.18em] text-ds-accent">
          Khám phá 3D · {stepIndex + 1}/{stepCount}
        </p>
        <button type="button" onClick={onClose} className="text-ds-subtle hover:text-white" aria-label="Đóng tour">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p id="explore-tour-title" className="mb-1 text-sm font-medium text-white">
        {step.title}
      </p>
      <p id="explore-tour-body" className="mb-3 text-xs leading-relaxed text-ds-muted">
        {step.body}
      </p>
      {missingAnchor ? (
        <p className="mb-3 text-[10px] text-amber-200/80">
          Mục này không hiển thị với thiên thể hiện tại — bạn có thể bỏ qua bước.
        </p>
      ) : null}
      {showShowcaseCta && onRequestShowcase ? (
        <button
          type="button"
          onClick={onRequestShowcase}
          className="mb-3 w-full rounded border border-cyan-300/40 px-3 py-2 text-[11px] font-medium text-cyan-100 hover:bg-cyan-500/15"
        >
          Quay lại Showcase
        </button>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="text-[10px] uppercase tracking-wider text-ds-subtle hover:text-ds-muted"
        >
          Bỏ qua tour
        </button>
        <div className="flex gap-2">
          {showBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 border border-white/15 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Lui
            </button>
          ) : null}
          <button
            type="button"
            onClick={onNext}
            className={`px-4 py-2 text-xs font-semibold ${
              isLast ? 'text-[#1a0e00] bg-ds-amber' : 'text-[#031018] bg-ds-accent'
            }`}
          >
            {isLast ? 'Khám phá tự do' : 'Tiếp'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ExploreOnboardingTour({ open, onClose, context, onRequestShowcase }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)

  const steps = useMemo(() => {
    if (context.sceneMode !== 'showcase') return EXPLORE_TOUR_ALT_MODE_STEPS
    return buildExploreTourSteps(context)
  }, [context])

  const step = steps[stepIndex] ?? steps[0]
  const isLast = stepIndex >= steps.length - 1
  const isAltMode = context.sceneMode !== 'showcase'

  const remeasure = useCallback(() => {
    if (!open || !step) {
      setSpotlight(null)
      return
    }
    setSpotlight(measureAnchor(step.anchor))
  }, [open, step])

  useLayoutEffect(() => {
    remeasure()
  }, [remeasure, stepIndex])

  useEffect(() => {
    if (!open) return
    const onResize = () => remeasure()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    const t = window.setInterval(remeasure, 400)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
      window.clearInterval(t)
    }
  }, [open, remeasure])

  useEffect(() => {
    if (!open) setStepIndex(0)
  }, [open])

  const finish = useCallback(() => {
    markExploreTourCompleted()
    onClose()
  }, [onClose])

  const handleSkip = finish

  const handleNext = useCallback(() => {
    if (isLast) {
      finish()
      return
    }
    setStepIndex((s) => Math.min(s + 1, steps.length - 1))
  }, [finish, isLast, steps.length])

  const handleBack = useCallback(() => {
    setStepIndex((s) => Math.max(0, s - 1))
  }, [])

  if (!open || !step) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[70] pointer-events-auto"
        aria-hidden
        onClick={(e) => e.stopPropagation()}
      >
        {spotlight ? (
          <div
            className="absolute rounded-xl ring-2 ring-[var(--color-accent)]/90 transition-all duration-200"
            style={{
              left: spotlight.left,
              top: spotlight.top,
              width: spotlight.width,
              height: spotlight.height,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.78)',
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-black/78" />
        )}
      </div>

      <TourCard
        step={step}
        stepIndex={stepIndex}
        stepCount={steps.length}
        spotlight={spotlight}
        onClose={finish}
        onSkip={handleSkip}
        onBack={handleBack}
        onNext={handleNext}
        isLast={isLast}
        showBack={stepIndex > 0 && !isAltMode}
        showShowcaseCta={isAltMode}
        onRequestShowcase={onRequestShowcase}
      />
    </>
  )
}
