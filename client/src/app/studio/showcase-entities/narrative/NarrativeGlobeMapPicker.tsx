'use client'

import { useCallback } from 'react'

type Coords = { lat: number; lng: number }

type Props = {
  textureUrl: string
  bodyLabel: string
  value: Coords
  onChange: (coords: Coords) => void
}

function coordsFromClick(e: React.MouseEvent<HTMLImageElement>): Coords {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width
  const y = (e.clientY - rect.top) / rect.height
  const lng = x * 360 - 180
  const lat = 90 - y * 180
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  }
}

/** Click trên bản đồ equirectangular — texture trùng globe Explore / showcase 3D. */
export function NarrativeGlobeMapPicker({ textureUrl, bodyLabel, value, onChange }: Props) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      onChange(coordsFromClick(e))
    },
    [onChange],
  )

  const markerX = ((value.lng + 180) / 360) * 100
  const markerY = ((90 - value.lat) / 180) * 100

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-slate-300">Chọn trên bản đồ (equirectangular)</p>
      <p className="text-[10px] text-ds-subtle">
        Click để đặt ghim trên {bodyLabel} — lat/lng tự điền bên trên. Cùng texture albedo như globe 3D.
      </p>
      <div className="relative overflow-hidden rounded-lg border border-ds-border bg-black/40">
        <img
          src={textureUrl}
          alt={`Bản đồ ${bodyLabel}`}
          className="block w-full aspect-[2/1] min-h-[140px] object-cover cursor-crosshair select-none bg-[#1a0a08]"
          draggable={false}
          onClick={handleClick}
        />
        <span
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${markerX}%`, top: `${markerY}%` }}
          aria-hidden
        >
          <span className="block h-3 w-3 rounded-full border-2 border-amber-200 bg-amber-400 shadow-[0_0_0_3px_rgba(0,0,0,0.45),0_0_12px_rgba(251,191,36,0.85)]" />
          <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-100" />
        </span>
      </div>
    </div>
  )
}
