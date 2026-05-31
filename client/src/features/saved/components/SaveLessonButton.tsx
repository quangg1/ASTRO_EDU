'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useSavedItems } from '@/features/saved/hooks/useSavedItems'
import {
  savedItemKeyForCourse,
  savedItemKeyForLp,
  type ToggleSavedPayload,
} from '@/features/saved/api/savedApi'

type Props = ToggleSavedPayload & {
  className?: string
  variant?: 'pill' | 'icon'
}

export function SaveLessonButton({ className = '', variant = 'pill', ...payload }: Props) {
  const router = useRouter()
  const { toggle, isSaved, loggedIn } = useSavedItems()
  const [busy, setBusy] = useState(false)

  const itemKey =
    payload.source === 'learning-path'
      ? savedItemKeyForLp(payload.lessonId)
      : savedItemKeyForCourse(payload.courseSlug, payload.lessonSlug)
  const saved = isSaved(itemKey)

  const handleClick = async () => {
    if (!loggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    setBusy(true)
    try {
      await toggle(payload)
    } finally {
      setBusy(false)
    }
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-pressed={saved}
        aria-label={saved ? 'Bỏ yêu thích' : 'Yêu thích'}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${className}`}
        style={{
          borderColor: saved ? 'rgba(244,114,182,0.45)' : 'rgba(255,255,255,0.12)',
          background: saved ? 'rgba(244,114,182,0.12)' : 'rgba(255,255,255,0.04)',
          color: saved ? '#fda4af' : '#9aa8c4',
        }}
      >
        <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={saved}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${className}`}
      style={{
        borderColor: saved ? 'rgba(244,114,182,0.4)' : 'rgba(255,255,255,0.12)',
        background: saved ? 'rgba(244,114,182,0.1)' : 'rgba(255,255,255,0.04)',
        color: saved ? '#fecdd3' : '#c8d3e8',
      }}
    >
      <Heart size={14} fill={saved ? 'currentColor' : 'none'} />
      {saved ? 'Đã lưu' : 'Yêu thích'}
    </button>
  )
}
