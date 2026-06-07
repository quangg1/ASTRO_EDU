'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useToast } from '@/design-system'
import type { ShowcaseGamificationStrip } from '@/components/3d/showcase/ShowcaseEntityPanel'
import { syncGemWallet } from '@/features/rewards/public'

export function useExploreRewards(userId: string | undefined) {
  const toast = useToast()
  const [gemBalance, setGemBalance] = useState(0)

  useEffect(() => {
    if (!userId) {
      setGemBalance(0)
      return
    }
    void syncGemWallet(userId).then((w) => setGemBalance(w.balance))
  }, [userId])

  useEffect(() => {
    const onRewards = (ev: Event) => {
      const ce = ev as CustomEvent<{ gemsEarned?: number; labels?: string[] }>
      const d = ce.detail
      if (!d?.gemsEarned) return
      const tail = Array.isArray(d.labels) && d.labels.length ? ` (${d.labels.join(' · ')})` : ''
      toast.show(`+${d.gemsEarned} gem${tail}`, { tone: 'success' })
      void syncGemWallet(userId).then((w) => setGemBalance(w.balance))
    }
    window.addEventListener('learning-path-rewards', onRewards as EventListener)
    return () => window.removeEventListener('learning-path-rewards', onRewards as EventListener)
  }, [userId, toast])

  const gamificationStrip = useMemo((): ShowcaseGamificationStrip | null => {
    if (!userId) return null
    return { gemBalance }
  }, [userId, gemBalance])

  const refreshGemBalance = useCallback(() => {
    if (!userId) return
    void syncGemWallet(userId).then((w) => setGemBalance(w.balance))
  }, [userId])

  return { gemBalance, gamificationStrip, refreshGemBalance }
}
