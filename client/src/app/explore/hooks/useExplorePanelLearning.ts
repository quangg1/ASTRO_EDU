'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LearningConcept, LearningModule } from '@/data/learningPathCurriculum'
import { resolveMappedLessons } from '@/features/content3d/showcase/public'
import {
  fetchConceptLearningStates,
  type ConceptLearningStateSummary,
} from '@/features/learning-state/api/learningStateApi'
import { startConceptQuiz } from '@/features/agent/api/agentApi'
import { openCosmoAssistant } from '@/features/agent/public'
import { useToast } from '@/design-system'
import {
  masteryStatusLabel,
  masteryStatusTone,
  needsConceptReview,
  type ConceptChipView,
} from '../lib/conceptMasteryUi'

export type ExploreStepId = 'read' | 'quiz' | 'lessons' | 'cosmo'

export type ExploreStepView = {
  id: ExploreStepId
  label: string
  hint: string
  status: 'done' | 'current' | 'todo'
}

type ConceptChipInput = { id: string; title?: string | null }

type Args = {
  userId: string | undefined
  entityDisplayName: string
  conceptChips: ConceptChipInput[]
  lessonLinks: Array<{ lessonId: string; title: string; href: string }>
  modules: LearningModule[]
  exploreFocusReady: boolean
  entityQuizCompleted: boolean
  bridgeQuizOpen: boolean
  onOpenBridgeQuiz: () => void
  visitedLessonCount: number
}

export function useExplorePanelLearning({
  userId,
  entityDisplayName,
  conceptChips,
  lessonLinks,
  modules,
  exploreFocusReady,
  entityQuizCompleted,
  bridgeQuizOpen,
  onOpenBridgeQuiz,
  visitedLessonCount,
}: Args) {
  const toast = useToast()
  const [conceptStates, setConceptStates] = useState<ConceptLearningStateSummary[]>([])
  const [conceptsLoading, setConceptsLoading] = useState(false)
  const [conceptQuizLoadingId, setConceptQuizLoadingId] = useState<string | null>(null)

  const conceptIds = useMemo(() => conceptChips.map((c) => c.id).filter(Boolean), [conceptChips])

  useEffect(() => {
    if (!userId || !conceptIds.length) {
      setConceptStates([])
      return
    }
    let cancelled = false
    setConceptsLoading(true)
    void fetchConceptLearningStates(conceptIds).then((rows) => {
      if (!cancelled) {
        setConceptStates(rows)
        setConceptsLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [userId, conceptIds.join('|')])

  const stateById = useMemo(() => {
    const m = new Map<string, ConceptLearningStateSummary>()
    for (const row of conceptStates) m.set(row.conceptId, row)
    return m
  }, [conceptStates])

  const lessonByConcept = useMemo(() => {
    const m = new Map<string, { href: string; title: string }>()
    for (const chip of conceptChips) {
      const lessons = resolveMappedLessons(modules, [chip.id])
      const first = lessons[0]
      if (first) m.set(chip.id, { href: first.href, title: first.title })
    }
    return m
  }, [modules, conceptChips])

  const chipViews: ConceptChipView[] = useMemo(
    () =>
      conceptChips.map((c) => {
        const st = stateById.get(c.id)
        const lesson = lessonByConcept.get(c.id) ?? null
        const mastery = userId && st ? st.mastery : null
        const review = userId ? needsConceptReview(st) : false
        return {
          id: c.id,
          title: c.title || c.id,
          mastery,
          needsReview: review,
          lessonHref: lesson?.href ?? null,
          lessonTitle: lesson?.title ?? null,
          nextBestAction: st?.nextBestAction ?? null,
        }
      }),
    [conceptChips, stateById, lessonByConcept, userId],
  )

  const lessonTotal = lessonLinks.length
  const lessonsDone =
    lessonTotal === 0 || (lessonTotal > 0 && visitedLessonCount >= lessonTotal)
  const lessonsPartial = lessonTotal > 0 && visitedLessonCount > 0 && !lessonsDone

  const steps: ExploreStepView[] = useMemo(() => {
    const readDone = exploreFocusReady
    const quizDone = entityQuizCompleted
    const lessonDone = lessonsDone

    const raw: Array<Omit<ExploreStepView, 'status'> & { done: boolean }> = [
      {
        id: 'read',
        label: 'Đọc panel',
        hint: 'Xem tổng quan và các tab nội dung',
        done: readDone,
      },
      {
        id: 'quiz',
        label: 'Quiz ngữ cảnh',
        hint: bridgeQuizOpen
          ? 'Đang làm quiz…'
          : quizDone
            ? 'Đã hoàn thành quiz cho thiên thể này'
            : 'Dừng vài giây trên thiên thể để mở',
        done: quizDone,
      },
      {
        id: 'lessons',
        label: lessonTotal > 0 ? `Bài lộ trình (${visitedLessonCount}/${lessonTotal})` : 'Bài lộ trình',
        hint: lessonTotal > 0 ? 'Mở bài từ tab Bầu trời hoặc chip concept' : 'Chưa gắn bài cho thiên thể này',
        done: lessonDone,
      },
      {
        id: 'cosmo',
        label: 'Hỏi Cosmo',
        hint: `Giải thích thêm về ${entityDisplayName || 'thiên thể này'}`,
        done: false,
      },
    ]

    let foundCurrent = false
    return raw.map((row) => {
      if (row.done) return { ...row, status: 'done' as const }
      if (!foundCurrent) {
        foundCurrent = true
        return { ...row, status: 'current' as const }
      }
      return { ...row, status: 'todo' as const }
    })
  }, [
    exploreFocusReady,
    entityQuizCompleted,
    lessonsDone,
    lessonTotal,
    visitedLessonCount,
    bridgeQuizOpen,
    entityDisplayName,
  ])

  const refreshConceptStates = useCallback(() => {
    if (!userId || !conceptIds.length) return
    void fetchConceptLearningStates(conceptIds).then(setConceptStates)
  }, [userId, conceptIds])

  const openConceptQuiz = useCallback(
    async (conceptId: string, lessonId?: string | null) => {
      if (!userId) {
        toast.show('Đăng nhập để làm quiz concept', { tone: 'info' })
        return
      }
      setConceptQuizLoadingId(conceptId)
      const res = await startConceptQuiz(conceptId, lessonId)
      setConceptQuizLoadingId(null)
      if (!res.ok || !res.data) {
        toast.show(res.error || 'Không tạo được quiz', { tone: 'danger' })
        return
      }
      window.dispatchEvent(
        new CustomEvent('galaxies:open-concept-quiz', {
          detail: {
            quizSessionId: res.data.quizSessionId,
            conceptId: res.data.conceptId,
            conceptTitle: res.data.conceptTitle,
            lessonId: res.data.lessonId,
            questions: res.data.questions,
          },
        }),
      )
    },
    [userId, toast],
  )

  const onStepAction = useCallback(
    (stepId: ExploreStepId) => {
      if (stepId === 'quiz') {
        onOpenBridgeQuiz()
        return
      }
      if (stepId === 'lessons' && lessonLinks[0]) {
        window.location.href = lessonLinks[0].href
        return
      }
      if (stepId === 'cosmo') {
        const names = chipViews.slice(0, 3).map((c) => c.title).join(', ')
        openCosmoAssistant({
          prompt: `Mình đang khám phá ${entityDisplayName} trên Explore 3D. Giải thích ngắn gọn và gợi ý bước học tiếp theo${
            names ? ` (liên quan: ${names})` : ''
          }.`,
        })
      }
    },
    [chipViews, entityDisplayName, lessonLinks, onOpenBridgeQuiz],
  )

  const onConceptChipClick = useCallback(
    (chip: ConceptChipView) => {
      if (!userId) {
        if (chip.lessonHref) {
          window.location.href = chip.lessonHref
          return
        }
        toast.show('Đăng nhập để xem mastery và quiz concept', { tone: 'info' })
        return
      }

      if (chip.needsReview || chip.nextBestAction === 'concept_quiz' || chip.mastery == null) {
        void openConceptQuiz(chip.id, null)
        return
      }
      if (chip.nextBestAction === 'review_lesson' && chip.lessonHref) {
        window.location.href = chip.lessonHref
        return
      }
      if (chip.lessonHref && (chip.mastery ?? 0) < 80) {
        window.location.href = chip.lessonHref
        return
      }
      if ((chip.mastery ?? 0) >= 80) {
        openCosmoAssistant({
          prompt: `Concept "${chip.title}" (mình đã nắm ~${chip.mastery}%): cho mình một câu hỏi mở rộng khi đang xem ${entityDisplayName}.`,
        })
        return
      }
      void openConceptQuiz(chip.id, null)
    },
    [userId, entityDisplayName, openConceptQuiz, toast],
  )

  useEffect(() => {
    const onQuizClosed = () => refreshConceptStates()
    window.addEventListener('galaxies:concept-quiz-closed', onQuizClosed)
    return () => window.removeEventListener('galaxies:concept-quiz-closed', onQuizClosed)
  }, [refreshConceptStates])

  return {
    steps,
    chipViews,
    conceptsLoading,
    conceptQuizLoadingId,
    lessonsPartial,
    masteryStatusLabel,
    masteryStatusTone,
    onStepAction,
    onConceptChipClick,
    refreshConceptStates,
  }
}
