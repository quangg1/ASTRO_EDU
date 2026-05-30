'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AgentPageProvider, buildSessionContext } from '@/features/agent/public'
import { parseOnboardingLanding } from '@/lib/onboardingLanding'
import { useExplorePage } from './hooks/useExplorePage'
import { usePlanetHistoryEarthScene } from './hooks/usePlanetHistoryEarthScene'
import { ExploreSceneCanvas } from './components/ExploreSceneCanvas'
import { ExploreEarthOverlay } from './components/ExploreEarthOverlay'
import { ExplorePlanetHistoryOverlay } from './components/ExplorePlanetHistoryOverlay'
import { ExploreShowcaseOverlay } from './components/ExploreShowcaseOverlay'
import { ExploreOnboardingTour } from './components/ExploreOnboardingTour'

function ExplorePageInner() {
  const explore = useExplorePage()
  const searchParams = useSearchParams()
  const landing = parseOnboardingLanding(searchParams)
  const [tourOpen, setTourOpen] = useState(landing.fromOnboarding && landing.tour)
  const earthHistoryScene = usePlanetHistoryEarthScene(
    explore.planetHistoryOpen,
    explore.planetHistoryEntityId,
  )
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
        planetHistoryEntityId={explore.planetHistoryEntityId}
        earthHistoryStage={earthHistoryScene.earthHistoryStage}
        earthHistoryFossils={earthHistoryScene.earthHistoryFossils}
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
            planetHistoryEntityId={explore.planetHistoryEntityId}
            onClose={explore.closePlanetHistory}
          />
        ) : (
          <ExploreShowcaseOverlay {...explore} />
        )}
      </div>
      <ExploreOnboardingTour open={tourOpen} onClose={() => setTourOpen(false)} />
    </main>
    </AgentPageProvider>
  )
}

export function ExplorePageContent() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black" />}>
      <ExplorePageInner />
    </Suspense>
  )
}
