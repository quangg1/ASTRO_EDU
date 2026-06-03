'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/features/auth/public'
import { useExploreModeState } from './useExploreModeState'
import { useExploreShowcaseCatalog } from './useExploreShowcaseCatalog'
import { useExploreEarthMode } from './useExploreEarthMode'
import { useExplorePlanetHistoryMode } from './useExplorePlanetHistoryMode'
import { useExploreRewards } from './useExploreRewards'
import { useExploreLearningBridge } from './useExploreLearningBridge'
import { useExploreShowcaseNav } from './useExploreShowcaseNav'
import { useActiveEntityDeepHistoryAvailable } from './useActiveEntityDeepHistoryAvailable'
import { useExploreSkyCatalog } from './useExploreSkyCatalog'
import { useExploreViewNavigation } from './useExploreViewNavigation'
import { useExploreSkyObserver } from './useExploreSkyObserver'
import { preloadHipBrightCatalog } from '@/features/explore/lib/hipBrightCatalogCache'
import {
  isConstellationTargetId,
  resolveSolarEntityIdForTarget,
} from '@/features/explore/public'

/** Composes explore orchestration hooks — keeps `page.tsx` thin. */
export function useExplorePage() {
  const user = useAuthStore((s) => s.user)
  const userId = user?.id

  const mode = useExploreModeState()

  useEffect(() => {
    preloadHipBrightCatalog()
  }, [])

  const skyObserver = useExploreSkyObserver(mode.searchParams)
  const sky = useExploreSkyCatalog(mode.skyActiveTargetId)
  const catalog = useExploreShowcaseCatalog(mode.planetHistoryEntityId)

  useExploreEarthMode(mode.earthHistoryOpen, mode.planetHistoryOpen, mode.stageTime)

  const planet = useExplorePlanetHistoryMode(
    mode.planetHistoryOpen,
    mode.planetHistoryEntityId,
    mode.searchParams,
    mode.closePlanetHistory,
  )

  const bridgeEntityId = useMemo(() => {
    if (mode.exploreView === 'sky') {
      if (isConstellationTargetId(mode.skyActiveTargetId)) return mode.skyActiveTargetId
      const solar = resolveSolarEntityIdForTarget(sky.activeSkyTarget)
      return solar || mode.skyActiveTargetId
    }
    return mode.showcaseActiveItemId
  }, [mode.exploreView, mode.showcaseActiveItemId, mode.skyActiveTargetId, sky.activeSkyTarget])

  const activeResolved = useMemo(
    () => catalog.resolvedCatalog.find((i) => i.id === bridgeEntityId) ?? null,
    [catalog.resolvedCatalog, bridgeEntityId],
  )

  const activeOrbitEntity = useMemo(
    () => catalog.mergedOrbitEntities.find((e) => e.id === bridgeEntityId) ?? null,
    [catalog.mergedOrbitEntities, bridgeEntityId],
  )

  const activeContentRow = useMemo(
    () => catalog.showcaseContent.find((r) => r.entityId === bridgeEntityId) ?? null,
    [catalog.showcaseContent, bridgeEntityId],
  )

  const viewNav = useExploreViewNavigation({
    pathname: mode.pathname,
    router: mode.router,
    searchParams: mode.searchParams,
    setShowcaseActiveItemId: mode.setShowcaseActiveItemId,
    setSkyActiveTargetId: mode.setSkyActiveTargetId,
    setSkySceneHighlightId: mode.setSkySceneHighlightId,
    setEarthHistoryOpen: mode.setEarthHistoryOpen,
    closePlanetHistory: mode.closePlanetHistory,
  })

  const handleSkyScenePick = useCallback(
    (pickedId: string) => {
      const id = String(pickedId || '').trim()
      if (!id) return
      if (isConstellationTargetId(mode.skyActiveTargetId)) {
        if (id.startsWith('star-hip-')) viewNav.pickSkySceneObject(id)
        return
      }
      viewNav.selectSkyTarget(id)
    },
    [mode.skyActiveTargetId, viewNav],
  )

  const bridge = useExploreLearningBridge({
    userId,
    bridgeDebugOn: mode.bridgeDebugOn,
    earthHistoryOpen: mode.earthHistoryOpen,
    planetHistoryOpen: mode.planetHistoryOpen,
    exploreView: mode.exploreView,
    activeTargetId: mode.activeTargetId,
    bridgeEntityId,
    activeSkyTarget: sky.activeSkyTarget,
    skyTargets: sky.skyTargets,
    modules: planet.modules,
    concepts: planet.concepts,
    activeContentRow,
    activeResolved,
    activeOrbitEntity,
    resolvedCatalog: catalog.resolvedCatalog,
  })

  const rewards = useExploreRewards(userId)
  const activeEntityHasDeepHistory = useActiveEntityDeepHistoryAvailable(mode.showcaseActiveItemId)

  const nav = useExploreShowcaseNav({
    pathname: mode.pathname,
    router: mode.router,
    searchParams: mode.searchParams,
    exploreView: mode.exploreView,
    showcaseActiveItemId: mode.showcaseActiveItemId,
    setShowcaseActiveItemId: mode.setShowcaseActiveItemId,
    selectedSolarPlanetIndex: mode.selectedSolarPlanetIndex,
    setSelectedSolarPlanetIndex: mode.setSelectedSolarPlanetIndex,
    activeResolved,
    planetHistoryOpen: mode.planetHistoryOpen,
    earthHistoryOpen: mode.earthHistoryOpen,
    planetBeatAccent: planet.planetBeatAccent,
    pushBridgeDebug: bridge.pushBridgeDebug,
  })

  return {
    user,
    activeEntityHasDeepHistory,
    ...mode,
    ...skyObserver,
    ...sky,
    ...viewNav,
    handleSkyScenePick,
    skySceneHighlightId: mode.skySceneHighlightId,
    ...catalog,
    ...planet,
    ...bridge,
    ...rewards,
    ...nav,
    bridgeEntityId,
    activeResolved,
    activeOrbitEntity,
    activeContentRow,
  }
}

export type ExplorePageModel = ReturnType<typeof useExplorePage>
