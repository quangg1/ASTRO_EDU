'use client'

import { useEffect, useState } from 'react'
import type { LessonEntityIndex } from '../api/entityLearningLinksApi'
import { getLessonEntityIndexSync, loadLessonEntityIndex } from '../lib/lessonEntityIndex'

/** Re-render khi index tải xong để gợi ý Explore chuyển từ "đoán" sang liên kết thật. */
export function useLessonEntityIndex(): LessonEntityIndex | null {
  const [index, setIndex] = useState<LessonEntityIndex | null>(getLessonEntityIndexSync)
  useEffect(() => {
    if (getLessonEntityIndexSync()) return
    let cancelled = false
    void loadLessonEntityIndex().then((next) => {
      if (!cancelled && next) setIndex(next)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return index
}
