import { getLessonById } from '@/data/learningPathCurriculum'
import { buildSessionContext } from './buildSessionContext'
import type { SessionContext } from '../types'

/** Fallback khi widget global chưa nhận store (ví dụ hydrate) — chỉ LP từ URL. */
export function inferSessionContextFromPath(pathname: string): SessionContext | null {
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
