'use client'

import { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/design-system'
import type { ShowcaseGamificationStrip } from '@/components/3d/showcase/ShowcaseEntityPanel'
import {
  fetchShowcaseGamificationCatalog,
  postShowcaseUnlock,
  syncGemWallet,
  type ShowcaseCatalogEntryWithUnlocks,
} from '@/features/rewards/public'

export function useExploreRewards(
  userId: string | undefined,
  showcaseActiveItemId: string,
) {
  const toast = useToast()
  const [gemBalance, setGemBalance] = useState(0)
  const [gamificationCatalog, setGamificationCatalog] = useState<{
    catalog: ShowcaseCatalogEntryWithUnlocks[]
  } | null>(null)

  useEffect(() => {
    if (!userId) {
      setGemBalance(0)
      setGamificationCatalog(null)
      return
    }
    void syncGemWallet(userId).then((w) => setGemBalance(w.balance))
    void fetchShowcaseGamificationCatalog().then((c) => setGamificationCatalog(c))
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
    if (!userId || !gamificationCatalog?.catalog?.length || !showcaseActiveItemId) return null
    const row = gamificationCatalog.catalog.find((r) => String(r.id) === String(showcaseActiveItemId))
    if (!row) return null
    return {
      gemBalance,
      storyUnlocked: !!row.storyUnlocked,
      orbitUnlocked: !!row.orbitUnlocked,
      storyCost: Number(row.storyCost ?? 40),
      orbitCost: Number(row.orbitCost ?? 55),
      onUnlock: async (t) => {
        const r = await postShowcaseUnlock(showcaseActiveItemId, t)
        if (r.ok) {
          if (typeof r.gemBalance === 'number') setGemBalance(r.gemBalance)
          const next = await fetchShowcaseGamificationCatalog()
          if (next) setGamificationCatalog(next)
          toast.show(t === 'story' ? 'Đã mở khóa story' : 'Đã mở orbit nâng cao', {
            tone: 'info',
          })
          window.dispatchEvent(new CustomEvent('gem-wallet-changed'))
        } else {
          toast.show(r.error || 'Không mở được', { tone: 'danger' })
        }
      },
    }
  }, [userId, gamificationCatalog, showcaseActiveItemId, gemBalance, toast])

  return { gemBalance, gamificationStrip }
}
