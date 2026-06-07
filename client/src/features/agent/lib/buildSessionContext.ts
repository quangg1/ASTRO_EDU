import type {
  ExploreIconicOrganismContext,
  ExploreNarrativeSiteContext,
  ExploreSkyContext,
  SessionContext,
} from '../types'

type BuildParams = {
  pathname: string
  surface: SessionContext['surface']
  lessonId?: string
  lessonTitle?: string
  moduleId?: string
  nodeId?: string
  depth?: string
  courseSlug?: string
  routeLabel?: string
  planet?: string
  stageTimeMa?: number | null
  entityId?: string | null
  focusedFossilId?: string | null
  focusedFossilName?: string | null
  focusedFossilPhylum?: string | null
  narrativeBeatId?: number | null
  narrativeBeatName?: string | null
  narrativeBeatTimeMa?: number | null
  narrativeBeatAgeLabel?: string | null
  selectedSite?: ExploreNarrativeSiteContext | null
  iconicOrganisms?: ExploreIconicOrganismContext[] | null
  skyContext?: ExploreSkyContext | null
  narrativeKey?: string | null
  coachTrigger?: 'quiz_failed' | null
  recallQuizAvailable?: boolean
  quizLock?: 'recall' | 'course_exam' | null
  recallQuizActive?: boolean
  activeSectionId?: string | null
  activeSectionTitle?: string | null
  activeSectionExcerpt?: string | null
}

export function buildSessionContext(params: BuildParams): SessionContext {
  return {
    surface: params.surface,
    pathname: params.pathname,
    routeLabel: params.routeLabel ?? null,
    lessonId: params.lessonId ?? null,
    lessonTitle: params.lessonTitle ?? null,
    moduleId: params.moduleId ?? null,
    nodeId: params.nodeId ?? null,
    depth: params.depth ?? null,
    courseSlug: params.courseSlug ?? null,
    narrativeKey: params.narrativeKey ?? null,
    planet: params.planet ?? null,
    stageTimeMa: params.stageTimeMa ?? null,
    entityId: params.entityId ?? null,
    focusedFossilId: params.focusedFossilId ?? null,
    focusedFossilName: params.focusedFossilName ?? null,
    focusedFossilPhylum: params.focusedFossilPhylum ?? null,
    narrativeBeatId: params.narrativeBeatId ?? null,
    narrativeBeatName: params.narrativeBeatName ?? null,
    narrativeBeatTimeMa: params.narrativeBeatTimeMa ?? null,
    narrativeBeatAgeLabel: params.narrativeBeatAgeLabel ?? null,
    selectedSite: params.selectedSite ?? null,
    iconicOrganisms: params.iconicOrganisms ?? null,
    skyContext: params.skyContext ?? null,
    coachTrigger: params.coachTrigger ?? null,
    recallQuizAvailable: params.recallQuizAvailable ?? false,
    quizLock: params.quizLock ?? null,
    recallQuizActive: params.recallQuizActive ?? false,
    activeSectionId: params.activeSectionId ?? null,
    activeSectionTitle: params.activeSectionTitle ?? null,
    activeSectionExcerpt: params.activeSectionExcerpt ?? null,
  }
}
