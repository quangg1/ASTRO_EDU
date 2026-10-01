'use client'

import { lazy, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { preloadHipBrightCatalog } from '@/features/explore/public'
import { isConstellationTargetId } from '@/features/explore/public'
import { Loading } from '@/components/ui/Loading'
import { planetsData } from '@/features/content3d/showcase/public'
import { NASA_SHOWCASE_ITEMS } from '@/features/content3d/showcase/public'
import type { ExplorePageModel } from '../hooks/useExplorePage'
import { EXPLORE_SCENES, resolveExploreSceneId } from '../lib/exploreSceneRegistry'
import type { ScenePreset } from '@/components/3d/scene-host/scenePreset'

/** Canvas dùng chung cho Trái Đất / Deep History / Showcase — tạo một lần, sống suốt trang. */
const SharedSceneCanvas = dynamic(
  () => import('@/components/3d/scene-host/SceneCanvas').then((m) => m.SharedSceneCanvas),
  { ssr: false, loading: () => <Loading /> },
)
const SkyPlanetariumScene = dynamic(
  () => import('@/components/3d/sky/SkyPlanetariumScene').then((m) => m.SkyPlanetariumScene),
  { ssr: false, loading: () => <Loading /> },
)

// Nội dung cảnh (không Canvas) — chỉ tải khi cảnh được mở lần đầu.
const EarthSceneContent = lazy(() =>
  import('@/components/3d/EarthScene').then((m) => ({ default: m.EarthSceneContent })),
)
const PlanetHistorySceneContent = lazy(() =>
  import('@/components/3d/PlanetHistoryScene').then((m) => ({ default: m.PlanetHistorySceneContent })),
)
const ShowcaseSceneRoot = lazy(() =>
  import('@/components/3d/showcase/ShowcaseScene').then((m) => ({ default: m.ShowcaseSceneRoot })),
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
  | 'skyWeather'
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
  earthHistoryStage: import('@/features/content3d/earth/public').EarthStage | null
  earthHistoryFossils: import('@/features/content3d/earth/public').Fossil[]
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
  skyWeather,
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

  const sceneId = resolveExploreSceneId({
    exploreView,
    sceneMode,
    planetHistoryEntityId,
    hasEarthHistoryStage: Boolean(earthHistoryStage),
    hasPlanetGlobe: Boolean(planetGlobeEntity),
  })
  const scene = EXPLORE_SCENES[sceneId]

  // Canvas dùng chung chỉ được tạo khi lần đầu cần, rồi giữ lại (ẩn) khi sang bầu trời
  // để quay lại không phải dựng WebGL context mới.
  const lastSharedPresetRef = useRef<ScenePreset | null>(null)
  if (scene.canvas === 'shared') lastSharedPresetRef.current = scene.preset
  const [sharedMounted, setSharedMounted] = useState(scene.canvas === 'shared')
  useEffect(() => {
    if (scene.canvas === 'shared') setSharedMounted(true)
  }, [scene.canvas])
  const sharedPreset = lastSharedPresetRef.current

  return (
    <div className="canvas-container explore-scene-canvas" data-explore-tour="explore-scene-canvas">
      {sharedMounted && sharedPreset && (
        <SharedSceneCanvas preset={sharedPreset} active={scene.canvas === 'shared'}>
          {sceneId === 'earth' ? (
            <EarthSceneContent />
          ) : sceneId === 'earth-history' && earthHistoryStage ? (
            <EarthSceneContent
              overrideStage={earthHistoryStage}
              overrideFossils={earthHistoryFossils}
              interactiveGlobe
            />
          ) : sceneId === 'planet-history' && planetGlobeEntity ? (
            <PlanetHistorySceneContent globeEntity={planetGlobeEntity} />
          ) : sceneId === 'showcase' ? (
            <ShowcaseSceneRoot
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
          ) : null}
        </SharedSceneCanvas>
      )}
      {sceneId === 'sky' && (
        <Suspense fallback={<Loading />}>
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
            skyWeather={skyWeather}
          />
        </Suspense>
      )}
    </div>
  )
}
