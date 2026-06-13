export type AstronomyEventType =

  | 'moon_phase'

  | 'meteor_shower'

  | 'lunar_eclipse'

  | 'solar_eclipse'

  | 'planet_highlight'



export type AstronomyEventKind = 'observable' | 'educational'



export type AstronomyEventDifficulty = 'beginner' | 'intermediate' | 'advanced'



export type AstronomyEventSource =

  | 'computed:astronomy-engine'

  | 'catalog:iau-meteors'

  | 'editorial'

  | string



export type AstronomyEventEngagement = {

  reminded: boolean

  checkedIn: boolean

  gemAwarded: boolean

  gemAmount: number

  observationPhotoUrl?: string | null

  checkedInAt?: string | null

}



export type AstronomyEventContent = {

  typeLabelVi: string

  subtitleVi: string

  subtitleEn: string

  descriptionVi: string

  observationTipsVi: string

  visibilityLabelVi: string

  legendLabelVi?: string

  legendGroup?: 'moon' | 'meteor' | 'eclipse' | 'planet' | 'conjunction'

  accentColor?: string | null

  iconKey?: string | null

}



export type AstronomyCalendarEvent = {

  id: string

  type: AstronomyEventType

  eventKind?: AstronomyEventKind

  source: AstronomyEventSource

  titleVi: string

  summaryVi: string

  startAt: string

  endAt: string

  peakAt: string | null

  isLive: boolean

  exploreView: 'sky' | 'solar' | null

  exploreTarget: string | null

  exploreHref: string

  lessonHref?: string | null

  quizHref?: string | null

  ctaLabelVi?: string

  difficulty?: AstronomyEventDifficulty | null

  moonPhaseHint?: string | null

  featured?: boolean

  priority: number

  content?: AstronomyEventContent

  engagement?: AstronomyEventEngagement

}



export type SkyWeatherSnapshot = {

  cloudCoverPct: number

  isDay: boolean

  weatherCode: number

  precipitationMm: number

  windSpeedKmh: number

  labelVi: string

  fetchedAt: string

  source: string

}



export type AstronomyObserverInfo = {

  lat: number

  lon: number

  tzOffsetMinutes: number

  presetId: string

  labelVi: string

}



export type AstronomyCalendarResponse = {

  generatedAt: string

  source?: string

  observer: AstronomyObserverInfo

  presets: Array<AstronomyObserverInfo & { id: string }>

  live: AstronomyCalendarEvent[]

  upcoming: AstronomyCalendarEvent[]

  events: AstronomyCalendarEvent[]

}



export type AstronomyMonthDayMap = Record<string, AstronomyCalendarEvent[]>



export type AstronomyMoonPhaseStripItem = {

  date: string

  titleVi: string

  eventId: string

}



export type AstronomyMonthResponse = {

  year: number

  month: number

  observer: Pick<AstronomyObserverInfo, 'lat' | 'lon' | 'presetId' | 'labelVi'>

  days: AstronomyMonthDayMap

  moonPhases: AstronomyMoonPhaseStripItem[]

  events: AstronomyCalendarEvent[]

}



export type AstronomyFeaturedUrgency = {
  event: AstronomyCalendarEvent
  countdownMs: number
  daysUntil?: number
  labelVi: string
  urgencyTagVi?: string
  isWithinUrgentWindow?: boolean
  gemCheckInAmount?: number | null
}

export type AstronomyFeaturedResponse = {
  urgency: AstronomyFeaturedUrgency | null
  secondaryUrgency?: AstronomyFeaturedUrgency | null
  nextEclipse: AstronomyCalendarEvent | null
  featured: AstronomyCalendarEvent[]
  observer: AstronomyObserverInfo
  gemCheckInAmount?: number
}



export type AstronomyEventAdmin = {

  id: string

  eventId: string

  computeId: string | null

  status: 'draft' | 'review' | 'published' | 'archived'

  eventKind: AstronomyEventKind

  type: AstronomyEventType

  source: string

  titleVi: string

  summaryVi: string

  subtitleVi: string

  subtitleEn: string

  descriptionVi: string

  observationTipsVi: string

  visibilityLabelVi: string

  typeLabelVi: string

  startAt: string

  endAt: string

  peakAt: string | null

  exploreView: 'sky' | 'solar' | null

  exploreTarget: string | null

  lessonHref: string | null

  quizHref: string | null

  difficulty: AstronomyEventDifficulty | null

  moonPhaseHint: string | null

  priority: number

  featured: boolean

  urgencyRank: number

  gemRewardOverride: number | null

  authoredBy: string | null

  publishedBy: string | null

  publishedAt: string | null

  reviewNote: string

}



export type CalendarFilterChip =

  | 'all'

  | 'observable'

  | 'educational'

  | 'meteor_shower'

  | 'moon_phase'

  | 'eclipse'



export type AstronomyEventTypeKit = {

  type: AstronomyEventType

  typeLabelVi: string

  legendLabelVi: string

  legendGroup: 'moon' | 'meteor' | 'eclipse' | 'planet' | 'conjunction'

  accentColor: string | null

  iconKey: string

  defaultVisibilityLabelVi: string

  defaultObservationTipsVi: string

  descriptionHintVi: string

  updatedAt?: string

}