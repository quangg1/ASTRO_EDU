import type { SyllabusLesson } from '@/features/courses/api/cohortApi'

export function formatSchedule(iso?: string | null) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

export function lessonHref(courseSlug: string, cohortId: string, lesson: SyllabusLesson) {
  if (lesson.type === 'quiz') {
    return `/courses/${courseSlug}/cohort/${cohortId}/exam/${lesson.slug}`
  }
  if (lesson.type === 'assignment') {
    return `/courses/${courseSlug}/cohort/${cohortId}/assignment/${lesson.slug}`
  }
  if (lesson.type === 'live_session') {
    return null
  }
  return `/courses/${courseSlug}/learn/${lesson.slug}`
}

export function typeLabel(type: string) {
  switch (type) {
    case 'quiz':
      return 'Kiểm tra'
    case 'assignment':
      return 'Bài tập'
    case 'live_session':
      return 'Học online'
    default:
      return 'Bài học'
  }
}

export function isLearningLesson(type: string) {
  return ['text', 'visualization', 'live_session'].includes(type)
}

export function isAssessmentLesson(type: string) {
  return type === 'quiz' || type === 'assignment'
}

export function upcomingKindLabel(kind: 'opens' | 'due') {
  return kind === 'opens' ? 'Mở bài' : 'Hạn nộp'
}
