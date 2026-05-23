import type { Lesson, LessonSection, QuizQuestion } from '@/features/courses/api/coursesApi'
import type { LearningConcept, LessonConceptAnchor } from '@/data/learningPathCurriculum'

/**
 * Contract preview lesson — Layer 1 shared foundation.
 * Course và LP truyền enrichments tuỳ domain; không merge shell.
 */
export type LessonPreviewContract = {
  /** Block kit — bắt buộc cho preview nội dung */
  sections: LessonSection[]
  title?: string
  description?: string
  /** Course assessment */
  quizQuestions?: QuizQuestion[]
  learningGoals?: string[]
  /** Course only */
  coverImage?: string | null
  videoUrl?: string | null
  stageTime?: number | null
  lessonSlug?: string
  week?: number | null
  /** LP only — concept highlight trong richtext */
  conceptAnchors?: LessonConceptAnchor[]
  concepts?: LearningConcept[]
}

/** Map Course `Lesson` → contract (không đổi behavior hiện tại). */
export function lessonPreviewFromCourseLesson(lesson: Lesson): LessonPreviewContract {
  return {
    sections: lesson.sections ?? [],
    title: lesson.title,
    description: lesson.description,
    quizQuestions: lesson.quizQuestions,
    learningGoals: lesson.learningGoals,
    coverImage: lesson.coverImage,
    videoUrl: lesson.videoUrl,
    stageTime: lesson.stageTime ?? null,
    lessonSlug: lesson.slug,
    week: lesson.week ?? null,
  }
}
