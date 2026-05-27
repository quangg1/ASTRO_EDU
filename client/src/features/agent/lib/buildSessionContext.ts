import type { SessionContext } from '../types'

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
  narrativeKey?: string | null
  coachTrigger?: 'quiz_failed' | null
  recallQuizAvailable?: boolean
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
    coachTrigger: params.coachTrigger ?? null,
    recallQuizAvailable: params.recallQuizAvailable ?? false,
    activeSectionId: params.activeSectionId ?? null,
    activeSectionTitle: params.activeSectionTitle ?? null,
    activeSectionExcerpt: params.activeSectionExcerpt ?? null,
  }
}
