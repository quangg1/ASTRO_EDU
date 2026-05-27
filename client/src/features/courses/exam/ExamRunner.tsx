'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/design-system'
import {
  checkpointExamAttempt,
  confirmExamQuestion,
  fetchActiveExamAttempt,
  fetchExamSession,
  startExamAttempt,
  submitExamAttempt,
  type ExamSession,
  type QuizRevealMode,
} from '@/features/courses/api/examApi'
import { updateLessonProgress } from '@/features/courses/public'

type PaletteState = 'empty' | 'answered' | 'locked'

type QuestionReveal = {
  correct: boolean
  correctIndex: number
  explanation: string | null
}

export function ExamRunner({
  courseSlug,
  lessonSlug,
  cohortId = null,
  backHref,
}: {
  courseSlug: string
  lessonSlug: string
  cohortId?: string | null
  backHref: string
}) {
  const [session, setSession] = useState<ExamSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set())
  const [reveals, setReveals] = useState<Record<string, QuestionReveal>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitResult, setSubmitResult] = useState<{
    score: number
    correctCount: number
    total: number
    passed: boolean
    perQuestion?: QuestionReveal[]
  } | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  const questions = session?.questions ?? []
  const settings = session?.settings
  const revealMode: QuizRevealMode = settings?.revealMode ?? 'after_submit'
  const currentQ = questions[currentIndex]
  const currentId = currentQ?.id ?? `q-${currentIndex}`

  const palette = useMemo(() => {
    return questions.map((q, i) => {
      const id = q.id || `q-${i}`
      if (lockedIds.has(id)) return 'locked' as PaletteState
      if (answers[id] != null && answers[id] >= 0) return 'answered' as PaletteState
      return 'empty' as PaletteState
    })
  }, [questions, answers, lockedIds])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const sess = await fetchExamSession(courseSlug, lessonSlug, cohortId)
    if (!sess.success || !sess.data) {
      setError(sess.error || 'Không tải được bài thi')
      setLoading(false)
      return
    }
    setSession(sess.data)

    const active = await fetchActiveExamAttempt(courseSlug, lessonSlug, cohortId)
    if (active.success && active.data?.id && active.data.status === 'in_progress') {
      setAttemptId(active.data.id)
      setAnswers((active.data.answers as Record<string, number>) || {})
      setRevision(active.data.revision ?? 0)
      setLockedIds(new Set(active.data.lockedQuestionIds || []))
      if (active.data.expiresAt) setExpiresAt(active.data.expiresAt)
    } else {
      const started = await startExamAttempt(courseSlug, lessonSlug, cohortId)
      if (!started.success) {
        setError(started.error || 'Không bắt đầu được bài thi')
        setLoading(false)
        return
      }
      setAttemptId(started.data.id)
      if (started.data.expiresAt) setExpiresAt(started.data.expiresAt)
    }
    setLoading(false)
  }, [courseSlug, lessonSlug, cohortId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(null)
      return
    }
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0 && attemptId && !submitted && !submitting) {
        void handleSubmit(true)
      }
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt, attemptId, submitted, submitting])

  const bumpCheckpoint = useCallback(
    async (nextAnswers: Record<string, number>, nextRev: number) => {
      if (!attemptId) return
      await checkpointExamAttempt(courseSlug, lessonSlug, attemptId, {
        answers: nextAnswers,
        revision: nextRev,
      }, cohortId)
    },
    [attemptId, courseSlug, lessonSlug, cohortId],
  )

  const selectAnswer = (optionIndex: number) => {
    if (!currentQ || submitted) return
    const id = currentId
    if (lockedIds.has(id)) return
    const next = { ...answers, [id]: optionIndex }
    setAnswers(next)
    const nextRev = revision + 1
    setRevision(nextRev)
    void bumpCheckpoint(next, nextRev)
  }

  const handleConfirmQuestion = async () => {
    if (!attemptId || !currentQ || revealMode !== 'after_each_question') return
    const id = currentId
    if (answers[id] == null || lockedIds.has(id)) return
    const res = await confirmExamQuestion(courseSlug, lessonSlug, attemptId, id, answers[id], cohortId)
    if (res.success && res.data) {
      setLockedIds((prev) => new Set(prev).add(id))
      setReveals((prev) => ({
        ...prev,
        [id]: {
          correct: res.data.correct,
          correctIndex: res.data.correctIndex,
          explanation: res.data.explanation,
        },
      }))
    }
  }

  const handleSubmit = async (auto = false) => {
    if (!attemptId || submitting || submitted) return
    setSubmitting(true)
    const res = await submitExamAttempt(courseSlug, lessonSlug, attemptId, answers, cohortId)
    setSubmitting(false)
    if (!res.success) {
      setError(res.error || 'Nộp bài thất bại')
      return
    }
    setSubmitted(true)
    const reveal = res.data?.reveal
    setSubmitResult({
      score: reveal?.score ?? 0,
      correctCount: reveal?.correctCount ?? 0,
      total: reveal?.total ?? questions.length,
      passed: Boolean(res.data?.passed),
      perQuestion: reveal?.perQuestion,
    })
    if (res.data?.passed !== false) {
      void updateLessonProgress(courseSlug, lessonSlug, true)
    }
    if (auto) setError('Hết giờ — bài đã được nộp tự động.')
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (loading) {
    return <p className="text-ds-muted p-8">Đang tải bài kiểm tra…</p>
  }
  if (error && !session) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-red-400">{error}</p>
        <Link href={backHref} className="text-ds-accent text-sm">← Quay lại khóa học</Link>
      </div>
    )
  }
  if (!session || !currentQ) return null

  const showReveal =
    submitted && submitResult && revealMode !== 'never'
      ? submitResult.perQuestion
      : null
  const perQReveal = reveals[currentId]

  return (
    <div className="min-h-[70vh] flex flex-col bg-ds-surface">
      <header className="border-b border-ds-border px-4 py-3 flex flex-wrap items-center gap-3 justify-between sticky top-0 z-10 bg-ds-surface/95 backdrop-blur">
        <div>
          <p className="text-xs text-ds-subtle">{session.lessonTitle}</p>
          <h1 className="text-lg font-semibold text-white">Bài kiểm tra</h1>
        </div>
        <div className="flex items-center gap-3">
          {secondsLeft != null && (
            <span className={`text-sm font-mono tabular-nums ${secondsLeft < 60 ? 'text-amber-400' : 'text-ds-muted'}`}>
              ⏱ {formatTime(secondsLeft)}
            </span>
          )}
          <span className="text-sm text-ds-muted">
            {Object.keys(answers).filter((k) => answers[k] >= 0).length}/{questions.length} đã chọn
          </span>
          {!submitted && (
            <Button
              type="button"
              onClick={() => void handleSubmit(false)}
              disabled={submitting}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {submitting ? 'Đang nộp…' : 'Nộp bài'}
            </Button>
          )}
        </div>
      </header>

      {error && <p className="px-4 py-2 text-amber-300 text-sm bg-amber-950/30">{error}</p>}

      <div className="flex flex-1 flex-col lg:flex-row gap-0 lg:gap-4 p-4 max-w-6xl mx-auto w-full">
        <nav className="lg:w-48 shrink-0 mb-4 lg:mb-0">
          <p className="text-[10px] uppercase tracking-wider text-ds-subtle mb-2">Câu hỏi</p>
          <div className="flex flex-wrap lg:grid lg:grid-cols-5 gap-1.5">
            {questions.map((q, i) => {
              const st = palette[i]
              const active = i === currentIndex
              return (
                <button
                  key={q.id || i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`w-9 h-9 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'border-cyan-500 bg-cyan-600/30 text-white'
                      : st === 'locked'
                        ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                        : st === 'answered'
                          ? 'border-ds-accent-strong bg-ds-accent-soft text-ds-accent'
                          : 'border-ds-border bg-white/5 text-ds-subtle hover:border-ds-accent-strong'
                  }`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </nav>

        <main className="flex-1 rounded-2xl border border-ds-border bg-ds-overlay p-5 space-y-4">
          {submitted && submitResult ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Kết quả</h2>
              <p className="text-ds-muted">
                {submitResult.correctCount}/{submitResult.total} câu đúng · {submitResult.score}%
                {submitResult.passed ? ' · Đạt' : ' · Chưa đạt'}
              </p>
              {showReveal?.map((row, i) => (
                <div
                  key={questions[i]?.id || i}
                  className={`rounded-lg border p-3 text-sm ${row.correct ? 'border-green-500/40' : 'border-red-500/30'}`}
                >
                  <p className="text-white font-medium">Câu {i + 1}</p>
                  {row.explanation && <p className="text-ds-muted mt-1">{row.explanation}</p>}
                </div>
              ))}
              <Link href={backHref} className="inline-block text-ds-accent text-sm">← Quay lại khóa học</Link>
            </div>
          ) : (
            <>
              <p className="text-white font-medium text-base md:text-lg">
                Câu {currentIndex + 1}. {currentQ.question}
              </p>
              <div className="space-y-2">
                {currentQ.options.map((opt, oi) => {
                  const selected = answers[currentId] === oi
                  const locked = lockedIds.has(currentId)
                  const rev = perQReveal
                  const showCorrect = rev && rev.correctIndex === oi
                  const showWrong = rev && selected && !rev.correct
                  return (
                    <label
                      key={oi}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                        showCorrect
                          ? 'border-green-500/50 bg-green-950/20'
                          : showWrong
                            ? 'border-red-500/40 bg-red-950/10'
                            : selected
                              ? 'border-ds-accent-strong bg-ds-accent-soft'
                              : 'border-ds-border hover:border-ds-accent-strong'
                      } ${locked ? 'opacity-90 cursor-default' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`exam-${currentId}`}
                        checked={selected}
                        disabled={locked || submitted}
                        onChange={() => selectAnswer(oi)}
                        className="accent-cyan-500"
                      />
                      <span className="text-sm text-gray-200">{opt.text}</span>
                    </label>
                  )
                })}
              </div>
              {perQReveal?.explanation && (
                <p className="text-sm text-ds-muted border-t border-ds-border pt-3">{perQReveal.explanation}</p>
              )}
              {revealMode === 'after_each_question' && !lockedIds.has(currentId) && answers[currentId] != null && (
                <Button type="button" onClick={() => void handleConfirmQuestion()} className="bg-white/10 border border-ds-border">
                  Xác nhận câu này
                </Button>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
