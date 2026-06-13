import type { AstronomyCalendarEvent, AstronomyEventContent } from '../types'
import { eventTypeTheme } from '../components/calendarUiPrimitives'

const FALLBACK_CONTENT: Omit<AstronomyEventContent, 'typeLabelVi'> = {
  subtitleVi: '',
  subtitleEn: '',
  descriptionVi: '',
  observationTipsVi: '',
  visibilityLabelVi: 'Sự kiện thiên văn toàn cầu',
}

export function resolveEventContent(event: AstronomyCalendarEvent): AstronomyEventContent {
  const theme = eventTypeTheme(event.type)
  const base = event.content

  return {
    typeLabelVi: base?.typeLabelVi || 'Sự kiện',
    subtitleVi: base?.subtitleVi || event.summaryVi?.split(/[.!?\n]/)[0]?.trim() || '',
    subtitleEn: base?.subtitleEn || '',
    descriptionVi: base?.descriptionVi || event.summaryVi || '',
    observationTipsVi: base?.observationTipsVi || '',
    visibilityLabelVi: base?.visibilityLabelVi || FALLBACK_CONTENT.visibilityLabelVi,
    legendLabelVi: base?.legendLabelVi,
    legendGroup: base?.legendGroup,
    accentColor: base?.accentColor || theme.accent,
    iconKey: base?.iconKey || null,
  }
}

export function eventAccent(event: AstronomyCalendarEvent): string {
  return resolveEventContent(event).accentColor || eventTypeTheme(event.type).accent
}

export function formatEventDayLabel(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return `Ngày ${d.getDate()} Tháng ${d.getMonth() + 1}`
  } catch {
    return ''
  }
}

export function formatEventTimeIct(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return (
      new Date(iso).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      }) + ' ICT'
    )
  } catch {
    return ''
  }
}
