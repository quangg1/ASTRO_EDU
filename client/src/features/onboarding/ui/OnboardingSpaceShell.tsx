'use client'

import type { ReactNode } from 'react'
import { SpaceNumberedNav, SpaceStar, type SpaceNavItem } from '@/components/space-premium'
import { SiteLogo } from '@/components/ui/SiteLogo'

type Props = {
  step: number
  stepLabels: readonly string[]
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
  onBack?: () => void
  onSkip?: () => void
  skipDisabled?: boolean
  showBack?: boolean
}

export function OnboardingSpaceShell({
  step,
  stepLabels,
  title,
  description,
  children,
  footer,
  onBack,
  onSkip,
  skipDisabled,
  showBack,
}: Props) {
  const navItems: SpaceNavItem[] = stepLabels.map((label, i) => ({
    id: `step-${i}`,
    index: i + 1,
    label,
  }))

  return (
    <div className="space-premium min-h-[100dvh] flex flex-col">
      <div className="pointer-events-none fixed inset-0 sp-glow-crimson" aria-hidden />

      <header className="relative z-20 flex items-center justify-between px-4 sm:px-10 pt-6">
        <SiteLogo className="text-white" />
        {onSkip ? (
          <button
            type="button"
            disabled={skipDisabled}
            onClick={onSkip}
            className="text-[11px] uppercase tracking-[0.18em] text-white/35 hover:text-white/70 disabled:opacity-40"
          >
            Bỏ qua
          </button>
        ) : null}
      </header>

      <div className="relative z-10 flex-1 container mx-auto px-4 sm:px-10 py-8 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10 lg:gap-16 max-w-5xl">
        <aside className="hidden lg:block pt-4">
          <SpaceNumberedNav
            items={navItems}
            activeId={`step-${step}`}
            onSelect={() => {}}
          />
        </aside>

        <div className="flex flex-col min-h-0">
          <div className="mb-6 lg:hidden flex gap-2">
            {stepLabels.map((_, i) => (
              <span
                key={i}
                className={`h-0.5 flex-1 ${i <= step ? 'bg-[var(--sp-accent)]' : 'bg-white/15'}`}
                aria-hidden
              />
            ))}
          </div>

          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <p className="sp-display-thin text-[10px] text-white/40 mb-2">
                Bước {step + 1} / {stepLabels.length}
              </p>
              <h1 className="sp-title-massive text-3xl sm:text-4xl text-white tracking-tight">{title}</h1>
              <p className="mt-3 text-sm text-white/45 font-light max-w-lg leading-relaxed">{description}</p>
            </div>
            <SpaceStar className="text-white/50 shrink-0 hidden sm:block" size={24} />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">{children}</div>

          <div className="shrink-0 mt-8 pt-6 border-t border-ds-border flex items-center justify-between gap-4">
            {showBack && onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="text-sm text-white/50 hover:text-white"
              >
                Quay lại
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">{footer}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function OnboardingPrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-3 px-6 py-3.5 text-sm font-medium bg-white text-black hover:bg-white/90 disabled:opacity-40 transition-colors"
    >
      {children}
    </button>
  )
}
