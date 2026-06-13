'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AstronomyCalendarEvent, CalendarFilterChip } from '../types'
import { CALENDAR_FILTER_CHIPS, filterEvents, shortEventLabel } from '../lib/eventUi'
import { eventAccent } from '../lib/eventContent'
import { CosmoPanel, EventTypeIcon } from './calendarUiPrimitives'
import type { useAstronomyMonthCalendar } from '../hooks/useAstronomyCalendar'

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const
const SUNDAY_TONE = '#e8957a'

const LEGEND = [
  { color: '#fbbf24', label: 'Mặt Trăng' },
  { color: '#c4b5fd', label: 'Thiên thạch' },
  { color: '#fb923c', label: 'Hành tinh / Nhật thực' },
  { color: '#22d3ee', label: 'Hội tụ' },
] as const

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function monthKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function pillAccentForEvent(ev: AstronomyCalendarEvent): string {
  if (ev.type === 'moon_phase') {
    const t = ev.titleVi.toLowerCase()
    if (t.includes('trăng tròn')) return '#fbbf24'
    if (t.includes('trăng non') || t.includes('khuyết')) return '#94a3b8'
  }
  return eventAccent(ev)
}

function CalendarEventPill({
  ev,
  selected,
  onSelect,
}: {
  ev: AstronomyCalendarEvent
  selected: boolean
  onSelect: () => void
}) {
  const accent = pillAccentForEvent(ev)

  return (
    <button
      type="button"
      onClick={onSelect}
      title={ev.titleVi}
      className={`flex w-full min-w-0 items-center gap-1 rounded-full border px-1.5 py-[3px] text-left transition hover:brightness-110 sm:gap-1.5 sm:px-2 sm:py-1 ${
        selected ? 'ring-1 ring-white/30' : ''
      }`}
      style={{
        background: `color-mix(in srgb, ${accent} 16%, rgba(8, 12, 24, 0.55))`,
        borderColor: `color-mix(in srgb, ${accent} 42%, transparent)`,
        color: accent,
        boxShadow: selected ? `0 0 12px color-mix(in srgb, ${accent} 25%, transparent)` : undefined,
      }}
    >
      <EventTypeIcon type={ev.type} className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" />
      <span className="min-w-0 truncate text-[9px] font-medium leading-none sm:text-[10px]">
        {shortEventLabel(ev.titleVi, 13)}
      </span>
    </button>
  )
}

function CalendarSkeletonGrid() {
  return (
    <div className="grid grid-cols-7 border border-ds-border/30">
      {Array.from({ length: 35 }).map((_, i) => (
        <div
          key={i}
          className="min-h-[6.25rem] animate-pulse border-b border-r border-ds-border/20 bg-ds-elevated/20 sm:min-h-[7.25rem]"
        />
      ))}
    </div>
  )
}

type Props = {
  year: number
  month: number
  monthLabel: string
  monthNameVi?: string
  eventCount: number
  monthData: ReturnType<typeof useAstronomyMonthCalendar>['data']
  filter: CalendarFilterChip
  onFilterChange: (chip: CalendarFilterChip) => void
  onShiftMonth: (delta: number) => void
  selectedEventId: string | null
  onSelectEvent: (event: AstronomyCalendarEvent) => void
  loading?: boolean
}

export function MonthEventCalendar({
  year,
  month,
  monthLabel,
  monthNameVi,
  eventCount,
  monthData,
  filter,
  onFilterChange,
  onShiftMonth,
  selectedEventId,
  onSelectEvent,
  loading,
}: Props) {
  const totalDays = daysInMonth(year, month)
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const today = new Date()
  const todayKey = monthKey(today.getFullYear(), today.getMonth() + 1, today.getDate())

  return (
    <CosmoPanel className="overflow-hidden p-3 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-ds-border/40 pb-4">
        <button
          type="button"
          onClick={() => onShiftMonth(-1)}
          className="rounded-lg p-2 text-ds-muted transition hover:bg-ds-elevated/60 hover:text-ds-text"
          aria-label="Tháng trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-base font-semibold text-ds-text sm:text-lg">{monthLabel}</p>
          <p className="text-[11px] capitalize text-ds-subtle">
            {monthNameVi ? `${monthNameVi} · ` : ''}
            {year} · {eventCount} sự kiện
          </p>
        </div>
        <button
          type="button"
          onClick={() => onShiftMonth(1)}
          className="rounded-lg p-2 text-ds-muted transition hover:bg-ds-elevated/60 hover:text-ds-text"
          aria-label="Tháng sau"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CALENDAR_FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onFilterChange(chip.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === chip.id
                ? 'border border-ds-accent/40 bg-ds-accent/15 text-ds-text'
                : 'border border-transparent bg-ds-elevated/40 text-ds-muted hover:border-ds-border/40 hover:text-ds-text'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-ds-border/35 bg-ds-elevated/[0.08]">
        <div className="grid grid-cols-7 border-b border-ds-border/25">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className="border-r border-ds-border/20 py-2 text-center last:border-r-0"
            >
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: i === 0 ? SUNDAY_TONE : 'var(--color-text-subtle)' }}
              >
                {d}
              </span>
            </div>
          ))}
        </div>

        {loading ? (
          <CalendarSkeletonGrid />
        ) : (
          <div className="grid grid-cols-7">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div
                key={`pad-${i}`}
                className="min-h-[6.25rem] border-b border-r border-ds-border/20 bg-ds-elevated/[0.04] sm:min-h-[7.25rem]"
                aria-hidden
              />
            ))}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1
              const key = monthKey(year, month, day)
              const dayOfWeek = new Date(year, month - 1, day).getDay()
              const isSunday = dayOfWeek === 0
              const dayEvents = filterEvents(monthData?.days?.[key] ?? [], filter).sort(
                (a, b) =>
                  new Date(a.peakAt || a.startAt).getTime() - new Date(b.peakAt || b.startAt).getTime(),
              )
              const isToday = key === todayKey
              const maxVisible = 2
              const visible = dayEvents.slice(0, maxVisible)
              const overflow = dayEvents.length - visible.length

              return (
                <div
                  key={key}
                  className={`relative flex min-h-[6.25rem] flex-col border-b border-r border-ds-border/20 p-2 sm:min-h-[7.25rem] sm:p-2.5 ${
                    isToday ? 'bg-ds-accent/[0.05]' : 'bg-ds-elevated/[0.06]'
                  }`}
                >
                  <span
                    className="text-[11px] font-medium tabular-nums sm:text-xs"
                    style={{
                      color: isToday
                        ? 'var(--color-accent)'
                        : isSunday
                          ? SUNDAY_TONE
                          : 'var(--color-text-subtle)',
                    }}
                  >
                    {day}
                  </span>

                  <div className="mt-auto flex flex-col gap-1 pt-2">
                    {visible.map((ev) => (
                      <CalendarEventPill
                        key={ev.id}
                        ev={ev}
                        selected={ev.id === selectedEventId}
                        onSelect={() => onSelectEvent(ev)}
                      />
                    ))}
                    {overflow > 0 ? (
                      <span className="px-1 text-[9px] font-medium text-ds-subtle">+{overflow}</span>
                    ) : null}
                  </div>
                </div>
              )
            })}
            {(() => {
              const trailing = (7 - ((firstWeekday + totalDays) % 7)) % 7
              return Array.from({ length: trailing }).map((_, i) => (
                <div
                  key={`trail-${i}`}
                  className="min-h-[6.25rem] border-b border-r border-ds-border/20 bg-ds-elevated/[0.04] sm:min-h-[7.25rem]"
                  aria-hidden
                />
              ))
            })()}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-ds-border/40 pt-3">
        {LEGEND.map(({ color, label }) => (
          <span key={label} className="inline-flex items-center gap-1.5 text-[10px] text-ds-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </CosmoPanel>
  )
}
