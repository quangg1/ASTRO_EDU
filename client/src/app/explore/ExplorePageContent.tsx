'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AgentPageProvider } from '@/features/agent/public'
import { useEarthHistoryStore, useSceneCommandStore } from '@/features/content3d/earth/public'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/public'
import { parseOnboardingLanding } from '@/lib/onboardingLanding'
import { useExplorePage } from './hooks/useExplorePage'
import { usePlanetHistoryEarthScene } from './hooks/usePlanetHistoryEarthScene'
import { buildExploreAgentSessionContext } from './lib/buildExploreAgentSessionContext'
import { ExploreSceneCanvas } from './components/ExploreSceneCanvas'
import { ExploreEarthOverlay } from './components/ExploreEarthOverlay'
import { ExplorePlanetHistoryOverlay } from './components/ExplorePlanetHistoryOverlay'
import { ExploreShowcaseOverlay } from './components/ExploreShowcaseOverlay'
import { ExploreSkyOverlay } from './components/ExploreSkyOverlay'
import { ExploreOnboardingTour } from './components/ExploreOnboardingTour'
import { shouldAutoOpenExploreTour } from './lib/exploreTourPrefs'
import type { ExploreTourContext } from './lib/exploreTourSteps'

function ExplorePageInner() {
  const explore = useExplorePage()
  const searchParams = useSearchParams()
  const landing = parseOnboardingLanding(searchParams)
  const [tourOpen, setTourOpen] = useState(false)

  const focusedFossil = useSceneCommandStore((s) => s.focusedFossil)
  const narrativeEntityId = usePlanetNarrativeStore((s) => s.entityId)
  const currentBeat = usePlanetNarrativeStore((s) => s.currentBeat)
  const selectedSiteId = usePlanetNarrativeStore((s) => s.selectedSiteId)
  const narrativeSites = usePlanetNarrativeStore((s) => s.sites)
  const earthStage = useEarthHistoryStore((s) => s.currentStage)

  useEffect(() => {
    if (shouldAutoOpenExploreTour(landing.fromOnboarding, landing.tour)) {
      setTourOpen(true)
    }
  }, [landing.fromOnboarding, landing.tour])

  const tourContext = useMemo(
    (): ExploreTourContext => ({
      sceneMode: explore.exploreView === 'sky' ? 'showcase' : explore.sceneMode,
      hasDeepHistory: explore.activeEntityHasDeepHistory,
      hasLessonLinks: explore.effectiveLessonLinks.length > 0,
      loggedIn: Boolean(explore.user),
    }),
    [
      explore.exploreView,
      explore.sceneMode,
      explore.activeEntityHasDeepHistory,
      explore.effectiveLessonLinks.length,
      explore.user,
    ],
  )

  const focusEarthShowcase = useCallback(() => {
    explore.navigateExploreView('solar', 'planet-earth')
  }, [explore])

  const returnToShowcaseForTour = useCallback(() => {
    focusEarthShowcase()
  }, [focusEarthShowcase])

  const handleTourFinished = useCallback(() => {
    setTourOpen(false)
    focusEarthShowcase()
  }, [focusEarthShowcase])
  const earthHistoryScene = usePlanetHistoryEarthScene(
    explore.planetHistoryOpen,
    explore.planetHistoryEntityId,
  )

  const agentSessionContext = useMemo(
    () =>
      buildExploreAgentSessionContext({
        pathname: explore.pathname || '/explore',
        exploreView: explore.exploreView,
        earthHistoryOpen: explore.earthHistoryOpen,
        planetHistoryOpen: explore.planetHistoryOpen,
        planetHistoryEntityId: explore.planetHistoryEntityId,
        showcaseActiveItemId: explore.showcaseActiveItemId,
        stageTimeFromUrl: explore.stageTime,
        skyActiveTargetId: explore.skyActiveTargetId,
        skySceneHighlightId: explore.skySceneHighlightId,
        skyTargets: explore.skyTargets,
        activeSkyTarget: explore.activeSkyTarget,
        observer: explore.observer,
        locationLabel: explore.locationLabel,
        narrativeEntityId,
        currentBeat,
        selectedSiteId,
        sites: narrativeSites,
        earthStageId: earthStage?.id ?? null,
        earthStageTime: earthStage?.time ?? null,
        focusedFossilId: focusedFossil?._id ?? null,
        focusedFossilName: focusedFossil?.name ?? null,
        focusedFossilPhylum: focusedFossil?.phylum ?? null,
      }),
    [
      explore.pathname,
      explore.exploreView,
      explore.earthHistoryOpen,
      explore.planetHistoryOpen,
      explore.planetHistoryEntityId,
      explore.showcaseActiveItemId,
      explore.stageTime,
      explore.skyActiveTargetId,
      explore.skySceneHighlightId,
      explore.skyTargets,
      explore.activeSkyTarget,
      explore.observer,
      explore.locationLabel,
      narrativeEntityId,
      currentBeat,
      selectedSiteId,
      narrativeSites,
      earthStage?.id,
      earthStage?.time,
      focusedFossil?._id,
      focusedFossil?.name,
      focusedFossil?.phylum,
    ],
  )

  return (
    <AgentPageProvider value={{ sessionContext: agentSessionContext }}>
    <main
      className="surface-scene relative w-screen h-screen overflow-hidden bg-black min-h-screen min-w-[320px]"
      style={{ ['--planet-accent' as string]: explore.planetAccent }}
    >
      <ExploreSceneCanvas
        exploreView={explore.exploreView}
        skyTargets={explore.skyTargets}
        skyActiveTargetId={explore.skyActiveTargetId}
        skySceneHighlightId={explore.skySceneHighlightId}
        selectSkyTarget={explore.selectSkyTarget}
        handleSkyScenePick={explore.handleSkyScenePick}
        observer={explore.observer}
        ephemerisBodies={explore.ephemerisBodies}
        skyWeather={explore.skyWeather}
        sceneMode={explore.sceneMode}
        planetHistoryEntityId={explore.planetHistoryEntityId}
        earthHistoryStage={earthHistoryScene.earthHistoryStage}
        earthHistoryFossils={earthHistoryScene.earthHistoryFossils}
        planetGlobeEntity={explore.planetGlobeEntity}
        mergedOrbitEntities={explore.visibleOrbitEntities}
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
        {explore.exploreView === 'sky' ? (
          <ExploreSkyOverlay {...explore} />
        ) : explore.sceneMode === 'earth' ? (
          <ExploreEarthOverlay onBackToShowcase={() => explore.setEarthHistoryOpen(false)} />
        ) : explore.sceneMode === 'planet-history' ? (
          <ExplorePlanetHistoryOverlay
            planetHistoryLabel={explore.planetHistoryLabel}
            planetHistoryLessonLinks={explore.planetHistoryLessonLinks}
            planetHistoryEntityId={explore.planetHistoryEntityId}
            onClose={explore.closePlanetHistory}
          />
        ) : (
          <ExploreShowcaseOverlay
            {...explore}
            tourOpen={tourOpen}
            onOpenTour={() => setTourOpen(true)}
          />
        )}
      </div>
      {explore.sceneMode !== 'showcase' && !tourOpen ? (
        <button
          type="button"
          onClick={() => setTourOpen(true)}
          className="pointer-events-auto fixed right-4 top-[4.25rem] z-[25] rounded border border-white/15 bg-black/50 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-300 backdrop-blur hover:bg-white/10 hover:text-cyan-100"
        >
          Hướng dẫn
        </button>
      ) : null}

      <ExploreOnboardingTour
        open={tourOpen}
        onClose={handleTourFinished}
        context={tourContext}
        onRequestShowcase={returnToShowcaseForTour}
      />
    </main>
    </AgentPageProvider>
  )
}

export function ExplorePageContent() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-ds-base text-ds-text" />}>
      <ExplorePageInner />
    </Suspense>
  )
}
