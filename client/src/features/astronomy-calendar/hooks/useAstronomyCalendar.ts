'use client'



import { useEffect, useState } from 'react'

import {

  fetchAstronomyFeatured,

  fetchAstronomyMonthCalendar,

  fetchTonightSkyCalendar,

  fetchUpcomingAstronomyCalendar,

  type AstronomyCalendarQuery,

} from '../api/astronomyCalendarApi'

import type { AstronomyCalendarResponse, AstronomyFeaturedResponse, AstronomyMonthResponse } from '../types'



export function useTonightAstronomyCalendar(query: AstronomyCalendarQuery = {}) {

  const [data, setData] = useState<AstronomyCalendarResponse | null>(null)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState(false)



  const lat = query.lat

  const lon = query.lon

  const tz = query.tzOffsetMinutes

  const preset = query.preset



  useEffect(() => {

    let cancelled = false

    setLoading(true)

    setError(false)

    void fetchTonightSkyCalendar({ lat, lon, tzOffsetMinutes: tz, preset }).then((res) => {

      if (cancelled) return

      setData(res)

      setError(!res)

      setLoading(false)

    })

    return () => {

      cancelled = true

    }

  }, [lat, lon, tz, preset])



  return { data, loading, error }

}



export function useUpcomingAstronomyCalendar(query: AstronomyCalendarQuery = {}, enabled = true) {

  const [data, setData] = useState<AstronomyCalendarResponse | null>(null)

  const [loading, setLoading] = useState(enabled)



  const lat = query.lat

  const lon = query.lon

  const tz = query.tzOffsetMinutes

  const preset = query.preset

  const days = query.days



  useEffect(() => {

    if (!enabled) {

      setLoading(false)

      return

    }

    let cancelled = false

    setLoading(true)

    void fetchUpcomingAstronomyCalendar({ lat, lon, tzOffsetMinutes: tz, preset, days }).then((res) => {

      if (cancelled) return

      setData(res)

      setLoading(false)

    })

    return () => {

      cancelled = true

    }

  }, [lat, lon, tz, preset, days, enabled])



  return { data, loading }

}



export function useAstronomyMonthCalendar(query: AstronomyCalendarQuery = {}) {

  const [data, setData] = useState<AstronomyMonthResponse | null>(null)

  const [loading, setLoading] = useState(true)

  const year = query.year

  const month = query.month

  const preset = query.preset



  useEffect(() => {

    let cancelled = false

    setLoading(true)

    void fetchAstronomyMonthCalendar({ year, month, preset }).then((res) => {

      if (cancelled) return

      setData(res)

      setLoading(false)

    })

    return () => {

      cancelled = true

    }

  }, [year, month, preset])



  return { data, loading }

}



export function useAstronomyFeatured(query: AstronomyCalendarQuery = {}) {

  const [data, setData] = useState<AstronomyFeaturedResponse | null>(null)

  const [loading, setLoading] = useState(true)

  const preset = query.preset



  useEffect(() => {

    let cancelled = false

    setLoading(true)

    void fetchAstronomyFeatured({ preset }).then((res) => {

      if (cancelled) return

      setData(res)

      setLoading(false)

    })

    return () => {

      cancelled = true

    }

  }, [preset])



  return { data, loading }

}

