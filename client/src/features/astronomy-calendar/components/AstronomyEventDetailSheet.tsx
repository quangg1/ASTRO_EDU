'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Camera,
  Clock,
  Gem,
  Info,
  MapPin,
  Sparkles,
  Telescope,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import type { AstronomyCalendarEvent, AstronomyEventEngagement } from '../types'
import { remindAstronomyEvent } from '../api/astronomyCalendarApi'
import { eventKindLabel, checkInHintVi } from '../lib/eventUi'
import {
  eventAccent,
  formatEventDayLabel,
  formatEventTimeIct,
  resolveEventContent,
} from '../lib/eventContent'
import { EventTypeIcon } from './calendarUiPrimitives'
import { AstronomyCheckInModal } from './AstronomyCheckInModal'

type Props = {
  event: AstronomyCalendarEvent | null
  open: boolean
  onClose: () => void
}

export function AstronomyEventDetailSheet({ event, open, onClose }: Props) {
  const { user } = useAuthStore()
  const [busy, setBusy] = useState<'remind' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [engagement, setEngagement] = useState<AstronomyEventEngagement | undefined>(event?.engagement)

  useEffect(() => {
    setEngagement(event?.engagement)
  }, [event?.id, event?.engagement])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) setMsg(null)
  }, [open, event?.id])

  if (typeof document === 'undefined') return null
  if (!event) return null

  const content = resolveEventContent(event)
  const accent = eventAccent(event)
  const isObservable = (event.eventKind || 'observable') === 'observable'
  const checkInHint = checkInHintVi(event)
  const timeLabel = formatEventTimeIct(event.peakAt || event.startAt)
  const dayLabel = formatEventDayLabel(event.peakAt || event.startAt)

  const handleRemind = async () => {
    if (!user) {
      setMsg('Đăng nhập để nhận nhắc nhở')
      return
    }
    setBusy('remind')
    setMsg(null)
    const res = await remindAstronomyEvent(event.id)
    setBusy(null)
    setMsg(res.success ? 'Đã đặt nhắc nhở trước đỉnh 24h' : res.error || 'Lỗi')
  }

  const handleCheckInOpen = () => {
    if (!user) {
      setMsg('Đăng nhập để nhận gem và lưu thành tích')
      return
    }
    setCheckInOpen(true)
  }

  const displayEvent = event ? { ...event, engagement } : null

  return (
    <>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Đóng"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="astronomy-event-detail-title"
        className="relative w-full max-w-lg overflow-hidden rounded-t-3xl border border-ds-border sm:rounded-3xl animate-slide-up-fade"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated) 96%, black) 0%, var(--color-bg-elevated) 100%)',
          boxShadow: `0 -8px 40px rgba(0,0,0,0.45), 0 0 48px -12px color-mix(in srgb, ${accent} 35%, transparent)`,
        }}
      >
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
          aria-hidden
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chi tiết"
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-ds-muted transition hover:bg-ds-surface hover:text-ds-text"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
          <div className="mb-5 flex gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border"
              style={{
                background: `color-mix(in srgb, ${accent} 22%, var(--color-bg-elevated))`,
                borderColor: `color-mix(in srgb, ${accent} 35%, var(--color-border))`,
                boxShadow: `0 0 28px color-mix(in srgb, ${accent} 30%, transparent)`,
              }}
            >
              <EventTypeIcon type={event.type} className="h-7 w-7" />
            </div>
            <div className="min-w-0 pt-1">
              <span
                className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  color: accent,
                  background: `color-mix(in srgb, ${accent} 18%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${accent} 30%, var(--color-border))`,
                }}
              >
                {content.typeLabelVi}
              </span>
              <h2 id="astronomy-event-detail-title" className="mt-2 text-xl font-bold leading-tight text-ds-text">
                {event.titleVi}
              </h2>
              {content.subtitleEn ? (
                <p className="mt-1 text-sm italic text-ds-accent/90">{content.subtitleEn}</p>
              ) : content.subtitleVi ? (
                <p className="mt-1 text-sm text-ds-muted">{content.subtitleVi}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 border-y border-ds-border py-4 text-sm">
            {timeLabel ? (
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-ds-muted">
                  <Clock className="h-4 w-4 shrink-0 text-ds-accent" />
                  Thời gian
                </span>
                <span className="text-right font-medium text-ds-text">
                  {timeLabel}
                  {dayLabel ? <span className="block text-xs font-normal text-ds-subtle">{dayLabel}</span> : null}
                </span>
              </div>
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-ds-muted">
                <MapPin className="h-4 w-4 shrink-0 text-ds-accent" />
                Khả năng quan sát
              </span>
              <span className="max-w-[14rem] text-right text-ds-text">{content.visibilityLabelVi}</span>
            </div>
            {event.eventKind ? (
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-ds-muted">
                  <Sparkles className="h-4 w-4 shrink-0 text-ds-accent" />
                  Loại
                </span>
                <span className="text-ds-text">{eventKindLabel(event.eventKind)}</span>
              </div>
            ) : null}
          </div>

          {content.descriptionVi ? (
            <section className="mt-5">
              <h3 className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-accent">
                <Info className="h-3.5 w-3.5" />
                Mô tả
              </h3>
              <p className="text-sm leading-relaxed text-ds-muted">{content.descriptionVi}</p>
            </section>
          ) : null}

          {content.observationTipsVi ? (
            <section className="mt-5">
              <h3 className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-accent">
                <Telescope className="h-3.5 w-3.5" />
                Mẹo quan sát
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: accent }}>
                {content.observationTipsVi}
              </p>
            </section>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={event.exploreHref}
              className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:brightness-110"
              style={{
                color: accent,
                borderColor: `color-mix(in srgb, ${accent} 40%, var(--color-border))`,
                background: `color-mix(in srgb, ${accent} 14%, transparent)`,
              }}
            >
              {event.ctaLabelVi || 'Sky View'}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            {event.lessonHref ? (
              <Link
                href={event.lessonHref}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ds-border bg-ds-elevated px-4 py-2.5 text-sm text-ds-muted transition hover:text-ds-text"
              >
                <BookOpen className="h-4 w-4" />
                Bài học
              </Link>
            ) : null}
            {isObservable ? (
              <>
                <button
                  type="button"
                  disabled={busy !== null || engagement?.reminded}
                  onClick={() => void handleRemind()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-100 transition hover:bg-violet-500/15 disabled:opacity-45"
                >
                  <Bell className="h-4 w-4" />
                  {engagement?.reminded ? 'Đã nhắc' : busy === 'remind' ? '…' : 'Nhắc nhở'}
                </button>
                {event.isLive ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void handleCheckInOpen()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-ds-amber/30 bg-ds-amber/10 px-4 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-ds-amber/15 disabled:opacity-45"
                  >
                    {engagement?.observationPhotoUrl ? (
                      <Camera className="h-4 w-4" />
                    ) : (
                      <Gem className="h-4 w-4" />
                    )}
                    {engagement?.observationPhotoUrl
                      ? 'Xem thành tích'
                      : engagement?.gemAwarded
                        ? `+${engagement.gemAmount} gem`
                        : engagement?.checkedIn
                          ? 'Đã check-in'
                          : 'Check-in & ảnh'}
                  </button>
                ) : engagement?.observationPhotoUrl ? (
                  <button
                    type="button"
                    onClick={() => void handleCheckInOpen()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-ds-border bg-ds-elevated px-4 py-2.5 text-sm text-ds-muted transition hover:text-ds-text"
                  >
                    <Camera className="h-4 w-4" />
                    Xem thành tích
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
          {checkInHint ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ds-subtle">
              <Gem className="h-3.5 w-3.5 shrink-0 text-ds-amber/80" />
              {checkInHint}
            </p>
          ) : null}
          {msg ? <p className="mt-3 text-xs text-ds-subtle">{msg}</p> : null}
        </div>
      </div>
    </div>,
            document.body,
          )
        : null}
      <AstronomyCheckInModal
        event={displayEvent}
        open={checkInOpen}
        observerName={user?.displayName || user?.email || 'Nhà quan sát'}
        onClose={() => setCheckInOpen(false)}
        onEngagementUpdate={(next) => {
          setEngagement(next)
          setMsg(next.gemAmount ? `+${next.gemAmount} gem — thành tích đã lưu!` : 'Thành tích đã lưu!')
        }}
      />
    </>
  )
}
