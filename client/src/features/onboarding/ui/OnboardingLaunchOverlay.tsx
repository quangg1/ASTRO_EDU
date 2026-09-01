'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OnboardingIntentId } from '@/features/onboarding/public'
import { ONBOARDING_LAUNCH_LINES } from '@/lib/onboardingLanding'
import { APP_DISPLAY_NAME } from '@/lib/appBrand'

type Props = {
  intent: OnboardingIntentId
  gemsEarned: number
  apiReady: boolean
  onComplete: () => void
}

/** Warp lines — thay video launch (tránh viền trắng / object-cover tràn). */
function LaunchWarpBackdrop() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 50% 42%, rgba(6, 182, 212, 0.12) 0%, transparent 62%),
            radial-gradient(ellipse 45% 35% at 18% 78%, rgba(244, 205, 118, 0.08) 0%, transparent 55%),
            #02040a
          `,
        }}
      />
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

const MIN_WARP_MS = 3200
const MAX_WARP_MS = 9000

export function OnboardingLaunchOverlay({ intent, gemsEarned, apiReady, onComplete }: Props) {
  const finishedRef = useRef(false)
  const warpDoneRef = useRef(false)
  const lines = ONBOARDING_LAUNCH_LINES[intent]?.loading ?? ['Đang chuẩn bị tọa độ…']
  const doneLine = ONBOARDING_LAUNCH_LINES[intent]?.done ?? 'Đáp xuống an toàn!'
  const [lineIndex, setLineIndex] = useState(0)
  const [phase, setPhase] = useState<'warp' | 'done'>('warp')

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
    if (!warpDoneRef.current || !apiReady) return
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

  useEffect(() => {
    const minTimer = setTimeout(() => {
      warpDoneRef.current = true
      maybeFinishSequence()
    }, MIN_WARP_MS)
    const maxTimer = setTimeout(() => {
      warpDoneRef.current = true
      maybeFinishSequence()
    }, MAX_WARP_MS)
    return () => {
      clearTimeout(minTimer)
      clearTimeout(maxTimer)
    }
  }, [maybeFinishSequence])

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-[#02040a]"
      role="dialog"
      aria-live="polite"
      aria-label="Đang khởi hành"
    >
      <LaunchWarpBackdrop />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(3,6,15,0.92) 0%, rgba(3,6,15,0.35) 45%, rgba(3,6,15,0.12) 100%)',
        }}
      />

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center text-center px-6 pb-10 sm:pb-14 pt-24">
        <p className="font-[JetBrains_Mono,monospace] text-[11px] uppercase tracking-[0.22em] text-ds-accent/80 mb-4">
          // {APP_DISPLAY_NAME.toLowerCase()} · khởi hành
        </p>

        <AnimatePresence mode="wait">
          {phase === 'warp' ? (
            <motion.p
              key={lineIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="font-[Space_Grotesk,sans-serif] text-xl sm:text-2xl text-ds-text max-w-md"
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
              <p className="font-[Space_Grotesk,sans-serif] text-xl sm:text-2xl text-ds-accent">{doneLine}</p>
              {gemsEarned > 0 ? (
                <p className="font-[JetBrains_Mono,monospace] text-sm text-ds-amber">
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
