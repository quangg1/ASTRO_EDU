import { fetchLessonEntityIndex, type LessonEntityIndex } from '../api/entityLearningLinksApi'

/**
 * Cache dùng chung trong tab: chỉ tải một lần, mọi nơi cần "bài này mở cảnh 3D nào"
 * đọc đồng bộ qua `getLessonEntityIndexSync()`.
 */
let cached: LessonEntityIndex | null = null
let inflight: Promise<LessonEntityIndex | null> | null = null

export function getLessonEntityIndexSync(): LessonEntityIndex | null {
  return cached
}

export function loadLessonEntityIndex(): Promise<LessonEntityIndex | null> {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = fetchLessonEntityIndex().then((index) => {
      if (index) cached = index
      inflight = null
      return index
    })
  }
  return inflight
}
