'use client'

import { ChevronRight } from 'lucide-react'
import type { AstronomyCalendarEvent } from '../types'
import { resolveEventContent } from '../lib/eventContent'
import { eventPeakDate, formatEventWhen } from '../lib/eventUi'
import { EventTypeIcon, resolveEventIconKey, resolveEventTheme } from './calendarUiPrimitives'

type Props = {
  event: AstronomyCalendarEvent
  onJump?: (event: AstronomyCalendarEvent) => void
}

export function AstronomyEventRow({ event, onJump }: Props) {
  const when = formatEventWhen(event.peakAt || event.startAt)
  const content = resolveEventContent(event)
  const typeLabel = content.typeLabelVi
  const cta = event.ctaLabelVi || (event.lessonHref && !event.exploreTarget ? 'Đọc bài' : 'Sky View')
  const theme = resolveEventTheme(event)
  const iconKey = resolveEventIconKey(event)

  return (
    <button
      type="button"
      onClick={() => onJump?.(event)}
      className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition ${
        event.isLive
          ? 'border-sky-400/30 bg-sky-950/40 hover:border-sky-400/45'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.05]'
      }`}
    >
      <div
        className="absolute left-0 top-0 h-full w-[2px] opacity-70"
        style={{ background: theme.accent }}
        aria-hidden
      />
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06]"
        style={{ background: theme.iconBg }}
      >
        <EventTypeIcon type={event.type} iconKey={iconKey} accent={theme.accent} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {event.isLive ? (
            <span className="rounded-full bg-sky-500/25 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-sky-100">
              Trực tiếp
            </span>
          ) : null}
          <span className="text-[10px] text-slate-500">{typeLabel}</span>
        </div>
        <p className="truncate text-sm font-medium text-white group-hover:text-sky-50">{event.titleVi}</p>
        {when ? <p className="mt-0.5 truncate text-[11px] text-slate-500">{when}</p> : null}
      </div>

      <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-sky-300/90 group-hover:text-sky-200">
        {cta}
        <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
      </span>
    </button>
  )
}

export { eventPeakDate }
