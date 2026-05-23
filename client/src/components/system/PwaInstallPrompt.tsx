'use client'

import { useEffect, useMemo, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ua = window.navigator.userAgent.toLowerCase()
    setIsIOS(/iphone|ipad|ipod/.test(ua))
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () =>
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  const showPrompt = useMemo(() => {
    if (dismissed || isStandalone) return false
    if (installEvent) return true
    if (isIOS) return true
    return false
  }, [dismissed, installEvent, isStandalone, isIOS])

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,28rem)] rounded-xl border border-cyan-500/30 bg-[#0a0f17]/95 p-3 shadow-xl backdrop-blur">
      <p className="text-sm text-gray-100">Install Cosmo Learn for a full-screen app experience.</p>
      {!installEvent && isIOS && (
        <p className="mt-1 text-xs text-gray-400">
          On iPhone/iPad: tap <span className="text-gray-200">Share</span> then{' '}
          <span className="text-gray-200">Add to Home Screen</span>.
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        {installEvent && (
          <button
            type="button"
            onClick={async () => {
              if (!installEvent) return
              await installEvent.prompt()
              await installEvent.userChoice
              setInstallEvent(null)
            }}
            className="min-h-10 px-3 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-500"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="min-h-10 px-3 rounded-lg bg-white/10 text-gray-300 text-sm hover:bg-white/15"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
