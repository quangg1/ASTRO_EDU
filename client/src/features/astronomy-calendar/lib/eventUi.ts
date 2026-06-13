import type { AstronomyCalendarEvent, CalendarFilterChip } from '../types'

export function formatEventWhen(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Đang diễn ra'
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  if (days > 0) return `${days} ngày ${hours} giờ`
  const mins = Math.floor((ms % 3600000) / 60000)
  return `${hours} giờ ${mins} phút`
}

export function eventTypeLabel(type: AstronomyCalendarEvent['type']): string {
  switch (type) {
    case 'moon_phase':
      return 'Pha trăng'
    case 'meteor_shower':
      return 'Mưa sao băng'
    case 'lunar_eclipse':
      return 'Nguyệt thực'
    case 'solar_eclipse':
      return 'Nhật thực'
    case 'planet_highlight':
      return 'Hành tinh'
    default:
      return 'Sự kiện'
  }
}

export function eventKindLabel(kind: AstronomyCalendarEvent['eventKind']): string {
  return kind === 'educational' ? 'Giáo dục' : 'Quan sát'
}

/** Giải thích vì sao nút check-in gem chưa hiện / không có. */
export function checkInHintVi(event: AstronomyCalendarEvent): string | null {
  const kind = event.eventKind || 'observable'
  if (kind !== 'observable') {
    return 'Sự kiện giáo dục — không có check-in gem. Mở bài học để tìm hiểu.'
  }
  if (event.isLive) return null
  if (event.engagement?.checkedIn || event.engagement?.gemAwarded) return null

  const now = Date.now()
  const endMs = event.endAt ? new Date(event.endAt).getTime() : NaN
  if (Number.isFinite(endMs) && endMs < now) {
    return 'Sự kiện đã kết thúc — không thể check-in gem.'
  }

  const start = formatEventWhen(event.startAt)
  const end = formatEventWhen(event.endAt)
  if (start && end) {
    return `Check-in gem + thành tích ảnh mở từ ${start} đến ${end}`
  }
  return 'Check-in gem + thành tích ảnh mở trong khung thời gian sự kiện'
}

export function difficultyLabel(d: AstronomyCalendarEvent['difficulty']): string | null {
  switch (d) {
    case 'beginner':
      return 'Người mới'
    case 'intermediate':
      return 'Trung cấp'
    case 'advanced':
      return 'Nâng cao'
    default:
      return null
  }
}

export function eventPeakDate(event: { peakAt: string | null; startAt: string }): Date | null {
  const raw = event.peakAt || event.startAt
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function shortEventLabel(title: string, maxLen = 18): string {
  const t = title.trim()
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen - 1)}…`
}

export function eventTimeShort(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function filterEvents(
  events: AstronomyCalendarEvent[],
  chip: CalendarFilterChip,
): AstronomyCalendarEvent[] {
  if (chip === 'all') return events
  if (chip === 'observable') return events.filter((e) => (e.eventKind || 'observable') === 'observable')
  if (chip === 'educational') return events.filter((e) => e.eventKind === 'educational')
  if (chip === 'eclipse') {
    return events.filter((e) => e.type === 'lunar_eclipse' || e.type === 'solar_eclipse')
  }
  return events.filter((e) => e.type === chip)
}

export const CALENDAR_FILTER_CHIPS: Array<{ id: CalendarFilterChip; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'observable', label: 'Quan sát' },
  { id: 'educational', label: 'Giáo dục' },
  { id: 'meteor_shower', label: 'Mưa sao băng' },
  { id: 'moon_phase', label: 'Pha trăng' },
  { id: 'eclipse', label: 'Nhật / Nguyệt thực' },
]
