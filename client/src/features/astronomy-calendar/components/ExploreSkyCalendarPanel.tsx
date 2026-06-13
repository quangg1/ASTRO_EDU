'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { AstronomyCalendarQuery } from '../api/astronomyCalendarApi'
import type { AstronomyCalendarEvent, AstronomyCalendarResponse } from '../types'
import { useUpcomingAstronomyCalendar } from '../hooks/useAstronomyCalendar'
import { AstronomyEventRow } from './AstronomyEventRow'
import { SkyHudSheet } from '@/components/explore/SkyHudSheet'

const SKY_EVENT_LIMIT = 5

type Props = {
  open: boolean
  onClose: () => void
  query?: AstronomyCalendarQuery
  onJumpToEvent?: (event: AstronomyCalendarEvent) => void
  /** Truyền từ overlay để tránh fetch trùng (badge + panel). */
  data?: AstronomyCalendarResponse | null
  loading?: boolean
}

export function ExploreSkyCalendarPanel({
  open,
  onClose,
  query = {},
  onJumpToEvent,
  data: dataProp,
  loading: loadingProp,
}: Props) {
  const fetched = useUpcomingAstronomyCalendar({ days: 30, ...query }, dataProp === undefined)
  const data = dataProp ?? fetched.data
  const loading = dataProp !== undefined ? (loadingProp ?? false) : fetched.loading

  const { live, upcoming } = useMemo(() => {
    const liveRows = data?.live ?? []
    const upcomingRows = (data?.upcoming ?? []).slice(0, SKY_EVENT_LIMIT)
    return { live: liveRows, upcoming: upcomingRows }
  }, [data])

  const handleJump = (ev: AstronomyCalendarEvent) => {
    onJumpToEvent?.(ev)
    onClose()
  }

  return (
    <SkyHudSheet
      open={open}
      onClose={onClose}
      subtitle={data?.observer?.labelVi ? `Quan sát · ${data.observer.labelVi}` : 'Quan sát bầu trời'}
      title="Sự kiện sắp tới"
    >
      {loading ? (
        <p className="px-1 py-6 text-center text-xs text-slate-500">Đang tải sự kiện…</p>
      ) : live.length === 0 && upcoming.length === 0 ? (
        <p className="px-1 py-6 text-center text-xs leading-relaxed text-slate-500">
          Không có sự kiện nổi bật trong 30 ngày tới tại vị trí này.
        </p>
      ) : (
        <div className="space-y-3">
          {live.length > 0 ? (
            <section className="space-y-1.5">
              <p className="px-1 text-[10px] font-medium uppercase tracking-wider text-sky-400/90">
                Đang diễn ra
              </p>
              {live.map((ev) => (
                <AstronomyEventRow key={ev.id} event={ev} onJump={handleJump} />
              ))}
            </section>
          ) : null}
          {upcoming.length > 0 ? (
            <section className="space-y-1.5">
              <p className="px-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Tiếp theo
              </p>
              {upcoming.map((ev) => (
                <AstronomyEventRow key={ev.id} event={ev} onJump={handleJump} />
              ))}
            </section>
          ) : null}
          <p className="px-1 pt-1 text-[10px] leading-relaxed text-slate-600">
            Chạm sự kiện để nhảy tới thời điểm trên la bàn — không rời khỏi Sky.
          </p>
          <Link
            href="/calendar"
            className="mx-1 mt-2 block rounded-lg border border-white/10 py-2 text-center text-xs text-sky-300 hover:bg-white/5"
          >
            Mở Lịch Thiên Văn đầy đủ →
          </Link>
        </div>
      )}
    </SkyHudSheet>
  )
}

/** Số sự kiện gợi ý trên badge toolbar. */
export function countSkyHudEvents(data: AstronomyCalendarResponse | null | undefined): number {
  if (!data) return 0
  return (data.live?.length ?? 0) + Math.min(data.upcoming?.length ?? 0, SKY_EVENT_LIMIT)
}
