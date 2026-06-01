'use client'

import { useEffect } from 'react'
import type { DmMessage } from '@/features/messages/api/messagesApi'

export type DmRealtimeEvent = {
  conversationId: string
  message: DmMessage
}

/**
 * Lắng nghe tin nhắn mới qua WebSocket `/ws/notifications` (type: dm).
 * WS được mở bởi NotificationBell trên AppHeader — hook này chỉ subscribe event.
 */
export function useDmRealtime(
  enabled: boolean,
  onMessage: (ev: DmRealtimeEvent) => void,
) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<DmRealtimeEvent>).detail
      if (detail?.conversationId && detail?.message) onMessage(detail)
    }
    window.addEventListener('galaxies-dm', handler)
    return () => window.removeEventListener('galaxies-dm', handler)
  }, [enabled, onMessage])
}
