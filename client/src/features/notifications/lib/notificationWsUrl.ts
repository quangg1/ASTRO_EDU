import { hasClientSession } from '@/features/auth/public'
import { getUnifiedBase } from '@/lib/apiConfig'

export function getNotificationWsUrl(): string {
  if (typeof window === 'undefined') return ''
  if (!hasClientSession()) return ''

  const httpBase = getUnifiedBase()

  if (!httpBase) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}/ws/notifications`
  }

  let hostPart = httpBase.startsWith('https://')
    ? httpBase.slice('https://'.length)
    : httpBase.startsWith('http://')
      ? httpBase.slice('http://'.length)
      : httpBase

  // Tránh ws://localhost → ::1 trên Windows (ECONNREFUSED).
  if (hostPart.startsWith('localhost:')) {
    hostPart = `127.0.0.1:${hostPart.split(':')[1] || '3002'}`
  }

  const wsBase = httpBase.startsWith('https://') ? `wss://${hostPart}` : `ws://${hostPart}`
  return `${wsBase}/ws/notifications`
}
