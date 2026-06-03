'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { preloadHipBrightCatalog } from '@/features/explore/lib/hipBrightCatalogCache'
import { isConstellationTargetId } from '@/features/explore/public'
import { Loading } from '@/components/ui/Loading'
import { planetsData } from '@/lib/solarSystemData'
import { NASA_SHOWCASE_ITEMS } from '@/lib/showcaseEntities'
import type { ExplorePageModel } from '../hooks/useExplorePage'

const EarthScene = dynamic(() => import('@/components/3d/EarthScene'), {
  ssr: false,
  loading: () => <Loading />,
})
const PlanetHistoryScene = dynamic(() => import('@/components/3d/PlanetHistoryScene'), {
  ssr: false,
  loading: () => <Loading />,
})
const ShowcaseScene = dynamic(() => import('@/components/3d/showcase/ShowcaseScene'), {
  ssr: false,
  loading: () => <Loading />,
})
const SkyPlanetariumScene = dynamic(
  () => import('@/components/3d/sky/SkyPlanetariumScene').then((m) => m.SkyPlanetariumScene),
  { ssr: false, loading: () => <Loading /> },
)

type Props = Pick<
  ExplorePageModel,
  | 'exploreView'
  | 'skyTargets'
  | 'skyActiveTargetId'
  | 'skySceneHighlightId'
  | 'selectSkyTarget'
  | 'handleSkyScenePick'
  | 'observer'
  | 'ephemerisBodies'
  | 'sceneMode'
  | 'planetHistoryEntityId'
  | 'planetGlobeEntity'
  | 'mergedOrbitEntities'
  | 'showcaseContent'
  | 'showcaseActiveItemId'
  | 'selectedSolarPlanetIndex'
  | 'setSelectedSolarPlanetIndex'
  | 'initialShowcaseSpherical'
  | 'handleShowcaseEntityClicked'
  | 'syncSelectedPlanetFromItem'
  | 'handleShowcaseCameraSettled'
> & {
  earthHistoryStage: import('@/features/content3d/earth/lib/earthHistoryTypes').EarthStage | null
  earthHistoryFossils: import('@/features/content3d/earth/lib/earthHistoryTypes').Fossil[]
}

export function ExploreSceneCanvas({
  exploreView,
  skyTargets,
  skyActiveTargetId,
  skySceneHighlightId,
  selectSkyTarget,
  handleSkyScenePick,
  observer,
  ephemerisBodies,
  sceneMode,
  planetHistoryEntityId,
  earthHistoryStage,
  earthHistoryFossils,
  planetGlobeEntity,
  mergedOrbitEntities,
  showcaseContent,
  showcaseActiveItemId,
  selectedSolarPlanetIndex,
  setSelectedSolarPlanetIndex,
  initialShowcaseSpherical,
  handleShowcaseEntityClicked,
  syncSelectedPlanetFromItem,
  handleShowcaseCameraSettled,
}: Props) {
  useEffect(() => {
    if (exploreView === 'sky') preloadHipBrightCatalog()
  }, [exploreView])

  return (
    <div className="canvas-container explore-scene-canvas" data-explore-tour="explore-scene-canvas">
      <Suspense fallback={<Loading />}>
        {exploreView === 'sky' ? (
          <SkyPlanetariumScene
            targets={skyTargets}
            pinnedTargetId={skyActiveTargetId}
            sceneHighlightId={skySceneHighlightId}
            constellationTargetId={
              isConstellationTargetId(skyActiveTargetId) ? skyActiveTargetId : null
            }
            onSkyScenePick={handleSkyScenePick}
            observer={observer}
            ephemerisBodies={ephemerisBodies}
          />
        ) : sceneMode === 'earth' ? (
          <EarthScene />
        ) : sceneMode === 'planet-history' &&
          planetHistoryEntityId === 'planet-earth' &&
          earthHistoryStage ? (
          <EarthScene
            overrideStage={earthHistoryStage}
            overrideFossils={earthHistoryFossils}
            interactiveGlobe
          />
        ) : sceneMode === 'planet-history' && planetGlobeEntity ? (
          <PlanetHistoryScene globeEntity={planetGlobeEntity} />
        ) : (
          <ShowcaseScene
            orbitEntities={mergedOrbitEntities}
            showcaseContent={showcaseContent}
            showcaseActiveItemId={showcaseActiveItemId}
            onShowcaseItemSelect={(id) => {
              handleShowcaseEntityClicked(id, 'scene')
              syncSelectedPlanetFromItem(id)
            }}
            flightTargetIndex={selectedSolarPlanetIndex}
            onPlanetSelect={(idx) => {
              setSelectedSolarPlanetIndex(idx)
              if (idx === null) return
              const planetName = planetsData[idx]?.name
              if (!planetName) return
              const planetId = `planet-${planetName.toLowerCase()}`
              const planetItem = NASA_SHOWCASE_ITEMS.find(
                (item) =>
                  item.group === 'planets_moons' &&
                  (item.id === planetId || item.linkedPlanetName === planetName || item.name === planetName),
              )
              if (planetItem) handleShowcaseEntityClicked(planetItem.id, 'planet-select')
            }}
            observerTargetLock
            observerDisableAutoTarget={false}
            observerExploreEntityId={null}
            initialSpherical={initialShowcaseSpherical}
            onCameraSettled={handleShowcaseCameraSettled}
          />
        )}
      </Suspense>
    </div>
  )
}
