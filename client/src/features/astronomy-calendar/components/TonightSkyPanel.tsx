'use client'

import Link from 'next/link'
import { Cloud, Moon, Telescope } from 'lucide-react'
import { useTonightAstronomyCalendar, useAstronomyFeatured } from '../hooks/useAstronomyCalendar'
import { useSkyWeather } from '../hooks/useSkyWeather'
import type { AstronomyCalendarQuery } from '../api/astronomyCalendarApi'
import { CalendarUrgencyBanner } from './CalendarUrgencyBanner'
import { Brackets, EventTypeIcon, resolveEventTheme, resolveEventIconKey } from './calendarUiPrimitives'
import { formatEventWhen } from '../lib/eventUi'
import { resolveEventContent } from '../lib/eventContent'
import type { AstronomyCalendarEvent } from '../types'

type Props = {
  query?: AstronomyCalendarQuery
  title?: string
  maxItems?: number
  className?: string
}

const chamfer = (cut = 10) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

const ACCENT_COLORS = [
  'var(--color-accent)',       // cyan
  'var(--color-brand-amber)',  // amber
  'var(--color-brand-magenta)', // magenta
]

function TonightEventChip({ event, index }: { event: AstronomyCalendarEvent; index: number }) {
  const theme = resolveEventTheme(event)
  const iconKey = resolveEventIconKey(event)
  const when = formatEventWhen(event.peakAt || event.startAt)
  const content = resolveEventContent(event)
  const accentColor = ACCENT_COLORS[index % ACCENT_COLORS.length]

  return (
    <Link
      href={event.exploreHref}
      className="block transition-all hover:scale-[1.02]"
      style={{
        background: 'var(--color-bg-surface)',
        border: `1px solid color-mix(in srgb, ${accentColor} 25%, var(--color-border))`,
        padding: 16,
        ...chamfer(10),
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 36,
              height: 36,
              border: `1.5px solid color-mix(in srgb, ${accentColor} 40%, transparent)`,
              background: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
              boxShadow: `0 0 12px color-mix(in srgb, ${accentColor} 20%, transparent)`,
              ...chamfer(8),
            }}
          >
            <EventTypeIcon type={event.type} iconKey={iconKey} accent={accentColor} className="h-4 w-4" />
          </div>
          {when ? (
            <p
              className="dash-mono text-[10px] font-medium uppercase"
              style={{ color: accentColor, letterSpacing: '0.1em' }}
            >
              {when.split(' ')[0]}
            </p>
          ) : null}
        </div>
        <div>
          <h3
            className="text-sm font-semibold leading-tight mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {event.titleVi}
          </h3>
          <p
            className="text-[11px] leading-relaxed line-clamp-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {content.typeLabelVi}
            {event.summaryVi ? ` · ${event.summaryVi.slice(0, 60)}${event.summaryVi.length > 60 ? '...' : ''}` : ''}
          </p>
        </div>
      </div>
    </Link>
  )
}

export function TonightSkyPanel({
  query = {},
  title = 'Bầu trời tối nay',
  maxItems = 4,
  className = '',
}: Props) {
  const { data, loading, error } = useTonightAstronomyCalendar(query)
  const { data: featured } = useAstronomyFeatured(query)
  const lat = query.lat ?? data?.observer?.lat
  const lon = query.lon ?? data?.observer?.lon
  const { data: weather } = useSkyWeather(lat ?? NaN, lon ?? NaN, Number.isFinite(lat) && Number.isFinite(lon))

  const items = [...(data?.live ?? []), ...(data?.upcoming ?? [])].slice(0, maxItems)

  return (
    <section
      className={`relative cosmo-dark-panel overflow-hidden rounded-2xl border border-ds-border p-5 ${className}`}
    >
      <Brackets c="var(--color-accent)" s={12} o={6} />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ds-text">
            <Moon className="h-5 w-5 text-sky-400" />
            {title}
          </h2>
          {data?.observer?.labelVi ? (
            <p className="mt-1 text-xs text-ds-text-muted">{data.observer.labelVi}</p>
          ) : null}
          {weather ? (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-ds-text-subtle">
              <Cloud className="h-3 w-3" />
              {weather.labelVi} · che {weather.cloudCoverPct}% bầu trời
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Link href="/calendar" className="text-xs font-medium text-ds-accent hover:underline">
            Lịch đầy đủ →
          </Link>
          <Link href="/explore?view=sky" className="text-xs text-ds-text-muted hover:underline">
            La bàn chòm sao
          </Link>
        </div>
      </div>

      {featured?.urgency || featured?.secondaryUrgency ? (
        <CalendarUrgencyBanner
          urgency={featured.urgency ?? null}
          secondaryUrgency={featured.secondaryUrgency ?? null}
          nextEclipseTitle={featured.nextEclipse?.titleVi ?? null}
          className="mb-4"
        />
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-white/[0.04]" style={chamfer(10)} />
          ))}
        </div>
      ) : error || items.length === 0 ? (
        <p className="text-sm text-ds-text-muted">
          Chưa có sự kiện nổi bật cho đêm nay — thử{' '}
          <Link href="/calendar" className="text-ds-accent hover:underline">
            Lịch Thiên Văn
          </Link>{' '}
          hoặc{' '}
          <Link href="/explore?view=sky" className="text-ds-accent hover:underline">
            Explore Sky
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((ev, idx) => (
            <TonightEventChip key={ev.id} event={ev} index={idx} />
          ))}
        </div>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-[10px] text-ds-text-subtle">
        <Telescope className="h-3 w-3" />
        Check-in quan sát · nhận gem trên Lịch Thiên Văn
      </p>
    </section>
  )
}
