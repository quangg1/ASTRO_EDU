import type { LearningConcept, LearningModule } from '@/features/learning-path/data/learningPathCurriculum'

export type StudioJourneyIssue = {
  code:
    | 'missing-prerequisite'
    | 'orphan-lesson'
    | 'unmapped-concept'
    | 'missing-entity-link'
    | 'golden-path-no-entity'
  message: string
  lessonId?: string
  conceptId?: string
  entityId?: string
}

function firstBeginnerLesson(modules: LearningModule[]) {
  const firstModule = [...modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0]
  if (!firstModule) return null
  const firstNode = firstModule.nodes?.[0]
  const lesson = firstNode?.depths?.beginner?.[0]
  if (!firstNode || !lesson) return null
  return { module: firstModule, node: firstNode, lesson }
}

export function validateStudioJourney(
  modules: LearningModule[],
  concepts: LearningConcept[],
  entityIds: string[] = [],
): StudioJourneyIssue[] {
  const issues: StudioJourneyIssue[] = []
  const conceptIds = new Set(concepts.map((c) => c.id))
  const entitySet = new Set(entityIds.map((id) => String(id || '').trim()).filter(Boolean))

  const golden = firstBeginnerLesson(modules)
  if (golden) {
    const primaryEntity = String(golden.lesson.sceneContext?.primaryEntityId || '').trim()
    const entityList = (golden.lesson.sceneContext?.entityIds || [])
      .map((id) => String(id || '').trim())
      .filter(Boolean)
    const hasEntityLink = Boolean(primaryEntity || entityList.length > 0)
    if (!hasEntityLink) {
      issues.push({
        code: 'golden-path-no-entity',
        message: `Bài đầu lộ trình “${golden.lesson.titleVi || golden.lesson.title}” chưa gắn entity Explore — golden path gãy ở bước củng cố 3D.`,
        lessonId: golden.lesson.id,
      })
    } else if (primaryEntity && entitySet.size > 0 && !entitySet.has(primaryEntity)) {
      issues.push({
        code: 'missing-entity-link',
        message: `Bài đầu lộ trình liên kết entity không có trong catalog: ${primaryEntity}`,
        lessonId: golden.lesson.id,
        entityId: primaryEntity,
      })
    }
  }

  for (const module of modules) {
    for (const node of module.nodes) {
      for (const depth of ['beginner', 'explorer', 'researcher'] as const) {
        for (const lesson of node.depths[depth] ?? []) {
          const lessonConceptIds = lesson.conceptIds || []
          for (const conceptId of lessonConceptIds) {
            if (!conceptIds.has(conceptId)) {
              issues.push({
                code: 'unmapped-concept',
                message: `Bài “${lesson.titleVi || lesson.title}” tham chiếu concept chưa tồn tại: ${conceptId}`,
                lessonId: lesson.id,
                conceptId,
              })
            }
          }

          for (const anchor of lesson.conceptAnchors || []) {
            if (!conceptIds.has(anchor.conceptId)) {
              issues.push({
                code: 'unmapped-concept',
                message: `Anchor trong bài “${lesson.titleVi || lesson.title}” tham chiếu concept chưa tồn tại: ${anchor.conceptId}`,
                lessonId: lesson.id,
                conceptId: anchor.conceptId,
              })
            }
          }

          if ((lessonConceptIds.length === 0 || lesson.conceptAnchors?.length === 0) && depth === 'beginner') {
            issues.push({
              code: 'orphan-lesson',
              message: `Bài “${lesson.titleVi || lesson.title}” chưa có concept nào được gắn, dễ dẫn tới trải nghiệm rỗng.`,
              lessonId: lesson.id,
            })
          }

          if (
            lesson.sceneContext?.primaryEntityId &&
            entitySet.size > 0 &&
            !entitySet.has(lesson.sceneContext.primaryEntityId)
          ) {
            issues.push({
              code: 'missing-entity-link',
              message: `Bài “${lesson.titleVi || lesson.title}” liên kết entity không tồn tại trong catalog: ${lesson.sceneContext.primaryEntityId}`,
              lessonId: lesson.id,
              entityId: lesson.sceneContext.primaryEntityId,
            })
          }
        }
      }
    }
  }

  for (const concept of concepts) {
    for (const prerequisiteId of concept.prerequisites || []) {
      if (!conceptIds.has(prerequisiteId)) {
        issues.push({
          code: 'missing-prerequisite',
          message: `Concept “${concept.title}” tham chiếu prerequisite không tồn tại: ${prerequisiteId}`,
          conceptId: concept.id,
        })
      }
    }
  }

  return issues
}
