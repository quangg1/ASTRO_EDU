'use client'

import Link from 'next/link'
import { Cloud, Moon, Telescope } from 'lucide-react'
import { useTonightAstronomyCalendar, useAstronomyFeatured } from '../hooks/useAstronomyCalendar'
import { useSkyWeather } from '../hooks/useSkyWeather'
import type { AstronomyCalendarQuery } from '../api/astronomyCalendarApi'
import { AstronomyEventCard } from './AstronomyEventCard'
import { CalendarUrgencyBanner } from './CalendarUrgencyBanner'
import { Brackets } from './calendarUiPrimitives'

type Props = {
  query?: AstronomyCalendarQuery
  title?: string
  maxItems?: number
  className?: string
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
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />
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
        <div className="space-y-3">
          {items.map((ev) => (
            <AstronomyEventCard key={ev.id} event={ev} compact showEngagement={false} />
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
