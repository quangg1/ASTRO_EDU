'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchShowcaseGamificationCatalog,
  postShowcaseUnlock,
  syncGemWallet,
  type ShowcaseCatalogEntryWithUnlocks,
} from '@/features/rewards/public'
import {
  NASA_SHOWCASE_STORIES,
  entityNeedsOrbitUnlock,
  filterShowcaseOrbitsForUser,
  ORBIT_COST_GEM,
  resolveStoryUnlockEntityId,
  STORY_COST_GEM,
  type NasaStory,
  type ShowcaseOrbitEntity,
  type ShowcaseStoryCampaign,
  type ShowcaseUnlockFlags,
} from '@/features/content3d/showcase/public'

export type ShowcaseStoryViewModel = ShowcaseStoryCampaign & {
  unlockEntityId: string
  storyUnlocked: boolean
  storyCost: number
  hasWaypoints: boolean
}

function buildUnlockMap(catalog: ShowcaseCatalogEntryWithUnlocks[]): Map<string, ShowcaseUnlockFlags> {
  const map = new Map<string, ShowcaseUnlockFlags>()
  for (const row of catalog) {
    const id = String(row.id || '').trim()
    if (!id) continue
    map.set(id, {
      story: row.storyUnlocked === true,
      orbit: row.orbitUnlocked === true,
    })
  }
  return map
}

function toStoryViewModel(
  story: NasaStory,
  unlockMap: Map<string, ShowcaseUnlockFlags>,
): ShowcaseStoryViewModel {
  const unlockEntityId = resolveStoryUnlockEntityId(story)
  const unlocked = unlockMap.get(unlockEntityId)?.story === true
  return {
    ...story,
    unlockEntityId,
    storyUnlocked: unlocked,
    storyCost: unlocked ? 0 : STORY_COST_GEM,
    hasWaypoints: Array.isArray(story.waypoints) && story.waypoints.length > 0,
  }
}

export function useExploreShowcaseGamification(userId: string | undefined) {
  const [catalogRows, setCatalogRows] = useState<ShowcaseCatalogEntryWithUnlocks[]>([])
  const [loading, setLoading] = useState(false)
  const [unlockPending, setUnlockPending] = useState<'story' | 'orbit' | null>(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setCatalogRows([])
      return
    }
    setLoading(true)
    try {
      const data = await fetchShowcaseGamificationCatalog()
      setCatalogRows(data?.catalog ?? [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const unlockMap = useMemo(() => buildUnlockMap(catalogRows), [catalogRows])

  const storyViewModels = useMemo(
    () => NASA_SHOWCASE_STORIES.map((s) => toStoryViewModel(s, unlockMap)),
    [unlockMap],
  )

  const filterOrbits = useCallback(
    (entities: ShowcaseOrbitEntity[]) =>
      filterShowcaseOrbitsForUser(entities, unlockMap, Boolean(userId)),
    [unlockMap, userId],
  )

  const isOrbitUnlocked = useCallback(
    (entityId: string) => {
      if (!entityNeedsOrbitUnlock(entityId)) return true
      if (!userId) return true
      return unlockMap.get(entityId)?.orbit === true
    },
    [unlockMap, userId],
  )

  const unlockStory = useCallback(
    async (unlockEntityId: string): Promise<{ ok: boolean; error?: string }> => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập' }
      setUnlockPending('story')
      try {
        const res = await postShowcaseUnlock(unlockEntityId, 'story')
        if (res.ok) {
          await refresh()
          if (typeof res.gemBalance === 'number') {
            await syncGemWallet(userId)
          }
          return { ok: true }
        }
        return { ok: false, error: res.error || 'Unlock thất bại' }
      } finally {
        setUnlockPending(null)
      }
    },
    [userId, refresh],
  )

  const unlockOrbit = useCallback(
    async (entityId: string): Promise<{ ok: boolean; error?: string }> => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập' }
      setUnlockPending('orbit')
      try {
        const res = await postShowcaseUnlock(entityId, 'orbit')
        if (res.ok) {
          await refresh()
          if (typeof res.gemBalance === 'number') {
            await syncGemWallet(userId)
          }
          return { ok: true }
        }
        return { ok: false, error: res.error || 'Unlock thất bại' }
      } finally {
        setUnlockPending(null)
      }
    },
    [userId, refresh],
  )

  return {
    loading,
    unlockPending,
    unlockMap,
    storyViewModels,
    filterOrbits,
    isOrbitUnlocked,
    unlockStory,
    unlockOrbit,
    refreshGamification: refresh,
    orbitCost: ORBIT_COST_GEM,
    storyCost: STORY_COST_GEM,
  }
}
