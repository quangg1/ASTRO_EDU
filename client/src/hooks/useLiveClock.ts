'use client'

import { useEffect, useState } from 'react'

/** HH:mm:ss theo múi giờ máy người dùng (không phải UTC). */
export function formatLocalTime(now: Date): string {
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}

/** Nhãn múi giờ: GMT+7, ICT, Asia/Ho_Chi_Minh, … */
export function resolveTimezoneLabel(now = new Date(), locale?: string): string {
  const loc = locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'vi-VN')
  try {
    const parts = new Intl.DateTimeFormat(loc, { timeZoneName: 'shortOffset' }).formatToParts(now)
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value
    if (offset) return offset
  } catch {
    /* fall through */
  }
  try {
    const parts = new Intl.DateTimeFormat(loc, { timeZoneName: 'short' }).formatToParts(now)
    const short = parts.find((p) => p.type === 'timeZoneName')?.value
    if (short) return short
  } catch {
    /* fall through */
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz) return tz.replace(/^.*\//, '').replace(/_/g, ' ')
  } catch {
    /* ignore */
  }
  return 'Local'
}

export type LiveClockState = {
  time: string
  zoneLabel: string
  /** IANA, e.g. Asia/Ho_Chi_Minh */
  timeZone: string
}

const INITIAL: LiveClockState = {
  time: '--:--:--',
  zoneLabel: '…',
  timeZone: '',
}

/**
 * Đồng hồ live theo múi giờ hệ thống/trình duyệt của người dùng.
 * Không cần geolocation — `Date` + `Intl` đọc timezone OS.
 */
export function useLiveClock(intervalMs = 1000, locale?: string): LiveClockState {
  const [state, setState] = useState<LiveClockState>(INITIAL)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      let timeZone = ''
      try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
      } catch {
        timeZone = ''
      }
      setState({
        time: formatLocalTime(now),
        zoneLabel: resolveTimezoneLabel(now, locale),
        timeZone,
      })
    }
    tick()
    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, locale])

  return state
}
