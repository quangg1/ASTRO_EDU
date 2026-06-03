'use client'

import { useMemo } from 'react'
import {
  parseSkyObserverFromSearchParams,
  formatObserverLocationShort,
  type SkyObserver,
} from '@/features/explore/lib/skyObserver'
import { computeSkyEphemerisBodies, observerTimeLabel } from '@/features/explore/lib/skyEphemeris'

export function useExploreSkyObserver(
  searchParams: URLSearchParams | { get: (k: string) => string | null },
) {
  const observer = useMemo(
    () => parseSkyObserverFromSearchParams(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- serialize URL fields
    [
      searchParams.get('lat'),
      searchParams.get('lon'),
      searchParams.get('time'),
      searchParams.get('pollution'),
      searchParams.get('bortle'),
    ],
  )

  const locationLabel = useMemo(() => formatObserverLocationShort(observer), [observer])
  const timeLabels = useMemo(() => observerTimeLabel(observer), [observer])
  const ephemerisBodies = useMemo(
    () => computeSkyEphemerisBodies(observer.at),
    [observer.at.getTime()],
  )

  return { observer, locationLabel, timeLabels, ephemerisBodies }
}

export type { SkyObserver }
