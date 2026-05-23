import { flattenLessons, LEARNING_MODULES } from '@/data/learningPathCurriculum'

export function tutorialModuleStaticParams() {
  return LEARNING_MODULES.map((m) => ({ moduleId: m.id }))
}

export function tutorialNodeStaticParams() {
  return LEARNING_MODULES.flatMap((m) =>
    m.nodes.map((n) => ({ moduleId: m.id, nodeId: n.id })),
  )
}

export function tutorialLessonStaticParams() {
  return flattenLessons(LEARNING_MODULES).map((row) => ({
    moduleId: row.moduleId,
    nodeId: row.nodeId,
    lessonId: row.lesson.id,
  }))
}
