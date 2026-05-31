'use client'

import { useMemo } from 'react'
import { useAuthStore } from '@/features/auth/public'
import { useExploreModeState } from './useExploreModeState'
import { useExploreShowcaseCatalog } from './useExploreShowcaseCatalog'
import { useExploreEarthMode } from './useExploreEarthMode'
import { useExplorePlanetHistoryMode } from './useExplorePlanetHistoryMode'
import { useExploreRewards } from './useExploreRewards'
import { useExploreLearningBridge } from './useExploreLearningBridge'
import { useExploreShowcaseNav } from './useExploreShowcaseNav'
import { useActiveEntityDeepHistoryAvailable } from './useActiveEntityDeepHistoryAvailable'

/** Composes explore orchestration hooks — keeps `page.tsx` thin. */
export function useExplorePage() {
  const user = useAuthStore((s) => s.user)
  const userId = user?.id

  const mode = useExploreModeState()
  const catalog = useExploreShowcaseCatalog(mode.planetHistoryEntityId)

  useExploreEarthMode(mode.earthHistoryOpen, mode.planetHistoryOpen, mode.stageTime)

  const planet = useExplorePlanetHistoryMode(
    mode.planetHistoryOpen,
    mode.planetHistoryEntityId,
    mode.searchParams,
    mode.closePlanetHistory,
  )

  const activeResolved = useMemo(
    () => catalog.resolvedCatalog.find((i) => i.id === mode.showcaseActiveItemId) ?? null,
    [catalog.resolvedCatalog, mode.showcaseActiveItemId],
  )

  const activeOrbitEntity = useMemo(
    () => catalog.mergedOrbitEntities.find((e) => e.id === mode.showcaseActiveItemId) ?? null,
    [catalog.mergedOrbitEntities, mode.showcaseActiveItemId],
  )

  const activeContentRow = useMemo(
    () => catalog.showcaseContent.find((r) => r.entityId === mode.showcaseActiveItemId) ?? null,
    [catalog.showcaseContent, mode.showcaseActiveItemId],
  )

  const bridge = useExploreLearningBridge({
    userId,
    bridgeDebugOn: mode.bridgeDebugOn,
    earthHistoryOpen: mode.earthHistoryOpen,
    planetHistoryOpen: mode.planetHistoryOpen,
    showcaseActiveItemId: mode.showcaseActiveItemId,
    modules: planet.modules,
    concepts: planet.concepts,
    activeContentRow,
    activeResolved,
    activeOrbitEntity,
    resolvedCatalog: catalog.resolvedCatalog,
  })

  const rewards = useExploreRewards(userId, mode.showcaseActiveItemId)
  const activeEntityHasDeepHistory = useActiveEntityDeepHistoryAvailable(mode.showcaseActiveItemId)

  const nav = useExploreShowcaseNav({
    pathname: mode.pathname,
    router: mode.router,
    searchParams: mode.searchParams,
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
    ...catalog,
    ...planet,
    ...bridge,
    ...rewards,
    ...nav,
    activeResolved,
    activeOrbitEntity,
    activeContentRow,
  }
}

export type ExplorePageModel = ReturnType<typeof useExplorePage>
