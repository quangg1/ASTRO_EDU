'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MapPin, Telescope } from 'lucide-react'
import { AgentPageProvider } from '@/features/agent/public'
import {
  useAstronomyFeatured,
  useAstronomyMonthCalendar,
  useUpcomingAstronomyCalendar,
} from '../hooks/useAstronomyCalendar'
import { buildCalendarAgentSessionContext } from '../lib/buildCalendarAgentSessionContext'
import { CalendarUrgencyBanner } from './CalendarUrgencyBanner'
import { AstronomyEventDetailSheet } from './AstronomyEventDetailSheet'
import { MonthEventCalendar } from './MonthEventCalendar'
import { MonthEventListSection } from './MonthEventListSection'
import { filterEvents } from '../lib/eventUi'
import type { AstronomyCalendarEvent, CalendarFilterChip } from '../types'

type CalendarView = 'month' | 'week' | 'year'

function eventInMonth(ev: AstronomyCalendarEvent, year: number, month: number) {
  const d = new Date(ev.peakAt || ev.startAt)
  return d.getFullYear() === year && d.getMonth() + 1 === month
}

export function AstronomyCalendarPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [filter, setFilter] = useState<CalendarFilterChip>('all')
  const [view, setView] = useState<CalendarView>('month')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const { data: featured, loading: featuredLoading } = useAstronomyFeatured({ preset: 'hanoi' })
  const { data: monthData, loading: monthLoading } = useAstronomyMonthCalendar({ year, month, preset: 'hanoi' })
  const { data: upcoming } = useUpcomingAstronomyCalendar({ days: 90, preset: 'hanoi' })

  const catalogEvents = useMemo(() => {
    const merged = [...(monthData?.events ?? []), ...(upcoming?.events ?? [])]
    const seen = new Set<string>()
    return merged.filter((ev) => {
      if (seen.has(ev.id)) return false
      seen.add(ev.id)
      return true
    })
  }, [monthData?.events, upcoming?.events])

  const monthEvents = useMemo(
    () =>
      filterEvents(catalogEvents, filter)
        .filter((ev) => eventInMonth(ev, year, month))
        .sort(
          (a, b) =>
            new Date(a.peakAt || a.startAt).getTime() - new Date(b.peakAt || b.startAt).getTime(),
        ),
    [catalogEvents, filter, year, month],
  )

  const selectedEvent = useMemo(
    () => catalogEvents.find((ev) => ev.id === selectedEventId) ?? null,
    [catalogEvents, selectedEventId],
  )

  const openEvent = useCallback(
    (event: AstronomyCalendarEvent) => {
      setSelectedEventId(event.id)
      const d = new Date(event.peakAt || event.startAt)
      if (!Number.isNaN(d.getTime())) {
        setYear(d.getFullYear())
        setMonth(d.getMonth() + 1)
      }
      router.replace(`/calendar?event=${encodeURIComponent(event.id)}`, { scroll: false })
    },
    [router],
  )

  const closeEvent = useCallback(() => {
    setSelectedEventId(null)
    router.replace('/calendar', { scroll: false })
  }, [router])

  useEffect(() => {
    const id = searchParams.get('event')
    if (!id) {
      setSelectedEventId(null)
      return
    }
    const ev = catalogEvents.find((e) => e.id === id)
    if (!ev) return
    setSelectedEventId(id)
    const d = new Date(ev.peakAt || ev.startAt)
    if (!Number.isNaN(d.getTime())) {
      setYear(d.getFullYear())
      setMonth(d.getMonth() + 1)
    }
  }, [searchParams, catalogEvents])

  const monthLabel = `Tháng ${month}`
  const monthNameVi = new Date(year, month - 1, 1).toLocaleDateString('vi-VN', { month: 'long' })

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
  }

  const observerLabel = upcoming?.observer?.labelVi || monthData?.observer?.labelVi || 'Việt Nam'

  const agentSessionContext = useMemo(
    () =>
      buildCalendarAgentSessionContext({
        pathname: `${pathname || '/calendar'}${searchParams.get('event') ? `?event=${searchParams.get('event')}` : ''}`,
        selectedEvent,
        upcomingTitles: catalogEvents.slice(0, 6).map((e) => e.titleVi),
      }),
    [pathname, searchParams, selectedEvent, catalogEvents],
  )

  return (
    <AgentPageProvider value={{ sessionContext: agentSessionContext }}>
    <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-24">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-ds-border bg-ds-elevated text-ds-accent">
            <Telescope className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ds-text sm:text-3xl">Lịch Thiên Văn</h1>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-ds-subtle">
              <MapPin className="h-3.5 w-3.5 text-ds-accent" />
              {observerLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(['year', 'month', 'week'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                view === v
                  ? 'bg-ds-accent/20 text-ds-accent ring-1 ring-ds-accent/30'
                  : 'text-ds-muted hover:bg-ds-elevated hover:text-ds-text'
              }`}
            >
              {v === 'year' ? 'Năm' : v === 'month' ? 'Tháng' : 'Tuần'}
            </button>
          ))}
          <Link
            href="/explore?view=sky"
            className="ml-2 hidden rounded-xl border border-ds-accent/40 bg-ds-accent/10 px-3 py-1.5 text-xs font-semibold text-ds-accent sm:inline-flex"
          >
            La bàn 3D
          </Link>
        </div>
      </header>

      {!featuredLoading ? (
        <CalendarUrgencyBanner
          urgency={featured?.urgency ?? null}
          secondaryUrgency={featured?.secondaryUrgency ?? null}
          nextEclipseTitle={featured?.nextEclipse?.titleVi ?? null}
          onOpenEvent={openEvent}
          className="mb-6"
        />
      ) : (
        <div className="cosmo-dark-panel mb-6 h-32 animate-pulse rounded-2xl" />
      )}

      {view === 'month' ? (
        <>
          <MonthEventCalendar
            year={year}
            month={month}
            monthLabel={monthLabel}
            monthNameVi={monthNameVi}
            eventCount={monthEvents.length}
            monthData={monthData}
            filter={filter}
            onFilterChange={setFilter}
            onShiftMonth={shiftMonth}
            selectedEventId={selectedEventId}
            onSelectEvent={openEvent}
            loading={monthLoading}
          />
          <MonthEventListSection
            events={monthEvents}
            selectedEventId={selectedEventId}
            onSelectEvent={openEvent}
            loading={monthLoading}
          />
        </>
      ) : (
        <div className="cosmo-dark-panel rounded-2xl p-10 text-center">
          <p className="text-sm text-ds-muted">
            Chế độ {view === 'year' ? 'Năm' : 'Tuần'} đang được phát triển — dùng chế độ Tháng để xem sự kiện.
          </p>
          <button
            type="button"
            onClick={() => setView('month')}
            className="mt-4 text-sm font-semibold text-ds-accent hover:underline"
          >
            Quay lại tháng
          </button>
        </div>
      )}

      <AstronomyEventDetailSheet event={selectedEvent} open={!!selectedEvent} onClose={closeEvent} />
    </div>
    </AgentPageProvider>
  )
}
