'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/features/auth/public'
import { getNotificationWsUrl } from '@/features/notifications/lib/notificationWsUrl'
import type { AppNotification } from '@/features/notifications/api/notificationsApi'

export type NotificationWsMessage =
  | { type: 'connected'; userId: string }
  | { type: 'notification'; notification: AppNotification; unreadDelta?: number }

const RECONNECT_MS = 4_000

/**
 * WebSocket `/ws/notifications` — push thông báo mới ngay khi server ghi DB.
 */
export function useNotificationRealtime(enabled = true) {
  const { user } = useAuthStore()
  const [connected, setConnected] = useState(false)
  const handlerRef = useRef<(msg: NotificationWsMessage) => void>(() => {})

  const onMessage = useCallback((handler: (msg: NotificationWsMessage) => void) => {
    handlerRef.current = handler
  }, [])

  useEffect(() => {
    if (!enabled || !user) {
      setConnected(false)
      return
    }

    let ws: WebSocket | null = null
    let disposed = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const connect = () => {
      const url = getNotificationWsUrl()
      if (!url || disposed) return
      ws = new WebSocket(url)

      ws.onopen = () => {
        if (!disposed) setConnected(true)
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as NotificationWsMessage
          handlerRef.current(msg)
          if (msg.type === 'notification') {
            window.dispatchEvent(
              new CustomEvent('galaxies-notification', { detail: msg.notification }),
            )
          }
        } catch {
          /* ignore malformed */
        }
      }

      ws.onclose = () => {
        setConnected(false)
        if (!disposed) {
          retryTimer = setTimeout(connect, RECONNECT_MS)
        }
      }

      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      disposed = true
      if (retryTimer) clearTimeout(retryTimer)
      ws?.close()
      setConnected(false)
    }
  }, [enabled, user?.id, user])

  return { connected, onMessage }
}
