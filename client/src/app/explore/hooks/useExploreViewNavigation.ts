'use client'

import { useCallback } from 'react'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import {
  buildExploreHref,
  isSkyOnlyTarget,
  mergeExplorePreservedParams,
  type ExploreView,
} from '@/features/explore/public'

type Args = {
  pathname: string
  router: AppRouterInstance
  searchParams: URLSearchParams
  setShowcaseActiveItemId: (id: string) => void
  setSkyActiveTargetId: (id: string) => void
  setSkySceneHighlightId: (id: string | null) => void
  setEarthHistoryOpen: (open: boolean) => void
  closePlanetHistory: () => void
}

export function useExploreViewNavigation({
  pathname,
  router,
  searchParams,
  setShowcaseActiveItemId,
  setSkyActiveTargetId,
  setSkySceneHighlightId,
  setEarthHistoryOpen,
  closePlanetHistory,
}: Args) {
  const replaceExploreUrl = useCallback(
    (href: string) => {
      router.replace(mergeExplorePreservedParams(href, searchParams), { scroll: false })
    },
    [router, searchParams],
  )

  const navigateExploreView = useCallback(
    (view: ExploreView, targetId?: string | null) => {
      setEarthHistoryOpen(false)
      closePlanetHistory()
      const tid = String(targetId || '').trim()
      if (view === 'sky') {
        if (tid) setSkyActiveTargetId(tid)
        replaceExploreUrl(buildExploreHref({ view: 'sky', targetId: tid || undefined }))
        return
      }
      if (tid && !isSkyOnlyTarget(tid)) {
        setShowcaseActiveItemId(tid)
        if (tid.startsWith('planet-') || tid.startsWith('moon-') || tid.startsWith('sc-')) {
          replaceExploreUrl(buildExploreHref({ view: 'solar', entityId: tid }))
          return
        }
      }
      if (tid && isSkyOnlyTarget(tid)) {
        replaceExploreUrl(buildExploreHref({ view: 'solar', entityId: 'planet-earth' }))
        return
      }
      replaceExploreUrl(buildExploreHref({ view: 'solar', entityId: tid || undefined }))
    },
    [
      replaceExploreUrl,
      setShowcaseActiveItemId,
      setSkyActiveTargetId,
      setEarthHistoryOpen,
      closePlanetHistory,
    ],
  )

  const selectSkyTarget = useCallback(
    (targetId: string) => {
      const id = String(targetId || '').trim()
      if (!id) return
      setSkySceneHighlightId(null)
      setSkyActiveTargetId(id)
      replaceExploreUrl(buildExploreHref({ view: 'sky', targetId: id }))
    },
    [replaceExploreUrl, setSkyActiveTargetId, setSkySceneHighlightId],
  )

  const pickSkySceneObject = useCallback(
    (pickedId: string) => {
      const id = String(pickedId || '').trim()
      if (!id) return
      setSkySceneHighlightId(id)
    },
    [setSkySceneHighlightId],
  )

  const openSkyForEntity = useCallback(
    (entityId: string) => {
      navigateExploreView('sky', entityId)
    },
    [navigateExploreView],
  )

  const openSolarForTarget = useCallback(
    (targetId: string, solarEntityId?: string | null) => {
      const bodyId = String(solarEntityId || targetId || '').trim()
      if (!bodyId) return
      navigateExploreView('solar', bodyId)
    },
    [navigateExploreView],
  )

  return {
    navigateExploreView,
    selectSkyTarget,
    pickSkySceneObject,
    openSkyForEntity,
    openSolarForTarget,
  }
}
