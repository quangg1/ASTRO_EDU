import type { LessonItem } from '@/features/learning-path/data/learningPathCurriculum'
import {
  isValidMcq,
  normalizeQuizList,
  type QuizQuestion,
} from '@/shared/types/quizQuestion'

export type { QuizQuestion as RecallQuestion }

/**
 * Chỉ dùng `lesson.recallQuiz` do Studio soạn — không sinh tự động.
 * Trả về 3–5 câu hợp lệ (mỗi câu ≥ 3 đáp án, có đúng một đáp án đúng).
 */
export function normalizeStudioRecallQuiz(lesson: LessonItem): QuizQuestion[] {
  const parsed = normalizeQuizList(lesson.recallQuiz, lesson.id, { maxCount: 5, minCount: 0 })
  const valid = parsed.filter((q) => isValidMcq(q, 3))
  return valid.length >= 3 ? valid : []
}
