'use client'

import { X } from 'lucide-react'
import { useState } from 'react'

type Props = {
  title: string
  description: string
  dismissKey?: string
}

export function OnboardingWelcomeBanner({ title, description, dismissKey = 'onboarding-welcome' }: Props) {
  const [open, setOpen] = useState(true)
  if (!open) return null

  return (
    <div
      className="relative mb-6 p-4 pr-12"
      style={{
        background: 'linear-gradient(135deg,rgba(126,231,255,0.08),rgba(245,165,36,0.06))',
        border: '1px solid rgba(126,231,255,0.25)',
        clipPath:
          'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
      }}
    >
      <p className="text-[10px] font-[JetBrains_Mono,monospace] uppercase tracking-[0.18em] text-[#7ee7ff] mb-1">
        Trải nghiệm may đo cho bạn
      </p>
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="text-xs text-[#9aa8c4] mt-1 leading-relaxed">{description}</p>
      <button
        type="button"
        aria-label="Đóng"
        onClick={() => {
          setOpen(false)
          try {
            sessionStorage.setItem(dismissKey, '1')
          } catch {
            /* ignore */
          }
        }}
        className="absolute top-3 right-3 text-[#5c6886] hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function shouldShowOnboardingBanner(dismissKey: string): boolean {
  if (typeof window === 'undefined') return true
  try {
    return sessionStorage.getItem(dismissKey) !== '1'
  } catch {
    return true
  }
}
