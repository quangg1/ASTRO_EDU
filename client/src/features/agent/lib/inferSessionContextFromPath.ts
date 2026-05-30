import { getLessonById } from '@/data/learningPathCurriculum'
import { buildSessionContext } from './buildSessionContext'
import type { SessionContext } from '../types'

const STUDIO_RESERVED = new Set(['showcase-entities', 'learning-path', 'concepts'])

/** Fallback khi widget global chưa nhận store (ví dụ hydrate) — LP / studio từ URL. */
export function inferSessionContextFromPath(pathname: string): SessionContext | null {
  if (pathname.startsWith('/studio')) {
    const m = pathname.match(/^\/studio\/([^/]+)/)
    const slug = m && !STUDIO_RESERVED.has(m[1]) ? decodeURIComponent(m[1]) : null
    return buildSessionContext({
      pathname,
      surface: 'studio',
      courseSlug: slug ?? undefined,
      routeLabel: 'Studio',
    })
  }

  const match = pathname.match(/^\/tutorial\/([^/]+)\/([^/]+)\/([^/?#]+)/)
  if (!match) return null

  const moduleId = decodeURIComponent(match[1])
  const nodeId = decodeURIComponent(match[2])
  const lessonId = decodeURIComponent(match[3])
  const hit = getLessonById(lessonId)

  return buildSessionContext({
    pathname,
    surface: 'learning_path',
    lessonId,
    lessonTitle: hit?.lesson.titleVi ?? lessonId,
    moduleId,
    nodeId,
    depth: hit?.depth,
  })
}
