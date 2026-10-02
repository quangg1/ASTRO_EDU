'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Khung cho cảnh 3D nhúng giữa trang cuộn (bài học, preview).
 * OrbitControls nghe `wheel` trên canvas và preventDefault → lăn chuột qua cảnh
 * sẽ phóng to/thu nhỏ thay vì cuộn trang. Khung này chặn `wheel` ở pha capture
 * khi không giữ Ctrl/⌘, để trang cuộn bình thường; Ctrl/⌘ + lăn (và pinch trên
 * touchpad, vốn gửi wheel kèm ctrlKey) vẫn zoom cảnh.
 */
export function ScrollFriendlySceneFrame({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [hint, setHint] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const onWheel = (ev: WheelEvent) => {
      if (ev.ctrlKey || ev.metaKey) {
        setHint(false)
        return
      }
      ev.stopPropagation()
      setHint(true)
      clearTimeout(timer)
      timer = setTimeout(() => setHint(false), 1200)
    }
    el.addEventListener('wheel', onWheel, { capture: true, passive: true })
    return () => {
      clearTimeout(timer)
      el.removeEventListener('wheel', onWheel, { capture: true })
    }
  }, [])

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      {children}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-3 flex justify-center transition-opacity duration-300 ${hint ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden
      >
        <span className="rounded-full bg-black/70 px-3 py-1 text-xs text-white">
          Giữ Ctrl (⌘) + lăn chuột để phóng to/thu nhỏ
        </span>
      </div>
    </div>
  )
}
