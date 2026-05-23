'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/features/auth/public'
import { fetchMyDecorationState } from '@/features/rewards/api/avatarDecorationApi'
import { DECORATION_UPDATED_EVENT } from '@/features/rewards/constants/avatarDecoration'

/** Overlay CDN đang đeo — dùng header / preview. */
export function useEquippedDecoration(): string | null {
  const user = useAuthStore((s) => s.user)
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) {
      setOverlayUrl(null)
      return
    }
    let cancelled = false
    const load = () => {
      fetchMyDecorationState()
        .then((d) => {
          if (!cancelled) setOverlayUrl(d.equippedOverlayUrl)
        })
        .catch(() => {
          if (!cancelled) setOverlayUrl(null)
        })
    }
    load()
    const onRefresh = () => load()
    window.addEventListener(DECORATION_UPDATED_EVENT, onRefresh)
    return () => {
      cancelled = true
      window.removeEventListener(DECORATION_UPDATED_EVENT, onRefresh)
    }
  }, [user?.id, user?.avatar])

  return overlayUrl
}
