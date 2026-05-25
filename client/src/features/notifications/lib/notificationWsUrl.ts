import { getToken } from '@/features/auth/public'
import { getUnifiedBase } from '@/lib/apiConfig'

export function getNotificationWsUrl(): string {
  if (typeof window === 'undefined') return ''
  const token = getToken()
  if (!token) return ''

  const httpBase = getUnifiedBase()
  if (!httpBase) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}/ws/notifications?token=${encodeURIComponent(token)}`
  }

  const wsBase = httpBase.startsWith('https://')
    ? `wss://${httpBase.slice('https://'.length)}`
    : httpBase.startsWith('http://')
      ? `ws://${httpBase.slice('http://'.length)}`
      : httpBase
  return `${wsBase}/ws/notifications?token=${encodeURIComponent(token)}`
}
