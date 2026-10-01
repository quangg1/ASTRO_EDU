import { getApiPathBase } from '@/lib/apiConfig'
import { apiFetch } from '@/lib/apiRequestInit'

/** Nguồn của một liên kết entity ↔ bài học: Studio, bài tự khai báo, trùng concept, hay đoán từ khóa. */
export type EntityLearningLinkSource = 'cms' | 'scene' | 'concept' | 'hint'

export type EntityLessonLink = {
  lessonId: string
  titleVi: string
  moduleId: string
  nodeId: string
  depth: 'beginner' | 'explorer' | 'researcher'
  source: EntityLearningLinkSource
  primary: boolean
}

export type EntityLearningLinks = {
  entityId: string
  known: boolean
  /** false = chỉ có liên kết đoán bằng từ khóa — entity cần được gắn nội dung trong Studio. */
  explicit: boolean
  conceptSource: 'cms' | 'hint' | null
  concepts: Array<{ id: string; title: string }>
  lessons: EntityLessonLink[]
}

/** `null` khi API lỗi / offline — caller tự dùng cách nối dự phòng phía client. */
export async function fetchEntityLearningLinks(entityId: string): Promise<EntityLearningLinks | null> {
  const id = String(entityId || '').trim()
  if (!id) return null
  try {
    const res = await apiFetch(
      `${getApiPathBase()}/explore/learning-links/${encodeURIComponent(id)}`,
      {},
      false,
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      data?: EntityLearningLinks
    } | null
    if (!res.ok || !data?.success || !data.data) return null
    return data.data
  } catch {
    return null
  }
}

export function lessonHrefForLink(link: Pick<EntityLessonLink, 'moduleId' | 'nodeId' | 'lessonId'>): string {
  return `/tutorial/${link.moduleId}/${link.nodeId}/${encodeURIComponent(link.lessonId)}`
}

/** Bài học → entity 3D (chỉ liên kết do người biên soạn khai báo), mạnh nhất đứng đầu. */
export type LessonEntityIndex = Record<
  string,
  Array<{ entityId: string; source: Exclude<EntityLearningLinkSource, 'hint'>; primary: boolean }>
>

export async function fetchLessonEntityIndex(): Promise<LessonEntityIndex | null> {
  try {
    const res = await apiFetch(`${getApiPathBase()}/explore/learning-links/by-lesson`, {}, false)
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      data?: LessonEntityIndex
    } | null
    if (!res.ok || !data?.success || !data.data) return null
    return data.data
  } catch {
    return null
  }
}
