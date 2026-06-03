'use client'

import { useEffect, useState } from 'react'
import { observerTimeLabel } from '@/features/explore/lib/skyEphemeris'
import type { SkyObserver } from '@/features/explore/lib/skyObserver'

const PLACEHOLDER = { time: '--:--:--', date: '\u00a0' }

/** Đồng hồ HUD — chỉ render sau mount để tránh lệch SSR/client (giây khác nhau). */
export function ExploreSkyHudClock({ observer }: { observer: SkyObserver }) {
  const [labels, setLabels] = useState(PLACEHOLDER)

  useEffect(() => {
    setLabels(observerTimeLabel(observer))
  }, [observer.latDeg, observer.lonDeg, observer.at.getTime()])

  return (
    <>
      <span className="text-[11px] tabular-nums text-slate-100">{labels.time}</span>
      <span className="text-[10px] text-slate-400">{labels.date}</span>
    </>
  )
}
