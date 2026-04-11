'use client'

import { useEffect, useState } from 'react'

export function PwaStatusBadge() {
  const [online, setOnline] = useState(true)
  const [swReady, setSwReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    setOnline(window.navigator.onLine)
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        setSwReady(!!reg)
      })
    }

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return (
    <div
      data-pwa-badge
      className="fixed right-3 bottom-3 z-40 rounded-lg border border-white/10 bg-black/75 px-2.5 py-1.5 text-[11px] text-gray-300 backdrop-blur md:hidden"
    >
      <span className={online ? 'text-emerald-300' : 'text-amber-300'}>
        {online ? 'Online' : 'Offline'}
      </span>
      <span className="mx-1.5 text-gray-500">•</span>
      <span className={swReady ? 'text-cyan-300' : 'text-gray-500'}>
        {swReady ? 'Offline ready' : 'PWA pending'}
      </span>
    </div>
  )
}
