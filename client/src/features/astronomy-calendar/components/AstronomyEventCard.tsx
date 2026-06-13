'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowUpRight, Bell, BookOpen, Camera, Gem, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import type { AstronomyCalendarEvent, AstronomyEventEngagement } from '../types'
import {
  eventKindLabel,
  difficultyLabel,
  formatEventWhen,
  checkInHintVi,
} from '../lib/eventUi'
import { remindAstronomyEvent } from '../api/astronomyCalendarApi'
import { EventTypeIcon, resolveEventTheme, resolveEventIconKey } from './calendarUiPrimitives'
import { resolveEventContent } from '../lib/eventContent'
import { AstronomyCheckInModal } from './AstronomyCheckInModal'

type Props = {
  event: AstronomyCalendarEvent
  compact?: boolean
  onJump?: (event: AstronomyCalendarEvent) => void
  showEngagement?: boolean
  timeline?: boolean
}

export function AstronomyEventCard({
  event,
  compact,
  onJump,
  showEngagement = true,
  timeline,
}: Props) {
  const { user } = useAuthStore()
  const [busy, setBusy] = useState<'remind' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [engagement, setEngagement] = useState<AstronomyEventEngagement | undefined>(event.engagement)

  useEffect(() => {
    setEngagement(event.engagement)
  }, [event.id, event.engagement])

  const when = formatEventWhen(event.peakAt || event.startAt)
  const typeLabel = resolveEventContent(event).typeLabelVi
  const kind = event.eventKind || 'observable'
  const diff = difficultyLabel(event.difficulty)
  const isObservable = kind === 'observable'
  const checkInHint = checkInHintVi(event)
  const theme = resolveEventTheme(event)
  const iconKey = resolveEventIconKey(event)

  const handleRemind = async (e: React.MouseEvent) => {
    e.stopPropagation()
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

  const handleCheckInOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) {
      setMsg('Đăng nhập để nhận gem và lưu thành tích')
      return
    }
    setCheckInOpen(true)
  }

  const displayEvent = { ...event, engagement }

  return (
    <>
    <article
      className={`group relative overflow-hidden rounded-2xl cosmo-dark-panel transition-all duration-200 ${
        event.isLive ? 'ring-1 ring-ds-accent/40 shadow-[0_0_24px_var(--color-accent-soft)]' : 'hover:border-ds-accent/20'
      } ${compact ? 'p-3' : 'p-4 sm:p-5'} ${timeline ? 'ml-0' : ''}`}
    >
      <div
        className="absolute left-0 top-0 h-full w-[3px] opacity-80"
        style={{ background: `linear-gradient(180deg, ${theme.accent}, transparent)` }}
        aria-hidden
      />

      <div className={`flex gap-3 ${compact ? '' : 'sm:gap-4'}`}>
        {!compact ? (
          <div
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 sm:flex"
            style={{ background: theme.iconBg }}
          >
            <EventTypeIcon type={event.type} iconKey={iconKey} accent={theme.accent} className="h-5 w-5" />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {event.isLive ? (
              <span className="rounded-full bg-sky-500/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-100">
                Trực tiếp
              </span>
            ) : null}
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${theme.pill}`}>
              {typeLabel}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                isObservable
                  ? 'bg-violet-500/12 text-violet-200 ring-1 ring-violet-400/20'
                  : 'bg-amber-500/12 text-amber-200 ring-1 ring-amber-400/20'
              }`}
            >
              {eventKindLabel(kind)}
            </span>
            {diff ? (
              <span className="text-[9px] uppercase tracking-wide text-slate-500">{diff}</span>
            ) : null}
          </div>

          <h3
            className={`font-semibold leading-snug text-white ${compact ? 'text-sm' : 'text-base sm:text-lg'}`}
          >
            {event.titleVi}
          </h3>

          {!compact && event.summaryVi ? (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ds-muted sm:text-sm">
              {event.summaryVi}
            </p>
          ) : null}

          {when ? (
            <p className="mt-2 text-[11px] font-medium text-ds-subtle sm:text-xs">{when}</p>
          ) : null}

          <div className={`flex flex-wrap gap-2 ${compact ? 'mt-2' : 'mt-4'}`}>
            {onJump ? (
              <button
                type="button"
                onClick={() => onJump(event)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                style={{ background: `${theme.accent}33`, border: `1px solid ${theme.accent}44` }}
              >
                Sky View
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <Link
                href={event.exploreHref}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                style={{ background: `${theme.accent}33`, border: `1px solid ${theme.accent}44` }}
              >
                {event.ctaLabelVi || 'Sky View'}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
            {event.lessonHref ? (
              <Link
                href={event.lessonHref}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Bài học
              </Link>
            ) : null}
            {event.quizHref ? (
              <Link
                href={event.quizHref}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Quiz
              </Link>
            ) : null}
          </div>

          {showEngagement && isObservable && !compact ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
              <button
                type="button"
                disabled={busy !== null || engagement?.reminded}
                onClick={handleRemind}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-100 transition hover:bg-violet-500/15 disabled:opacity-45"
              >
                <Bell className="h-3.5 w-3.5" />
                {engagement?.reminded ? 'Đã nhắc' : busy === 'remind' ? '…' : 'Nhắc nhở'}
              </button>
              {event.isLive || engagement?.observationPhotoUrl ? (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={handleCheckInOpen}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-100 transition hover:bg-amber-500/15 disabled:opacity-45"
                >
                  {engagement?.observationPhotoUrl ? (
                    <Camera className="h-3.5 w-3.5" />
                  ) : (
                    <Gem className="h-3.5 w-3.5" />
                  )}
                  {engagement?.observationPhotoUrl
                    ? 'Xem thành tích'
                    : engagement?.gemAwarded
                      ? `+${engagement.gemAmount} gem`
                      : engagement?.checkedIn
                        ? 'Đã check-in'
                        : 'Check-in & ảnh'}
                </button>
              ) : null}
            </div>
          ) : null}
          {showEngagement && checkInHint ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-slate-400">
              <Gem className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />
              {checkInHint}
            </p>
          ) : null}
          {msg ? <p className="mt-2 text-[11px] text-slate-400">{msg}</p> : null}
        </div>
      </div>
    </article>
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
