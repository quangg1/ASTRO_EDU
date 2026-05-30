'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles, XCircle } from 'lucide-react'
import type { RecallQuizDeliveryQuestion, RecallQuizSubmitResult } from '@/features/learning-path/api/learningPathApi'

type Props = {
  questions: RecallQuizDeliveryQuestion[]
  passed: boolean
  onPassed: () => void
  onQuizFailed?: () => void
  onSubmit: (answers: Record<string, number>) => Promise<RecallQuizSubmitResult>
  variant?: 'card' | 'overlay'
  onContinue?: () => void
}

function optionTexts(q: RecallQuizDeliveryQuestion): string[] {
  return (q.options ?? []).map((o) => String(o.text ?? ''))
}

export function LessonRecallQuiz({
  questions,
  passed,
  onPassed,
  onQuizFailed,
  onSubmit,
  variant = 'card',
  onContinue,
}: Props) {
  const isOverlay = variant === 'overlay'
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [phase, setPhase] = useState<'idle' | 'wrong' | 'checking'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [graded, setGraded] = useState<Record<string, RecallQuizSubmitResult['perQuestion'][0]>>({})

  const total = questions.length
  const current = questions[step]
  const answeredAll = useMemo(() => questions.every((q) => answers[q.id] !== undefined), [questions, answers])
  const currentAnswered = current ? answers[current.id] !== undefined : false
  const showGrades = phase === 'wrong'

  if (questions.length === 0) return null

  if (passed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative overflow-hidden p-6 md:p-8 ${
          isOverlay
            ? ''
            : 'rounded-ds-card border border-violet-400/35 bg-gradient-to-br from-violet-950/80 via-[#0a1020] to-cyan-950/50 shadow-[0_0_48px_rgba(139,92,246,0.15)]'
        }`}
      >
        {!isOverlay ? (
          <motion.div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(167,139,250,0.25),transparent)]" />
        ) : null}
        <motion.div className="relative flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/20"
          >
            <CheckCircle2 className="h-8 w-8 text-emerald-300" />
          </motion.div>
          <h2 className="text-lg font-semibold text-ds-text">Đã nắm nội dung</h2>
          <p className="mt-2 max-w-md text-sm text-violet-100/90">
            Bạn đã vượt kiểm tra nhanh. Trạng thái <strong className="text-ds-text">Đã nắm (mastery)</strong> đã được ghi nhận — tách
            biệt với &quot;Đã đọc&quot;.
          </p>
          {onContinue ? (
            <button
              type="button"
              onClick={onContinue}
              className="mt-6 rounded-2xl border border-violet-400/40 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/70 px-8 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,0.25)] hover:from-violet-500 hover:to-fuchsia-500"
            >
              Tiếp tục
            </button>
          ) : null}
        </motion.div>
      </motion.div>
    )
  }

  const goCheck = async () => {
    if (!answeredAll || phase === 'checking') return
    setSubmitError(null)
    setPhase('checking')
    try {
      const result = await onSubmit(answers)
      const byId: Record<string, RecallQuizSubmitResult['perQuestion'][0]> = {}
      for (const row of result.perQuestion) {
        byId[row.questionId] = row
      }
      setGraded(byId)
      if (result.passed) {
        onPassed()
        setPhase('idle')
      } else {
        setPhase('wrong')
        onQuizFailed?.()
      }
    } catch (e) {
      setPhase('idle')
      setSubmitError(e instanceof Error ? e.message : 'Không nộp được bài kiểm tra')
    }
  }

  const retry = () => {
    setPhase('idle')
    setAnswers({})
    setStep(0)
    setGraded({})
    setSubmitError(null)
  }

  return (
    <div
      id="lesson-recall-quiz"
      className={`relative flex flex-col ${
        isOverlay
          ? 'min-h-0 flex-1'
          : 'overflow-hidden rounded-ds-card border border-ds-accent-strong bg-ds-base shadow-[0_0_40px_rgba(34,211,238,0.08)]'
      }`}
    >
      {!isOverlay ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_100%_0%,rgba(34,211,238,0.12),transparent),radial-gradient(ellipse_50%_40%_at_0%_100%,rgba(139,92,246,0.1),transparent)]" />
      ) : null}

      <div className={`relative shrink-0 ${isOverlay ? 'px-5 pt-2 pb-3 md:px-6' : 'border-b border-ds-border px-5 py-4 md:px-6'}`}>
        <motion.div className={`flex flex-wrap items-center gap-3 ${isOverlay ? 'justify-center' : 'justify-between'}`}>
          {!isOverlay ? (
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-ds-accent-strong bg-ds-accent-soft">
                <Sparkles className="h-4 w-4 text-cyan-200" />
              </span>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-ds-text">Kiểm tra nhanh</h2>
                <p className="text-[11px] text-ds-subtle">Studio · {total} câu · chấm trên máy chủ</p>
              </div>
            </div>
          ) : (
            <p className="w-full text-center text-[11px] font-medium uppercase tracking-[0.14em] text-ds-accent">
              {total} câu · chấm trên máy chủ
            </p>
          )}
          <div className={`flex gap-1.5 ${isOverlay ? 'w-full justify-center' : ''}`}>
            {questions.map((q, i) => {
              const filled = answers[q.id] !== undefined
              const active = i === step
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    if (phase === 'checking') return
                    setStep(i)
                    if (phase === 'wrong') setPhase('idle')
                  }}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    active ? 'w-7 bg-ds-accent shadow-[0_0_10px_rgba(34,211,238,0.5)]' : filled ? 'bg-emerald-500/70' : 'bg-white/15 hover:bg-white/25'
                  }`}
                  aria-label={`Câu ${i + 1}`}
                />
              )
            })}
          </div>
        </motion.div>
      </div>

      <div className={`relative flex-1 px-5 py-5 md:px-8 md:py-6 ${isOverlay ? 'min-h-[240px]' : 'min-h-[280px]'}`}>
        {phase === 'wrong' ? (
          <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-center text-xs text-rose-100">
            <p className="font-medium">Chưa đúng hết — xem từng câu và giải thích, rồi làm lại. Trợ lý AI chỉ bật sau khi đóng bài kiểm tra.</p>
            <button
              type="button"
              onClick={retry}
              className="mt-2 rounded-lg border border-ds-border-strong bg-white/5 px-4 py-1.5 text-sm text-ds-text hover:bg-white/10"
            >
              Làm lại từ đầu
            </button>
          </div>
        ) : null}
        <AnimatePresence mode="wait">
          {current ? (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="max-w-xl mx-auto"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ds-accent mb-2">
                Câu {step + 1} / {total}
              </p>
              <h3 className="text-lg md:text-xl font-medium text-slate-100 leading-snug">{current.question}</h3>
              <div className="mt-6 grid gap-3">
                {optionTexts(current).map((opt, i) => {
                  const row = graded[current.id]
                  const correctIdx = showGrades && row ? row.correctIndex : null
                  const selected = answers[current.id] === i
                  const showEvaluation = showGrades && correctIdx !== null && (selected || i === correctIdx)
                  const isCorrectOption = correctIdx === i
                  return (
                    <motion.button
                      key={`${current.id}-o-${i}`}
                      type="button"
                      whileTap={{ scale: phase === 'checking' ? 1 : 0.985 }}
                      disabled={phase === 'checking'}
                      onClick={() => {
                        if (phase === 'checking') return
                        setAnswers((prev) => ({ ...prev, [current.id]: i }))
                        if (phase === 'wrong') setPhase('idle')
                      }}
                      className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm transition-colors md:py-4 ${
                        showEvaluation
                          ? isCorrectOption
                            ? 'border-emerald-400/55 bg-emerald-500/10 text-emerald-50 ring-2 ring-emerald-500/25'
                            : selected
                              ? 'border-rose-400/55 bg-rose-500/10 text-rose-50 ring-2 ring-rose-500/20'
                              : 'border-ds-border bg-white/[0.03] text-slate-200'
                          : selected
                            ? 'border-ds-accent-strong bg-ds-accent-soft text-cyan-50 ring-2 ring-ds-accent-strong'
                            : 'border-ds-border bg-white/[0.03] text-slate-200 hover:border-ds-accent-strong hover:bg-ds-accent-soft'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                          showEvaluation
                            ? isCorrectOption
                              ? 'bg-emerald-500/25 text-emerald-100'
                              : selected
                                ? 'bg-rose-500/20 text-rose-100'
                                : 'bg-white/10 text-ds-muted'
                            : selected
                              ? 'bg-ds-accent-strong text-cyan-100'
                              : 'bg-white/10 text-ds-muted'
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="pt-1 leading-relaxed">
                        {opt}
                        {showEvaluation && row?.explanation ? (
                          <span
                            className={`mt-2 block rounded-lg border px-2.5 py-2 text-xs leading-relaxed ${
                              isCorrectOption
                                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                                : selected
                                  ? 'border-rose-400/40 bg-rose-500/10 text-rose-100'
                                  : 'border-ds-border bg-white/5 text-ds-muted'
                            }`}
                          >
                            <span className="mb-1 inline-flex items-center gap-1 font-semibold">
                              {isCorrectOption ? <CheckCircle2 className="h-3.5 w-3.5" /> : selected ? <XCircle className="h-3.5 w-3.5" /> : null}
                              {isCorrectOption ? 'Đúng' : selected ? 'Chưa đúng' : 'Giải thích'}
                            </span>
                            <span className="block">{row.explanation}</span>
                          </span>
                        ) : null}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {submitError ? <p className="mt-4 text-center text-xs text-rose-300">{submitError}</p> : null}
      </div>

      <div
        className={`relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-ds-border px-5 py-4 md:px-6 ${
          isOverlay ? 'bg-black/20' : 'bg-black/25'
        }`}
      >
        <button
          type="button"
          disabled={step === 0 || phase === 'checking'}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ds-border px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
          Trước
        </button>
        {step < total - 1 ? (
          <button
            type="button"
            disabled={!currentAnswered || phase === 'checking'}
            onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ds-accent-strong bg-gradient-to-r from-cyan-600/80 to-cyan-500/60 px-5 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:from-cyan-500 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Tiếp
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!answeredAll || phase === 'checking'}
            onClick={() => void goCheck()}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/70 px-6 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,0.25)] hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {phase === 'checking' ? 'Đang chấm…' : 'Nộp bài kiểm tra'}
          </button>
        )}
      </div>
    </div>
  )
}
