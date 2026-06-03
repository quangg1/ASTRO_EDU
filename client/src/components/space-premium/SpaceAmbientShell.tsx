'use client'

import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  showStar?: boolean
}

/** Full-page black shell with crimson corner glow (Space reference). */
export function SpaceAmbientShell({ children, className = '', showStar = true }: Props) {
  return (
    <div className={`space-premium relative min-h-screen overflow-x-hidden ${className}`}>
      <div className="pointer-events-none fixed inset-0 sp-glow-crimson" aria-hidden />
      {showStar ? (
        <div className="pointer-events-none fixed top-6 right-6 z-20 text-white/70">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 2L13.2 9.8L21 11L13.2 12.2L12 20L10.8 12.2L3 11L10.8 9.8L12 2Z"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </div>
      ) : null}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
