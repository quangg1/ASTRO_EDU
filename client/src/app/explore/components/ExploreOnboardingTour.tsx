'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

const STEPS = [
  { title: 'Xoay góc nhìn', body: 'Kéo chuột trái trên vùng 3D để xoay quanh thực thể đang chọn.' },
  { title: 'Zoom', body: 'Cuộn chuột để zoom — tiến gần bề mặt hoặc lùi ra toàn cảnh hệ Mặt Trời.' },
  { title: 'Chọn thực thể', body: 'Chạm hành tinh / mặt trăng trên bản đồ hoặc menu showcase để đổi focus.' },
]

type Props = {
  open: boolean
  onClose: () => void
}

export function ExploreOnboardingTour({ open, onClose }: Props) {
  const [step, setStep] = useState(0)
  if (!open) return null

  const current = STEPS[step]
  const isLast = step >= STEPS.length - 1

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[min(400px,calc(100vw-2rem))] p-5 pointer-events-auto"
      style={{
        background: 'rgba(6,9,26,0.94)',
        border: '1px solid rgba(126,231,255,0.35)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        clipPath:
          'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] font-[JetBrains_Mono,monospace] uppercase tracking-[0.18em] text-[#7ee7ff]">
          Explore 3D · {step + 1}/{STEPS.length}
        </p>
        <button type="button" onClick={onClose} className="text-[#5c6886] hover:text-white" aria-label="Đóng tour">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm font-medium text-white mb-1">{current.title}</p>
      <p className="text-xs text-[#9aa8c4] mb-4 leading-relaxed">{current.body}</p>
      <div className="flex justify-end">
        {!isLast ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="px-4 py-2 text-xs font-semibold text-[#031018] bg-[#7ee7ff]"
          >
            Tiếp
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#1a0e00] bg-[#f5a524]"
          >
            Khám phá tự do
          </button>
        )}
      </div>
    </div>
  )
}
