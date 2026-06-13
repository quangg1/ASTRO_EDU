'use client'

import { ChevronRight } from 'lucide-react'
import type { AstronomyCalendarEvent } from '../types'
import { shortEventLabel } from '../lib/eventUi'
import { eventAccent, formatEventDayLabel, resolveEventContent } from '../lib/eventContent'
import { EventTypeIcon } from './calendarUiPrimitives'

type Props = {
  events: AstronomyCalendarEvent[]
  selectedEventId: string | null
  onSelectEvent: (event: AstronomyCalendarEvent) => void
  loading?: boolean
}

export function MonthEventListSection({
  events,
  selectedEventId,
  onSelectEvent,
  loading,
}: Props) {
  if (loading) {
    return (
      <section className="mt-8">
        <div className="mb-4 h-4 w-48 animate-pulse rounded bg-ds-elevated/60" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="cosmo-dark-panel h-20 animate-pulse rounded-2xl" />
          ))}
        </div>
      </section>
    )
  }

  if (!events.length) return null

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-ds-subtle">
        Tất cả sự kiện tháng này
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {events.map((ev) => {
          const content = resolveEventContent(ev)
          const accent = eventAccent(ev)
          const day = formatEventDayLabel(ev.peakAt || ev.startAt)
          const selected = ev.id === selectedEventId

          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => onSelectEvent(ev)}
              className={`group cosmo-dark-panel relative flex w-full items-center gap-3 overflow-hidden rounded-2xl p-4 text-left transition hover:border-ds-accent/25 ${
                selected ? 'ring-1 ring-ds-accent/40' : ''
              }`}
            >
              <div
                className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
                style={{ background: accent }}
                aria-hidden
              />
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ds-border"
                style={{
                  background: `color-mix(in srgb, ${accent} 18%, var(--color-bg-elevated))`,
                  boxShadow: `0 0 16px color-mix(in srgb, ${accent} 20%, transparent)`,
                }}
              >
                <EventTypeIcon type={ev.type} className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-semibold text-ds-text group-hover:text-white">
                    {ev.titleVi}
                  </p>
                  {day ? (
                    <span className="shrink-0 text-[10px] font-medium text-ds-subtle">{day.replace('Ngày ', 'Ng. ')}</span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-ds-muted">
                  {shortEventLabel(content.subtitleVi || content.subtitleEn || ev.summaryVi, 42)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-ds-accent/70 transition group-hover:translate-x-0.5 group-hover:text-ds-accent" />
            </button>
          )
        })}
      </div>
    </section>
  )
}
