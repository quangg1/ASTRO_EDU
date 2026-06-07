import { buildSessionContext } from '@/features/agent/lib/buildSessionContext'
import type {
  ExploreIconicOrganismContext,
  ExploreNarrativeSiteContext,
  ExploreSkyContext,
  SessionContext,
} from '@/features/agent/types'
import type { NarrativeBeat, NarrativeSite } from '@/features/content3d/narrative/types'
import { getSkyTargetLabel, type SkyExploreTarget } from '@/features/explore/public'
import type { SkyObserver } from '@/features/explore/lib/skyObserver'
import { getIconicOrganismsForStage } from '@/lib/iconicOrganisms'

const EARTH_ENTITY_ID = 'planet-earth'

type Params = {
  pathname: string
  exploreView: 'solar' | 'sky'
  earthHistoryOpen: boolean
  planetHistoryOpen: boolean
  planetHistoryEntityId: string | null
  showcaseActiveItemId: string
  stageTimeFromUrl: number | null
  skyActiveTargetId: string
  skySceneHighlightId: string | null
  skyTargets: SkyExploreTarget[]
  activeSkyTarget: SkyExploreTarget | null
  observer: SkyObserver
  locationLabel: string
  narrativeEntityId: string
  currentBeat: NarrativeBeat
  selectedSiteId: string | null
  sites: NarrativeSite[]
  earthStageId: number | null
  earthStageTime: number | null
  focusedFossilId: string | null
  focusedFossilName: string | null
  focusedFossilPhylum: string | null
}

export function buildExploreAgentSessionContext(params: Params): SessionContext {
  const isEarthDeepHistory =
    params.earthHistoryOpen || params.planetHistoryEntityId === EARTH_ENTITY_ID

  let stageTimeMa = params.stageTimeFromUrl
  let narrativeBeatId: number | null = null
  let narrativeBeatName: string | null = null
  let narrativeBeatTimeMa: number | null = null
  let narrativeBeatAgeLabel: string | null = null

  if (params.planetHistoryOpen && params.narrativeEntityId) {
    narrativeBeatId = params.currentBeat.id
    narrativeBeatName = params.currentBeat.name
    narrativeBeatTimeMa = params.currentBeat.timeMa
    narrativeBeatAgeLabel = params.currentBeat.ageLabelVi
    stageTimeMa = params.currentBeat.timeMa
  } else if (params.earthHistoryOpen && params.earthStageTime != null) {
    stageTimeMa = params.earthStageTime
  }

  let selectedSite: ExploreNarrativeSiteContext | null = null
  if (params.planetHistoryOpen && params.selectedSiteId) {
    const site = params.sites.find((s) => s.id === params.selectedSiteId)
    if (site) {
      selectedSite = {
        siteId: site.id,
        nameVi: site.nameVi,
        kind: site.kind,
        blurbVi: site.blurbVi.slice(0, 400),
      }
    }
  }

  let iconicOrganisms: ExploreIconicOrganismContext[] | null = null
  if (isEarthDeepHistory) {
    const stageId = params.planetHistoryOpen ? params.currentBeat.id : params.earthStageId
    if (stageId != null) {
      const list = getIconicOrganismsForStage(stageId)
      if (list.length > 0) {
        iconicOrganisms = list.slice(0, 6).map((o) => ({
          nameVi: o.nameVi,
          name: o.name,
          description: o.description.slice(0, 200),
          hasModel3d: Boolean(o.modelUrl),
        }))
      }
    }
  }

  let skyContext: ExploreSkyContext | null = null
  if (params.exploreView === 'sky') {
    const highlight = params.skySceneHighlightId
      ? (params.skyTargets.find((t) => t.id === params.skySceneHighlightId) ?? null)
      : null
    skyContext = {
      pinnedTargetId: params.skyActiveTargetId,
      pinnedTargetLabel: getSkyTargetLabel(params.activeSkyTarget, params.skyActiveTargetId),
      pinnedTargetKind: params.activeSkyTarget?.kind ?? 'body',
      sceneHighlightId: params.skySceneHighlightId,
      sceneHighlightLabel: highlight ? getSkyTargetLabel(highlight) : null,
      observerLatDeg: params.observer.latDeg,
      observerLonDeg: params.observer.lonDeg,
      observerTimeIso: params.observer.at.toISOString(),
      observerLocationLabel: params.locationLabel,
      lightPollution: params.observer.lightPollution,
      museumBlurbVi: params.activeSkyTarget?.museumBlurbVi?.slice(0, 400) ?? null,
    }
  }

  const planet =
    params.exploreView === 'sky'
      ? 'sky'
      : isEarthDeepHistory
        ? 'earth'
        : params.planetHistoryEntityId || params.showcaseActiveItemId || 'showcase'

  const entityId =
    params.exploreView === 'sky'
      ? params.skyActiveTargetId
      : params.planetHistoryEntityId || params.showcaseActiveItemId || null

  const narrativeKey =
    params.exploreView === 'sky'
      ? `sky:${params.skyActiveTargetId}`
      : params.planetHistoryEntityId
        ? `planet:${params.planetHistoryEntityId}:${narrativeBeatId ?? ''}`
        : stageTimeMa != null
          ? `earth:${stageTimeMa}`
          : null

  return buildSessionContext({
    pathname: params.pathname,
    surface: 'explore',
    routeLabel: 'Khám phá',
    planet,
    stageTimeMa,
    entityId,
    narrativeKey,
    narrativeBeatId,
    narrativeBeatName,
    narrativeBeatTimeMa,
    narrativeBeatAgeLabel,
    selectedSite,
    iconicOrganisms,
    skyContext,
    focusedFossilId: params.focusedFossilId,
    focusedFossilName: params.focusedFossilName,
    focusedFossilPhylum: params.focusedFossilPhylum,
  })
}
