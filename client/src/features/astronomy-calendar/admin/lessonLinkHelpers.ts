import { DEPTH_ORDER, type DepthLevel, type LearningModule } from '@/data/learningPathCurriculum'

export type LessonLinkOption = {
  lessonId: string
  moduleId: string
  nodeId: string
  depth: DepthLevel
  titleVi: string
  href: string
}

export function buildLpLessonHref(moduleId: string, nodeId: string, lessonId: string): string {
  return `/tutorial/${encodeURIComponent(moduleId)}/${encodeURIComponent(nodeId)}/${encodeURIComponent(lessonId)}`
}

export function parseLpLessonHref(href: string | null | undefined): {
  moduleId: string
  nodeId: string
  lessonId: string
} | null {
  if (!href) return null
  const m = href.match(/^\/tutorial\/([^/]+)\/([^/]+)\/([^/?#]+)/)
  if (!m) return null
  return {
    moduleId: decodeURIComponent(m[1]),
    nodeId: decodeURIComponent(m[2]),
    lessonId: decodeURIComponent(m[3]),
  }
}

export function flattenLpLessons(modules: LearningModule[]): LessonLinkOption[] {
  const out: LessonLinkOption[] = []
  for (const mod of modules) {
    for (const node of mod.nodes || []) {
      for (const depth of DEPTH_ORDER) {
        for (const lesson of node.depths?.[depth] || []) {
          out.push({
            lessonId: lesson.id,
            moduleId: mod.id,
            nodeId: node.id,
            depth,
            titleVi: lesson.titleVi || lesson.title || lesson.id,
            href: buildLpLessonHref(mod.id, node.id, lesson.id),
          })
        }
      }
    }
  }
  return out
}

export const EXPLORE_TARGET_SUGGESTIONS = [
  'planet-moon',
  'planet-sun',
  'planet-venus',
  'planet-mars',
  'planet-jupiter',
  'planet-saturn',
  'planet-mercury',
  'gemini',
] as const
