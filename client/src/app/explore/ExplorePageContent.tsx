'use client'

import { useMemo } from 'react'
import { AgentPageProvider, buildSessionContext } from '@/features/agent/public'
import { useExplorePage } from './hooks/useExplorePage'
import { ExploreSceneCanvas } from './components/ExploreSceneCanvas'
import { ExploreEarthOverlay } from './components/ExploreEarthOverlay'
import { ExplorePlanetHistoryOverlay } from './components/ExplorePlanetHistoryOverlay'
import { ExploreShowcaseOverlay } from './components/ExploreShowcaseOverlay'

export function ExplorePageContent() {
  const explore = useExplorePage()
  const agentSessionContext = useMemo(
    () =>
      buildSessionContext({
        pathname: explore.pathname || '/explore',
        surface: 'explore',
        routeLabel: 'Khám phá',
        planet: explore.earthHistoryOpen
          ? 'earth'
          : explore.planetHistoryEntityId || explore.showcaseActiveItemId || 'showcase',
        stageTimeMa: explore.stageTime,
        entityId: explore.planetHistoryEntityId || explore.showcaseActiveItemId || null,
        narrativeKey: explore.planetHistoryEntityId
          ? `planet:${explore.planetHistoryEntityId}`
          : explore.stageTime != null
            ? `earth:${explore.stageTime}`
            : null,
      }),
    [
      explore.pathname,
      explore.earthHistoryOpen,
      explore.planetHistoryEntityId,
      explore.showcaseActiveItemId,
      explore.stageTime,
    ],
  )

  return (
    <AgentPageProvider value={{ sessionContext: agentSessionContext }}>
    <main
      className="surface-scene relative w-screen h-screen overflow-hidden bg-black min-h-screen min-w-[320px]"
      style={{ ['--planet-accent' as string]: explore.planetAccent }}
    >
      <ExploreSceneCanvas
        sceneMode={explore.sceneMode}
        planetGlobeEntity={explore.planetGlobeEntity}
        mergedOrbitEntities={explore.mergedOrbitEntities}
        showcaseContent={explore.showcaseContent}
        showcaseActiveItemId={explore.showcaseActiveItemId}
        selectedSolarPlanetIndex={explore.selectedSolarPlanetIndex}
        setSelectedSolarPlanetIndex={explore.setSelectedSolarPlanetIndex}
        initialShowcaseSpherical={explore.initialShowcaseSpherical}
        handleShowcaseEntityClicked={explore.handleShowcaseEntityClicked}
        syncSelectedPlanetFromItem={explore.syncSelectedPlanetFromItem}
        handleShowcaseCameraSettled={explore.handleShowcaseCameraSettled}
      />

      <div className="ui-overlay">
        {explore.sceneMode === 'earth' ? (
          <ExploreEarthOverlay onBackToShowcase={() => explore.setEarthHistoryOpen(false)} />
        ) : explore.sceneMode === 'planet-history' ? (
          <ExplorePlanetHistoryOverlay
            planetHistoryLabel={explore.planetHistoryLabel}
            planetHistoryLessonLinks={explore.planetHistoryLessonLinks}
            onClose={explore.closePlanetHistory}
          />
        ) : (
          <ExploreShowcaseOverlay {...explore} />
        )}
      </div>
    </main>
    </AgentPageProvider>
  )
}
