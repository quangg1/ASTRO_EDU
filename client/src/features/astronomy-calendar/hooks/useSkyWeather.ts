'use client'

import { useEffect, useState } from 'react'
import { fetchSkyWeather } from '../api/astronomyCalendarApi'
import type { SkyWeatherSnapshot } from '../types'

type State = {
  data: SkyWeatherSnapshot | null
  loading: boolean
}

export function useSkyWeather(latDeg: number, lonDeg: number, enabled = true): State {
  const [state, setState] = useState<State>({ data: null, loading: enabled })

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false })
      return
    }
    if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) {
      setState({ data: null, loading: false })
      return
    }

    let cancelled = false
    setState((s) => ({ ...s, loading: true }))

    const load = () =>
      fetchSkyWeather({ lat: latDeg, lon: lonDeg }).then((data) => {
        if (cancelled) return
        setState({ data, loading: false })
      })

    void load()
    const failSafe = window.setTimeout(() => {
      if (!cancelled) setState((s) => (s.loading ? { data: s.data, loading: false } : s))
    }, 14_000)

    const refresh = window.setInterval(() => {
      void load()
    }, 15 * 60_000)

    return () => {
      cancelled = true
      window.clearInterval(failSafe)
      window.clearInterval(refresh)
    }
  }, [latDeg, lonDeg, enabled])

  return state
}
