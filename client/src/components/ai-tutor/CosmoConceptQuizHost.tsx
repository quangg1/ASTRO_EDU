'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/features/auth/public'
import { submitConceptQuiz } from '@/features/agent/api/agentApi'
import type { RecallQuizDeliveryQuestion, RecallQuizSubmitResult } from '@/features/learning-path/public'
import { LessonRecallQuizOverlay } from '@/components/learning-path/LessonRecallQuizOverlay'

export type ConceptQuizOpenDetail = {
  quizSessionId: string
  conceptId: string
  conceptTitle: string
  lessonId?: string | null
  questions: RecallQuizDeliveryQuestion[]
}

export function CosmoConceptQuizHost() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [passed, setPassed] = useState(false)
  const [detail, setDetail] = useState<ConceptQuizOpenDetail | null>(null)

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<ConceptQuizOpenDetail>).detail
      if (!d?.quizSessionId || !d.questions?.length) return
      setDetail(d)
      setPassed(false)
      setOpen(true)
    }
    window.addEventListener('galaxies:open-concept-quiz', onOpen)
    return () => window.removeEventListener('galaxies:open-concept-quiz', onOpen)
  }, [])

  const onClose = useCallback(() => {
    setOpen(false)
    setDetail(null)
    setPassed(false)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('galaxies:concept-quiz-closed'))
    }
  }, [])

  const onSubmit = useCallback(
    async (answers: Record<string, number>): Promise<RecallQuizSubmitResult> => {
      if (!detail?.quizSessionId) {
        throw new Error('Phiên quiz không hợp lệ')
      }
      const res = await submitConceptQuiz(detail.quizSessionId, answers)
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Nộp bài thất bại')
      }
      const data = res.data
      return {
        passed: data.passed,
        score: data.score,
        correctCount: data.correctCount,
        total: data.total,
        perQuestion: data.perQuestion,
        lessonId: data.lessonId || detail.lessonId || '',
      }
    },
    [detail],
  )

  if (!user) return null

  return (
    <LessonRecallQuizOverlay
      open={open}
      onClose={onClose}
      lessonTitle={detail?.conceptTitle || 'Concept'}
      questions={detail?.questions ?? []}
      passed={passed}
      onPassed={() => setPassed(true)}
      onSubmit={onSubmit}
      headerEyebrow="Quiz theo concept"
      headerSubtitle={detail?.conceptId ? `ID: ${detail.conceptId}` : undefined}
    />
  )
}
