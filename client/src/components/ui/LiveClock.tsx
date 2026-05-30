'use client'

import { useLiveClock } from '@/hooks/useLiveClock'

type LiveClockProps = {
  className?: string
  style?: React.CSSProperties
  /** Hiển thị IANA (Asia/Ho_Chi_Minh) thay vì GMT+7 */
  showTimeZoneId?: boolean
}

/**
 * Đồng hồ theo giờ địa phương người dùng (tự detect qua trình duyệt).
 */
export function LiveClock({ className, style, showTimeZoneId = false }: LiveClockProps) {
  const { time, zoneLabel, timeZone } = useLiveClock()
  const label = showTimeZoneId && timeZone ? timeZone : zoneLabel
  return (
    <span className={className} style={style}>
      {label} {time}
    </span>
  )
}
