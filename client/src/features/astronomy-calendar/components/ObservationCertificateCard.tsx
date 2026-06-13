'use client'

import { forwardRef } from 'react'
import { Gem, Sparkles, Telescope } from 'lucide-react'
import type { AstronomyCalendarEvent } from '../types'
import {
  eventAccent,
  formatEventDayLabel,
  formatEventTimeIct,
  resolveEventContent,
} from '../lib/eventContent'
import { EventTypeIcon } from './calendarUiPrimitives'

export type ObservationCertificateData = {
  event: AstronomyCalendarEvent
  photoUrl: string
  observerName: string
  checkedInAt: string
  gemAmount?: number
}

type Props = ObservationCertificateData & {
  className?: string
}

function StarField() {
  const stars = [
    [8, 12, 1.2],
    [18, 28, 0.8],
    [72, 8, 1],
    [88, 22, 0.6],
    [42, 6, 0.7],
    [55, 18, 1.1],
    [92, 38, 0.9],
    [12, 44, 0.5],
    [28, 52, 0.8],
    [64, 46, 0.6],
    [78, 58, 1],
    [6, 68, 0.7],
    [34, 72, 0.5],
    [50, 64, 0.9],
    [86, 74, 0.6],
  ] as const

  return (
    <>
      {stars.map(([left, top, size], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: size,
            height: size,
            opacity: 0.15 + (i % 4) * 0.12,
            boxShadow: '0 0 6px rgba(255,255,255,0.35)',
          }}
        />
      ))}
    </>
  )
}

export const ObservationCertificateCard = forwardRef<HTMLDivElement, Props>(function ObservationCertificateCard(
  { event, photoUrl, observerName, checkedInAt, gemAmount = 0, className = '' },
  ref,
) {
  const content = resolveEventContent(event)
  const accent = eventAccent(event)
  const dayLabel = formatEventDayLabel(event.peakAt || event.startAt)
  const timeLabel = formatEventTimeIct(event.peakAt || event.startAt)
  const checkedLabel = new Date(checkedInAt).toLocaleString('vi-VN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  })

  return (
    <div
      ref={ref}
      className={`relative aspect-[4/5] w-full max-w-[360px] overflow-hidden rounded-[28px] ${className}`}
      style={{
        background:
          'radial-gradient(ellipse 120% 80% at 50% -10%, color-mix(in srgb, var(--cert-accent) 28%, transparent), transparent 55%), linear-gradient(165deg, #070912 0%, #0c1020 42%, #05060c 100%)',
        ['--cert-accent' as string]: accent,
        boxShadow: `0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px color-mix(in srgb, ${accent} 22%, #ffffff18), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <StarField />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 3px)',
        }}
      />

      <div className="relative flex h-full flex-col px-6 pb-6 pt-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: `color-mix(in srgb, ${accent} 85%, white)` }}
            >
              CosmoLearn
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              Chứng nhận quan sát
            </p>
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl border"
            style={{
              borderColor: `color-mix(in srgb, ${accent} 35%, #ffffff20)`,
              background: `color-mix(in srgb, ${accent} 12%, #ffffff08)`,
              color: accent,
            }}
          >
            <Telescope className="h-5 w-5" strokeWidth={1.6} />
          </div>
        </div>

        <div className="relative mx-auto mt-5 w-[78%]">
          <div
            className="absolute -inset-1 rounded-[22px] opacity-80 blur-md"
            style={{ background: `linear-gradient(135deg, ${accent}, transparent 70%)` }}
          />
          <div
            className="relative overflow-hidden rounded-[20px] border-2 bg-[#05060c]"
            style={{ borderColor: `color-mix(in srgb, ${accent} 55%, #ffffff30)` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt="Ảnh quan sát"
              crossOrigin="anonymous"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          <div
            className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90 backdrop-blur-md"
            style={{
              borderColor: `color-mix(in srgb, ${accent} 40%, #ffffff25)`,
              background: 'rgba(5, 6, 12, 0.82)',
            }}
          >
            <Sparkles className="h-3 w-3" style={{ color: accent }} />
            Đã quan sát
          </div>
        </div>

        <div className="mt-8 flex flex-1 flex-col items-center text-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{
              color: accent,
              background: `color-mix(in srgb, ${accent} 14%, transparent)`,
              border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
            }}
          >
            <EventTypeIcon type={event.type} iconKey={content.iconKey} className="h-3.5 w-3.5" />
            {content.typeLabelVi}
          </span>

          <h2 className="mt-3 text-balance text-[1.35rem] font-semibold leading-tight tracking-tight text-white">
            {event.titleVi}
          </h2>

          {(dayLabel || timeLabel) && (
            <p className="mt-2 text-sm text-white/55">
              {[dayLabel, timeLabel].filter(Boolean).join(' · ')}
            </p>
          )}

          <p className="mt-4 text-xs text-white/40">Quan sát bởi</p>
          <p className="mt-0.5 max-w-full truncate text-sm font-medium text-white/90">{observerName}</p>
          <p className="mt-1 text-[11px] text-white/35">Check-in {checkedLabel}</p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          {gemAmount > 0 ? (
            <div
              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold"
              style={{
                borderColor: 'color-mix(in srgb, #fbbf24 35%, transparent)',
                background: 'color-mix(in srgb, #fbbf24 10%, transparent)',
                color: '#fde68a',
              }}
            >
              <Gem className="h-4 w-4" />+{gemAmount} gem
            </div>
          ) : (
            <div />
          )}

          <div
            className="relative rotate-[-8deg] rounded-xl border-2 px-3 py-2 text-center"
            style={{
              borderColor: `color-mix(in srgb, ${accent} 50%, #ffffff20)`,
              color: accent,
            }}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] opacity-70">Verified</p>
            <p className="text-xs font-bold uppercase tracking-[0.08em]">Thành tích</p>
          </div>
        </div>
      </div>
    </div>
  )
})
