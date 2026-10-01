'use client'

import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  maxHeightClass?: string
}

/** Bottom sheet HUD trên la bàn Sky. */
export function SkyHudSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxHeightClass = 'max-h-[min(38vh,340px)]',
}: Props) {
  if (!open) return null

  return (
    <div
      className="pointer-events-auto relative mx-auto mb-3 w-[min(28rem,calc(100vw-1.25rem))] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#060a12]/96 shadow-[0_8px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      role="dialog"
      aria-label={title}
    >
      <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
        <div className="h-1 w-9 rounded-full bg-white/20" />
      </div>

      <header className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-4 pb-3 pt-1">
        <div className="min-w-0">
          {subtitle ? (
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-sky-400/80">
              {subtitle}
            </p>
          ) : null}
          <h2 className="truncate text-[15px] font-semibold text-white">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Đóng"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </header>

      <div className={`overflow-y-auto overscroll-contain px-3 py-3 ${maxHeightClass}`}>{children}</div>
    </div>
  )
}
