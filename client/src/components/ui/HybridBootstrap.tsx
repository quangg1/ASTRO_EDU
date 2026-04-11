'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Network } from '@capacitor/network'
import { hydrateTokenToLocalStorage } from '@/lib/hybrid/mobileNative'

export function HybridBootstrap() {
  const router = useRouter()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    hydrateTokenToLocalStorage().catch(() => {})

    const appUrlListener = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      try {
        const parsed = new URL(url)
        const destination = `${parsed.pathname}${parsed.search}${parsed.hash}`
        if (destination && destination.startsWith('/')) {
          router.replace(destination)
        }
      } catch {
        // Ignore malformed URLs from external handlers
      }
    })

    const networkListener = Network.addListener('networkStatusChange', (status) => {
      if (typeof document === 'undefined') return
      document.body.dataset.networkStatus = status.connected ? 'online' : 'offline'
    })

    Network.getStatus().then((status) => {
      if (typeof document === 'undefined') return
      document.body.dataset.networkStatus = status.connected ? 'online' : 'offline'
    })

    return () => {
      appUrlListener.then((listener) => listener.remove())
      networkListener.then((listener) => listener.remove())
    }
  }, [router])

  return null
}
