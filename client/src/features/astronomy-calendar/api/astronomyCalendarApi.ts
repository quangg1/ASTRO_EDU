import { getApiPathBase } from '@/lib/apiConfig'

import { apiClientHeaders, apiFetchInit } from '@/lib/apiClientHeaders'

import type {

  AstronomyCalendarResponse,

  AstronomyFeaturedResponse,

  AstronomyMonthResponse,

  SkyWeatherSnapshot,

} from '../types'



const BASE = `${getApiPathBase()}/astronomy-calendar`



export type AstronomyCalendarQuery = {

  lat?: number

  lon?: number

  tzOffsetMinutes?: number

  preset?: 'default' | 'hanoi' | 'hcm' | 'danang'

  days?: number

  year?: number

  month?: number

  type?: string

  eventKind?: string

}



function toQuery(params: AstronomyCalendarQuery): string {

  const q = new URLSearchParams()

  if (params.preset) q.set('preset', params.preset)

  if (params.lat != null && Number.isFinite(params.lat)) q.set('lat', String(params.lat))

  if (params.lon != null && Number.isFinite(params.lon)) q.set('lon', String(params.lon))

  if (params.tzOffsetMinutes != null && Number.isFinite(params.tzOffsetMinutes)) {

    q.set('tzOffsetMinutes', String(params.tzOffsetMinutes))

  }

  if (params.days != null && Number.isFinite(params.days)) q.set('days', String(params.days))

  if (params.year != null && Number.isFinite(params.year)) q.set('year', String(params.year))

  if (params.month != null && Number.isFinite(params.month)) q.set('month', String(params.month))

  if (params.type) q.set('type', params.type)

  if (params.eventKind) q.set('eventKind', params.eventKind)

  const s = q.toString()

  return s ? `?${s}` : ''

}



function fetchInit(auth = false): RequestInit {

  return auth

    ? apiFetchInit({ headers: apiClientHeaders(), cache: 'no-store' })

    : { cache: 'no-store' as RequestCache }

}



async function fetchCalendar(

  path: 'tonight' | 'upcoming' | 'month' | 'featured',

  params: AstronomyCalendarQuery = {},

  auth = false,

): Promise<AstronomyCalendarResponse | AstronomyMonthResponse | AstronomyFeaturedResponse | null> {

  try {

    const res = await fetch(`${BASE}/${path}${toQuery(params)}`, fetchInit(auth))

    if (!res.ok) return null

    const json = (await res.json()) as { success?: boolean; data?: unknown }

    if (!json.success || !json.data) return null

    return json.data as AstronomyCalendarResponse | AstronomyMonthResponse | AstronomyFeaturedResponse

  } catch {

    return null

  }

}



export function fetchTonightSkyCalendar(

  params: Omit<AstronomyCalendarQuery, 'days'> = {},

): Promise<AstronomyCalendarResponse | null> {

  return fetchCalendar('tonight', params, true) as Promise<AstronomyCalendarResponse | null>

}



export function fetchUpcomingAstronomyCalendar(

  params: AstronomyCalendarQuery = {},

): Promise<AstronomyCalendarResponse | null> {

  return fetchCalendar('upcoming', { days: 90, ...params }, true) as Promise<AstronomyCalendarResponse | null>

}



export function fetchAstronomyMonthCalendar(

  params: AstronomyCalendarQuery = {},

): Promise<AstronomyMonthResponse | null> {

  return fetchCalendar('month', params, true) as Promise<AstronomyMonthResponse | null>

}



export function fetchAstronomyFeatured(

  params: Omit<AstronomyCalendarQuery, 'days' | 'year' | 'month'> = {},

): Promise<AstronomyFeaturedResponse | null> {

  return fetchCalendar('featured', params, true) as Promise<AstronomyFeaturedResponse | null>

}



export async function fetchSkyWeather(

  params: Pick<AstronomyCalendarQuery, 'lat' | 'lon' | 'preset'> = {},

): Promise<SkyWeatherSnapshot | null> {

  try {

    const res = await fetch(`${BASE}/weather${toQuery(params)}`, { cache: 'no-store' })

    if (!res.ok) return null

    const json = (await res.json()) as { success?: boolean; data?: SkyWeatherSnapshot }

    if (!json.success || !json.data) return null

    return json.data

  } catch {

    return null

  }

}



export async function remindAstronomyEvent(eventId: string): Promise<{ success: boolean; error?: string }> {

  const res = await fetch(

    `${BASE}/events/${encodeURIComponent(eventId)}/remind`,

    apiFetchInit({ method: 'POST', headers: apiClientHeaders() }),

  )

  const json = (await res.json()) as { success?: boolean; error?: string }

  return json.success ? { success: true } : { success: false, error: json.error || 'Không đặt được nhắc nhở' }

}



export async function checkInAstronomyEvent(

  eventId: string,

  options?: { photoUrl?: string },

): Promise<{

  success: boolean

  gemAmount?: number

  observationPhotoUrl?: string | null

  error?: string

}> {

  const res = await fetch(

    `${BASE}/events/${encodeURIComponent(eventId)}/check-in`,

    apiFetchInit({

      method: 'POST',

      headers: apiClientHeaders(),

      body: JSON.stringify(options?.photoUrl ? { photoUrl: options.photoUrl } : {}),

    }),

  )

  const json = (await res.json()) as {

    success?: boolean

    error?: string

    data?: { gemAmount?: number; observationPhotoUrl?: string | null }

  }

  if (json.success) {

    return {

      success: true,

      gemAmount: json.data?.gemAmount,

      observationPhotoUrl: json.data?.observationPhotoUrl ?? null,

    }

  }

  return { success: false, error: json.error || 'Check-in thất bại' }

}

