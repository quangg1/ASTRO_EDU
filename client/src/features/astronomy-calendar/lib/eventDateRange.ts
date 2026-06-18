import type { AstronomyCalendarEvent } from '../types'

export function parseEventRange(event: { startAt: string; endAt: string }) {
  const start = new Date(event.startAt)
  const end = new Date(event.endAt)
  return { start, end }
}

/** Sự kiện có giao với tháng lịch (theo giờ máy người xem). */
export function eventOverlapsMonth(
  event: { startAt: string; endAt: string },
  year: number,
  month: number,
): boolean {
  const { start, end } = parseEventRange(event)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)
  return start.getTime() <= monthEnd.getTime() && end.getTime() >= monthStart.getTime()
}

/** Ngày đỉnh / bắt đầu — dùng sắp xếp, không dùng để ẩn sự kiện khỏi tháng. */
export function eventSortTime(event: { peakAt?: string | null; startAt: string }): number {
  const raw = event.peakAt || event.startAt
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
}
