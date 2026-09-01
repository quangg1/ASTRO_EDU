import {
  DEPTH_ORDER,
  flattenLessons,
  type LearningModule,
  type LessonItem,
} from '@/features/learning-path/data/learningPathCurriculum'
import type { LessonCompletionMap } from './learningPathProgress'

export type JourneyGuardrailStatus = 'start' | 'continue' | 'review' | 'blocked'

export type JourneyGuardrailRecommendation = {
  status: JourneyGuardrailStatus
  title: string
  reason: string
  lessonId?: string
  lessonTitle?: string
  href?: string
  blockerLessonId?: string
  blockerLessonTitle?: string
}

function buildLessonHref(module: LearningModule, nodeId: string, lesson: LessonItem) {
  return `/tutorial/${module.id}/${nodeId}/${lesson.id}`
}

export function buildLearningJourneyGuardrail(
  modules: LearningModule[],
  completionMap: LessonCompletionMap,
  lastLessonId?: string | null,
): JourneyGuardrailRecommendation {
  const flat = flattenLessons(modules)
  if (flat.length === 0) {
    return {
      status: 'start',
      title: 'Bắt đầu ở đây',
      reason: 'Lộ trình học đang được chuẩn bị cho bạn.',
    }
  }

  const completedSet = new Set(
    Object.entries(completionMap)
      .filter(([, done]) => Boolean(done))
      .map(([lessonId]) => lessonId),
  )

  const anchorIndex = lastLessonId
    ? flat.findIndex((entry) => entry.lesson.id === lastLessonId)
    : -1

  const firstIncomplete = flat.findIndex((entry) => !completedSet.has(entry.lesson.id))

  if (firstIncomplete < 0) {
    const lastCompleted = [...flat].reverse().find((entry) => completedSet.has(entry.lesson.id))
    return {
      status: 'review',
      title: 'Ôn lại nội dung đã học',
      reason: 'Bạn đã hoàn thành toàn bộ lộ trình hiện có. Hãy ôn lại để củng cố kiến thức.',
      lessonId: lastCompleted?.lesson.id,
      lessonTitle: lastCompleted?.lesson.titleVi || lastCompleted?.lesson.title,
      href: lastCompleted
        ? buildLessonHref(lastCompleted.moduleId as never, lastCompleted.nodeId, lastCompleted.lesson)
        : '/tutorial',
    }
  }

  const targetEntry = anchorIndex >= 0 && !completedSet.has(lastLessonId as string)
    ? flat[anchorIndex]
    : flat[firstIncomplete]

  if (anchorIndex >= 0 && anchorIndex !== firstIncomplete && !completedSet.has(lastLessonId as string)) {
    return {
      status: 'continue',
      title: 'Tiếp tục bài bạn đã dừng',
      reason: 'Bạn đã có điểm dừng trước đó. Hãy tiếp tục ngay để giữ nối tiếp học tập.',
      lessonId: targetEntry.lesson.id,
      lessonTitle: targetEntry.lesson.titleVi || targetEntry.lesson.title,
      href: buildLessonHref(targetEntry.moduleId as never, targetEntry.nodeId, targetEntry.lesson),
    }
  }

  const prevEntry = firstIncomplete > 0 ? flat[firstIncomplete - 1] : null
  if (firstIncomplete > 0 && prevEntry && !completedSet.has(prevEntry.lesson.id)) {
    const blockerLesson = prevEntry.lesson
    return {
      status: 'blocked',
      title: 'Hoàn thành bước trước trước khi tiếp tục',
      reason: `Bạn cần hoàn thành “${blockerLesson.titleVi || blockerLesson.title}” trước khi mở bài này.`,
      lessonId: prevEntry.lesson.id,
      lessonTitle: prevEntry.lesson.titleVi || prevEntry.lesson.title,
      href: buildLessonHref(prevEntry.moduleId as never, prevEntry.nodeId, prevEntry.lesson),
      blockerLessonId: targetEntry.lesson.id,
      blockerLessonTitle: targetEntry.lesson.titleVi || targetEntry.lesson.title,
    }
  }

  if (firstIncomplete === 0) {
    return {
      status: 'start',
      title: 'Bắt đầu từ bài đầu tiên',
      reason: 'Đây là bước đầu tiên trong lộ trình. Hoàn thành nó để mở khóa các bước tiếp theo.',
      lessonId: targetEntry.lesson.id,
      lessonTitle: targetEntry.lesson.titleVi || targetEntry.lesson.title,
      href: buildLessonHref(targetEntry.moduleId as never, targetEntry.nodeId, targetEntry.lesson),
    }
  }

  return {
    status: 'continue',
    title: 'Tiếp tục hành trình của bạn',
    reason: 'Bạn đã có tiến độ. Hãy tiếp tục bài học tiếp theo để giữ hành trình liên tục.',
    lessonId: targetEntry.lesson.id,
    lessonTitle: targetEntry.lesson.titleVi || targetEntry.lesson.title,
    href: buildLessonHref(targetEntry.moduleId as never, targetEntry.nodeId, targetEntry.lesson),
  }
}
