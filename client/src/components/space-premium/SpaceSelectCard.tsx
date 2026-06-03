'use client'

import type { LucideIcon } from 'lucide-react'

type Props = {
  active: boolean
  disabled?: boolean
  onClick: () => void
  icon: LucideIcon
  title: string
  description?: string
  multi?: boolean
}

/** White ticket-style option for onboarding / pickers. */
export function SpaceSelectCard({
  active,
  disabled,
  onClick,
  icon: Icon,
  title,
  description,
  multi,
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full text-left rounded-xl border transition-all p-4 sm:p-5 flex items-start gap-4 ${
        active
          ? 'bg-white border-white shadow-lg scale-[1.01]'
          : 'bg-white/5 border-ds-border hover:border-white/25 text-white'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          active ? 'border-black bg-black' : 'border-white/35'
        }`}
      >
        {active ? (
          multi ? (
            <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 6l3 3 5-6" />
            </svg>
          ) : (
            <span className="h-2 w-2 rounded-full bg-white" />
          )
        ) : null}
      </span>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          active ? 'bg-black/8 text-black' : 'bg-white/8 text-white'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-medium ${active ? 'text-black' : 'text-white'}`}>{title}</span>
        {description ? (
          <span className={`block text-[13px] mt-1 leading-snug ${active ? 'text-[#5c5c5c]' : 'text-white/45'}`}>
            {description}
          </span>
        ) : null}
      </span>
    </button>
  )
}
