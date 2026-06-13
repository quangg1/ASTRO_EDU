'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { observerTimeLabel } from '@/features/explore/lib/skyEphemeris'
import type { SkyObserver } from '@/features/explore/lib/skyObserver'

const PLACEHOLDER = { time: '--:--:--', date: '\u00a0' }

type Props = {
  observer: SkyObserver
  timePinned: boolean
  onSetLive: () => void
  onSetTonight: () => void
}

/** Đồng hồ HUD — chỉ render sau mount để tránh lệch SSR/client (giây khác nhau). */
export function ExploreSkyHudClock({ observer, timePinned, onSetLive, onSetTonight }: Props) {
  const [labels, setLabels] = useState(PLACEHOLDER)

  useEffect(() => {
    setLabels(observerTimeLabel(observer))
  }, [observer.latDeg, observer.lonDeg, observer.at.getTime()])

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-col items-end leading-tight">
        <span className="text-[11px] tabular-nums text-slate-100">{labels.time}</span>
        <span className="text-[10px] text-slate-400">{labels.date}</span>
      </div>
      {timePinned ? (
        <button
          type="button"
          onClick={onSetLive}
          title="Xem bầu trời theo giờ thực"
          className="flex items-center gap-1 rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-medium text-sky-100 ring-1 ring-sky-400/25 transition hover:bg-sky-500/25"
        >
          <Sun className="h-2.5 w-2.5" />
          Bây giờ
        </button>
      ) : (
        <button
          type="button"
          onClick={onSetTonight}
          title="Xem bầu trời khoảng 21:00 tối nay (giờ địa phương)"
          className="flex items-center gap-1 rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-medium text-indigo-100 ring-1 ring-indigo-400/25 transition hover:bg-indigo-500/25"
        >
          <Moon className="h-2.5 w-2.5" />
          Tối nay (~21h)
        </button>
      )}
    </div>
  )
}
