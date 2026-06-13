'use client'

import { useCallback } from 'react'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { useAuthStore } from '@/features/auth/public'
import { dispatchExplorePassportChanged } from '@/features/explore/lib/explorePassportActions'
import { markPassportSkyTarget } from '@/features/explore/lib/explorePassportStorage'
import {
  buildExploreHref,
  EXPLORE_SOLAR_ONLY_PARAMS,
  isSkyOnlyTarget,
  mergeExplorePreservedParams,
  type ExploreView,
} from '@/features/explore/public'
import { formatObserverTimeParam, skyTimeForPreset, type SkyTimePreset } from '@/features/explore/lib/skyObserver'
import { normalizeSkyTargetId } from '@/features/explore/lib/exploreViewUrl'
import type { AstronomyCalendarEvent } from '@/features/astronomy-calendar/types'

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
      markPassportSkyTarget(useAuthStore.getState().user?.id ?? null, id)
      dispatchExplorePassportChanged()
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

  const setSkyTimePreset = useCallback(
    (preset: SkyTimePreset) => {
      const next = new URLSearchParams(searchParams.toString())
      if (preset === 'live') {
        next.delete('time')
      } else {
        next.set('time', formatObserverTimeParam(skyTimeForPreset(preset)))
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [searchParams, pathname, router],
  )

  const jumpToSkyEvent = useCallback(
    (event: Pick<
      AstronomyCalendarEvent,
      'exploreTarget' | 'exploreView' | 'peakAt' | 'startAt' | 'lessonHref'
    >) => {
      if (event.lessonHref && !event.exploreTarget) {
        router.push(event.lessonHref)
        return
      }

      if (event.exploreView === 'solar' && event.exploreTarget) {
        navigateExploreView('solar', event.exploreTarget)
        return
      }

      const peakRaw = event.peakAt || event.startAt
      const peakAt = peakRaw ? new Date(peakRaw) : null

      const next = new URLSearchParams(searchParams.toString())
      next.set('view', 'sky')

      if (event.exploreTarget) {
        const tid = normalizeSkyTargetId(event.exploreTarget)
        setSkySceneHighlightId(null)
        setSkyActiveTargetId(tid)
        next.set('target', tid)
      }

      if (peakAt && !Number.isNaN(peakAt.getTime())) {
        next.set('time', formatObserverTimeParam(peakAt))
      }

      for (const k of EXPLORE_SOLAR_ONLY_PARAMS) next.delete(k)

      const qs = next.toString()
      replaceExploreUrl(qs ? `${pathname}?${qs}` : pathname)
    },
    [
      router,
      searchParams,
      pathname,
      replaceExploreUrl,
      navigateExploreView,
      setSkyActiveTargetId,
      setSkySceneHighlightId,
    ],
  )

  return {
    navigateExploreView,
    selectSkyTarget,
    pickSkySceneObject,
    openSkyForEntity,
    openSolarForTarget,
    setSkyTimePreset,
    jumpToSkyEvent,
  }
}
