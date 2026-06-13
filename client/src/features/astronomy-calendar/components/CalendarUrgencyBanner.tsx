'use client'

import { ChevronRight, Gem } from 'lucide-react'
import type { AstronomyCalendarEvent, AstronomyFeaturedUrgency } from '../types'
import { formatEventDayLabel, resolveEventContent } from '../lib/eventContent'
import { CosmoPanel, EventTypeIcon, resolveEventIconKey, resolveEventTheme } from './calendarUiPrimitives'

type Props = {
  urgency: AstronomyFeaturedUrgency | null
  secondaryUrgency?: AstronomyFeaturedUrgency | null
  nextEclipseTitle?: string | null
  onOpenEvent?: (event: AstronomyCalendarEvent) => void
  className?: string
}

function PrimaryBanner({
  item,
  onOpenEvent,
}: {
  item: AstronomyFeaturedUrgency
  onOpenEvent?: (event: AstronomyCalendarEvent) => void
}) {
  const theme = resolveEventTheme(item.event)
  const iconKey = resolveEventIconKey(item.event)
  const content = resolveEventContent(item.event)
  const day = formatEventDayLabel(item.event.peakAt || item.event.startAt)
  const gem = item.gemCheckInAmount

  return (
    <CosmoPanel accent={theme.accent} glow>
      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border"
            style={{
              background: `color-mix(in srgb, ${theme.accent} 22%, var(--color-bg-elevated))`,
              borderColor: `color-mix(in srgb, ${theme.accent} 35%, var(--color-border))`,
              boxShadow: `0 0 24px color-mix(in srgb, ${theme.accent} 28%, transparent)`,
            }}
          >
            <EventTypeIcon type={item.event.type} iconKey={iconKey} accent={theme.accent} className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  color: theme.accent,
                  background: `color-mix(in srgb, ${theme.accent} 18%, transparent)`,
                }}
              >
                {item.urgencyTagVi?.includes('SẮP') ? 'Sắp diễn ra' : item.urgencyTagVi || 'Sắp tới'}
              </span>
              {day ? <span className="text-xs text-ds-subtle">{day}</span> : null}
            </div>
            <h2 className="text-xl font-bold leading-tight text-ds-text sm:text-2xl">{item.event.titleVi}</h2>
            <p className="mt-1 text-sm text-ds-muted">
              {content.subtitleVi || content.subtitleEn || item.event.summaryVi}
            </p>
            {gem && (item.event.eventKind || 'observable') === 'observable' ? (
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-ds-amber">
                <Gem className="h-3.5 w-3.5" />+{gem} gem khi check-in
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenEvent?.(item.event)}
          className="inline-flex shrink-0 items-center gap-1 self-start text-sm font-semibold text-ds-accent transition hover:gap-2 sm:self-center"
        >
          Chi tiết
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </CosmoPanel>
  )
}

function SecondaryLine({
  item,
  onOpenEvent,
}: {
  item: AstronomyFeaturedUrgency
  onOpenEvent?: (event: AstronomyCalendarEvent) => void
}) {
  const theme = resolveEventTheme(item.event)
  const iconKey = resolveEventIconKey(item.event)

  return (
    <button
      type="button"
      onClick={() => onOpenEvent?.(item.event)}
      className="cosmo-dark-panel group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-4 py-3 text-left transition hover:border-ds-accent/30"
    >
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-xl" style={{ background: theme.accent }} aria-hidden />
      <EventTypeIcon type={item.event.type} iconKey={iconKey} accent={theme.accent} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ds-text">{item.event.titleVi}</p>
      </div>
      <span className="shrink-0 text-xs font-medium text-ds-accent">Chi tiết →</span>
    </button>
  )
}

export function CalendarUrgencyBanner({
  urgency,
  secondaryUrgency,
  nextEclipseTitle,
  onOpenEvent,
  className = '',
}: Props) {
  const showPrimary = urgency?.isWithinUrgentWindow
  const showSecondary = secondaryUrgency || (!showPrimary && urgency)

  if (!showPrimary && !showSecondary && !nextEclipseTitle) return null

  return (
    <div className={`space-y-3 ${className}`}>
      {showPrimary && urgency ? <PrimaryBanner item={urgency} onOpenEvent={onOpenEvent} /> : null}
      {showSecondary ? (
        secondaryUrgency ? (
          <SecondaryLine item={secondaryUrgency} onOpenEvent={onOpenEvent} />
        ) : urgency && !showPrimary ? (
          <SecondaryLine item={urgency} onOpenEvent={onOpenEvent} />
        ) : null
      ) : null}
      {!showPrimary && !showSecondary && nextEclipseTitle ? (
        <div className="cosmo-dark-panel rounded-xl px-4 py-3">
          <p className="text-xs text-ds-muted">
            Nhật / Nguyệt thực kế · <span className="text-ds-text">{nextEclipseTitle}</span>
          </p>
        </div>
      ) : null}
    </div>
  )
}
