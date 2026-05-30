'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OnboardingIntentId } from '@/features/onboarding/public'
import { ONBOARDING_LAUNCH_LINES } from '@/lib/onboardingLanding'
import {
  getOnboardingLaunchVideoLocalSrc,
  getOnboardingLaunchVideoSrc,
} from '@/lib/onboardingLaunchVideo'
import { APP_DISPLAY_NAME } from '@/lib/appBrand'

type Props = {
  intent: OnboardingIntentId
  gemsEarned: number
  apiReady: boolean
  onComplete: () => void
}

function WarpFallback() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 36 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-px w-[100px] origin-left"
          style={{
            left: '50%',
            top: '50%',
            background: 'linear-gradient(90deg, transparent, rgba(126,231,255,0.75), transparent)',
            rotate: `${(i / 36) * 360}deg`,
          }}
          animate={{ scaleX: [0.15, 2.2, 0.15], opacity: [0, 1, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.025, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export function OnboardingLaunchOverlay({ intent, gemsEarned, apiReady, onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const finishedRef = useRef(false)
  const videoEndedRef = useRef(false)
  const lines = ONBOARDING_LAUNCH_LINES[intent]?.loading ?? ['Đang chuẩn bị tọa độ…']
  const doneLine = ONBOARDING_LAUNCH_LINES[intent]?.done ?? 'Đáp xuống an toàn!'
  const [lineIndex, setLineIndex] = useState(0)
  const [phase, setPhase] = useState<'video' | 'done'>('video')
  const [videoMode, setVideoMode] = useState<'loading' | 'playing' | 'error'>('loading')
  const [videoSrc, setVideoSrc] = useState(() => getOnboardingLaunchVideoSrc())
  const localSrc = getOnboardingLaunchVideoLocalSrc()

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    onComplete()
  }, [onComplete])

  const goDone = useCallback(
    (delayMs: number) => {
      setPhase('done')
      setTimeout(finish, delayMs)
    },
    [finish],
  )

  const maybeFinishSequence = useCallback(() => {
    if (!videoEndedRef.current || !apiReady) return
    goDone(gemsEarned > 0 ? 1200 : 700)
  }, [apiReady, gemsEarned, goDone])

  useEffect(() => {
    maybeFinishSequence()
  }, [maybeFinishSequence])

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    lines.forEach((_, i) => {
      timers.push(setTimeout(() => setLineIndex(i), i * 600))
    })
    return () => timers.forEach(clearTimeout)
  }, [lines])

  useLayoutEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.load()
    void video.play().then(() => setVideoMode('playing')).catch(() => setVideoMode('error'))
  }, [videoSrc])

  const handleVideoError = useCallback(() => {
    if (videoSrc !== localSrc) {
      setVideoSrc(localSrc)
      setVideoMode('loading')
      return
    }
    setVideoMode('error')
  }, [videoSrc, localSrc])

  useEffect(() => {
    if (videoMode !== 'error') return
    const markEnded = () => {
      videoEndedRef.current = true
      maybeFinishSequence()
    }
    const t = setTimeout(markEnded, 4200)
    return () => clearTimeout(t)
  }, [videoMode, maybeFinishSequence])

  useEffect(() => {
    const fallback = setTimeout(() => {
      videoEndedRef.current = true
      maybeFinishSequence()
    }, 9000)
    return () => clearTimeout(fallback)
  }, [maybeFinishSequence])

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-black"
      role="dialog"
      aria-live="polite"
      aria-label="Đang khởi hành"
    >
      {videoMode !== 'error' ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={videoSrc}
          muted
          playsInline
          autoPlay
          preload="auto"
          onPlaying={() => setVideoMode('playing')}
          onEnded={() => {
            videoEndedRef.current = true
            maybeFinishSequence()
          }}
          onError={handleVideoError}
        />
      ) : (
        <WarpFallback />
      )}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(3,6,15,0.92) 0%, rgba(3,6,15,0.35) 45%, rgba(3,6,15,0.12) 100%)',
        }}
      />

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center text-center px-6 pb-10 sm:pb-14 pt-24">
        <p className="font-[JetBrains_Mono,monospace] text-[11px] uppercase tracking-[0.22em] text-[#7ee7ff]/80 mb-4">
          // {APP_DISPLAY_NAME.toLowerCase()} · khởi hành
        </p>

        <AnimatePresence mode="wait">
          {phase === 'video' ? (
            <motion.p
              key={lineIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="font-[Space_Grotesk,sans-serif] text-xl sm:text-2xl text-[#eaf6ff] max-w-md"
            >
              {lines[lineIndex]}
            </motion.p>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <p className="font-[Space_Grotesk,sans-serif] text-xl sm:text-2xl text-[#7ee7ff]">{doneLine}</p>
              {gemsEarned > 0 ? (
                <p className="font-[JetBrains_Mono,monospace] text-sm text-[#f5a524]">
                  +{gemsEarned} GEM · Đáp xuống an toàn!
                </p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
