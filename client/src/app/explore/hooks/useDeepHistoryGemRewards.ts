'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/features/auth/public'
import { trackLearningPathBehavior } from '@/features/learning-path/public'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/public'

/** Khớp `DH_BEAT_DWELL_SEC_MIN` trên server — thời gian xem một beat trước khi thưởng. */
const DH_BEAT_DWELL_SEC = 30

/**
 * G2/G3 — emit LP behavior events cho Deep History earn (server: dh_beat_dwell, dh_site_opened).
 * Chỉ chạy khi user đăng nhập (batch API cần auth).
 */
export function useDeepHistoryGemRewards(enabled: boolean) {
  const { user } = useAuthStore()
  const userId = user?.id ?? null

  const entityId = usePlanetNarrativeStore((s) => s.entityId)
  const currentBeat = usePlanetNarrativeStore((s) => s.currentBeat)
  const selectedSiteId = usePlanetNarrativeStore((s) => s.selectedSiteId)

  const beatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rewardedBeatsRef = useRef<Set<string>>(new Set())
  const rewardedSitesRef = useRef<Set<string>>(new Set())
  const prevSiteRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !userId || !entityId) return

    rewardedBeatsRef.current = new Set()
    rewardedSitesRef.current = new Set()
    prevSiteRef.current = null
  }, [enabled, userId, entityId])

  useEffect(() => {
    if (!enabled || !userId || !entityId || !currentBeat?.id) return

    if (beatTimerRef.current) clearTimeout(beatTimerRef.current)

    const beatKey = `${entityId}::${currentBeat.id}`
    if (rewardedBeatsRef.current.has(beatKey)) return

    beatTimerRef.current = setTimeout(() => {
      if (rewardedBeatsRef.current.has(beatKey)) return
      rewardedBeatsRef.current.add(beatKey)
      trackLearningPathBehavior({
        eventName: 'deep_history_beat_dwell',
        durationSec: DH_BEAT_DWELL_SEC,
        metadata: {
          schemaVersion: 'deep_history_v1',
          entityId,
          beatId: currentBeat.id,
          dwellSec: DH_BEAT_DWELL_SEC,
        },
      })
    }, DH_BEAT_DWELL_SEC * 1000)

    return () => {
      if (beatTimerRef.current) clearTimeout(beatTimerRef.current)
    }
  }, [enabled, userId, entityId, currentBeat?.id])

  useEffect(() => {
    if (!enabled || !userId || !entityId) return
    const siteId = selectedSiteId?.trim() || ''
    if (!siteId || siteId === prevSiteRef.current) return
    prevSiteRef.current = siteId

    const siteKey = `${entityId}::${siteId}`
    if (rewardedSitesRef.current.has(siteKey)) return
    rewardedSitesRef.current.add(siteKey)

    trackLearningPathBehavior({
      eventName: 'deep_history_site_opened',
      metadata: {
        schemaVersion: 'deep_history_v1',
        entityId,
        siteId,
      },
    })
  }, [enabled, userId, entityId, selectedSiteId])
}
