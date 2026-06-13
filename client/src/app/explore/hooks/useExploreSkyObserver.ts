'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  parseSkyObserverFromSearchParams,
  formatObserverLocationShort,
  isObserverTimePinned,
  resolveSkyTimePreset,
  type SkyObserver,
  type SkyTimePreset,
} from '@/features/explore/lib/skyObserver'
import { computeSkyEphemerisBodies, observerTimeLabel } from '@/features/explore/lib/skyEphemeris'

type GeoState =
  | { status: 'pending' }
  | { status: 'ok'; latDeg: number; lonDeg: number }
  | { status: 'denied' }

function hasUrlLatLon(
  params: URLSearchParams | { get: (k: string) => string | null },
): boolean {
  const latRaw = params.get('lat')
  const lonRaw = params.get('lon')
  if (latRaw == null || lonRaw == null) return false
  const lat = Number(latRaw)
  const lon = Number(lonRaw)
  return Number.isFinite(lat) && Number.isFinite(lon)
}

export function useExploreSkyObserver(
  searchParams: URLSearchParams | { get: (k: string) => string | null },
) {
  const urlHasLatLon = hasUrlLatLon(searchParams)

  const [geo, setGeo] = useState<GeoState>(() =>
    urlHasLatLon ? { status: 'denied' } : { status: 'pending' },
  )

  useEffect(() => {
    if (urlHasLatLon) return
    if (!navigator.geolocation) {
      setGeo({ status: 'denied' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          status: 'ok',
          latDeg: pos.coords.latitude,
          lonDeg: pos.coords.longitude,
        })
      },
      () => setGeo({ status: 'denied' }),
      { maximumAge: 300_000, timeout: 12_000 },
    )
  }, [urlHasLatLon])

  const timePinned = useMemo(
    () => isObserverTimePinned(searchParams),
    [searchParams.get('time')],
  )

  const [liveNow, setLiveNow] = useState(() => new Date())

  useEffect(() => {
    if (timePinned) return
    const tick = () => setLiveNow(new Date())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timePinned])

  const observer = useMemo((): SkyObserver => {
    const base = parseSkyObserverFromSearchParams(searchParams)
    const latDeg =
      urlHasLatLon ? base.latDeg : geo.status === 'ok' ? geo.latDeg : base.latDeg
    const lonDeg =
      urlHasLatLon ? base.lonDeg : geo.status === 'ok' ? geo.lonDeg : base.lonDeg
    const at = timePinned ? base.at : liveNow
    return { ...base, latDeg, lonDeg, at }
  }, [
    searchParams,
    searchParams.get('lat'),
    searchParams.get('lon'),
    searchParams.get('pollution'),
    searchParams.get('bortle'),
    urlHasLatLon,
    geo,
    timePinned,
    liveNow.getTime(),
  ])

  /** Sẵn sàng ghi URL — đã có lat/lon trên URL hoặc geolocation xong (ok / bị từ chối). */
  const observerResolved = urlHasLatLon || geo.status !== 'pending'

  const locationLabel = useMemo(() => formatObserverLocationShort(observer), [observer])
  const timeLabels = useMemo(() => observerTimeLabel(observer), [observer])
  const ephemerisBodies = useMemo(
    () => computeSkyEphemerisBodies(observer.at),
    [observer.at.getTime()],
  )

  const skyTimePreset = useMemo(
    (): SkyTimePreset => resolveSkyTimePreset(searchParams),
    [searchParams.get('time')],
  )

  return { observer, locationLabel, timeLabels, ephemerisBodies, observerResolved, timePinned, skyTimePreset }
}

export type { SkyObserver }
