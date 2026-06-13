'use client'

import Link from 'next/link'
import type { AstronomyMoonPhaseStripItem } from '../types'
import { Brackets } from './calendarUiPrimitives'

type Props = {
  phases: AstronomyMoonPhaseStripItem[]
  className?: string
}

const PHASE_EMOJI: Record<string, string> = {
  'Trăng non': '🌑',
  'Trăng khuyết đầu': '🌓',
  'Trăng tròn': '🌕',
  'Trăng khuyết cuối': '🌗',
}

export function MoonPhaseStrip({ phases, className = '' }: Props) {
  if (!phases.length) return null

  return (
    <div className={`overflow-x-auto pb-2 ${className}`}>
      <div className="flex min-w-max flex-nowrap gap-3">
        {phases.map((p) => {
          const day = p.date.slice(8, 10)
          const month = p.date.slice(5, 7)
          const emoji = PHASE_EMOJI[p.titleVi] || '🌙'
          const isFull = p.titleVi === 'Trăng tròn'

          return (
            <Link
              key={p.eventId}
              href={`/calendar?event=${encodeURIComponent(p.eventId)}`}
              className={`group relative flex w-[4.75rem] flex-col items-center rounded-2xl px-2 py-3 text-center transition hover:scale-[1.03] hover:border-ds-accent/30 ${
                isFull ? 'cosmo-dark-panel cosmo-dark-panel-amber' : 'cosmo-dark-panel'
              }`}
              title={p.titleVi}
            >
              <Brackets c={isFull ? 'var(--color-brand-amber)' : 'var(--color-accent)'} s={8} o={4} />
              <span className="text-2xl transition group-hover:scale-110">{emoji}</span>
              <span className="mt-1 text-xs font-bold tabular-nums text-ds-text">
                {day}/{month}
              </span>
              <span className="mt-0.5 line-clamp-2 text-[9px] leading-tight text-ds-subtle group-hover:text-ds-muted">
                {p.titleVi}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
