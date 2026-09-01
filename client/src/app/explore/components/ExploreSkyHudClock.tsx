'use client'

import { useEffect, useState } from 'react'
import { observerTimeLabel, type SkyObserver, type SkyTimePreset } from '@/features/explore/public'

const PLACEHOLDER = { time: '--:--:--', date: '\u00a0' }

const PRESETS: ReadonlyArray<{
  id: SkyTimePreset
  label: string
  title: string
}> = [
  { id: 'live', label: 'Bây giờ', title: 'Giờ thực — đồng hồ chạy theo giây' },
  { id: 'morning', label: 'Sáng', title: 'Khoảng 6:00 — bình minh, Mặt Trời mọc' },
  { id: 'afternoon', label: 'Chiều', title: 'Khoảng 14:00 — ban ngày' },
  { id: 'evening', label: 'Tối', title: 'Khoảng 21:00 — bầu trời đêm, sao' },
]

type Props = {
  observer: SkyObserver
  skyTimePreset: SkyTimePreset
  onSelectPreset: (preset: SkyTimePreset) => void
}

/** Đồng hồ HUD + chọn buổi quan sát — render sau mount để tránh lệch SSR/client. */
export function ExploreSkyHudClock({ observer, skyTimePreset, onSelectPreset }: Props) {
  const [labels, setLabels] = useState(PLACEHOLDER)

  useEffect(() => {
    setLabels(observerTimeLabel(observer))
  }, [observer.latDeg, observer.lonDeg, observer.at.getTime()])

  return (
    <div className="flex min-w-[9.5rem] flex-col items-stretch gap-1.5">
      <div className="text-right leading-tight">
        <span className="text-[11px] tabular-nums text-slate-100">{labels.time}</span>
        <span className="mt-0.5 block text-[10px] text-slate-400">{labels.date}</span>
      </div>

      <div
        className="grid grid-cols-4 gap-px rounded-lg bg-white/[0.06] p-px"
        role="group"
        aria-label="Chọn thời điểm quan sát"
      >
        {PRESETS.map(({ id, label, title }) => {
          const active = skyTimePreset === id
          return (
            <button
              key={id}
              type="button"
              title={title}
              aria-pressed={active}
              onClick={() => onSelectPreset(id)}
              className={`rounded-[5px] px-0.5 py-1 text-[9px] font-medium leading-none transition ${
                active
                  ? 'bg-slate-100/12 text-slate-50 shadow-sm ring-1 ring-white/10'
                  : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
