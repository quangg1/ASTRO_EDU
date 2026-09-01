import { buildSessionContext } from '@/features/agent/public'
import type { SessionContext } from '@/features/agent/types'
import type { AstronomyCalendarEvent } from '../types'

type Params = {
  pathname: string
  selectedEvent: AstronomyCalendarEvent | null
  upcomingTitles?: string[]
}

export function buildCalendarAgentSessionContext(params: Params): SessionContext {
  const ev = params.selectedEvent
  return buildSessionContext({
    pathname: params.pathname,
    surface: 'calendar',
    routeLabel: 'Lịch Thiên Văn',
    calendarEventId: ev?.id ?? null,
    calendarEventTitle: ev?.titleVi ?? null,
    calendarEventType: ev?.type ?? null,
    calendarEventKind: ev?.eventKind ?? null,
    calendarEventSummary: ev?.summaryVi?.slice(0, 400) ?? null,
    calendarLessonHref: ev?.lessonHref ?? null,
    calendarExploreView: ev?.exploreView ?? null,
    calendarExploreTarget: ev?.exploreTarget ?? null,
    calendarUpcomingTitles: params.upcomingTitles?.slice(0, 5) ?? null,
    lessonId: ev?.lessonHref ? parseLessonIdFromHref(ev.lessonHref) ?? undefined : undefined,
    lessonTitle: ev?.lessonHref && ev?.titleVi ? `Bài liên kết: ${ev.titleVi}` : undefined,
  })
}

function parseLessonIdFromHref(href: string): string | null {
  const m = href.match(/\/tutorial\/[^/]+\/[^/]+\/([^/?#]+)/)
  return m ? decodeURIComponent(m[1]) : null
}
