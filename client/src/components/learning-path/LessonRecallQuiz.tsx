'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles, XCircle } from 'lucide-react'
import type { RecallQuestion } from '@/lib/lessonRecallQuiz'

type Props = {
  questions: RecallQuestion[]
  passed: boolean
  onPassed: () => void
}

export function LessonRecallQuiz({ questions, passed, onPassed }: Props) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [phase, setPhase] = useState<'idle' | 'wrong' | 'checking'>('idle')

  const total = questions.length
  const current = questions[step]
  const answeredAll = useMemo(() => questions.every((q) => answers[q.id] !== undefined), [questions, answers])
  const currentAnswered = current ? answers[current.id] !== undefined : false
  const selectedIdx = current ? answers[current.id] : undefined
  const isSelectedCorrect = current && selectedIdx !== undefined ? selectedIdx === current.correctIndex : false

  if (questions.length === 0) return null

  if (passed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl border border-violet-400/35 bg-gradient-to-br from-violet-950/80 via-[#0a1020] to-cyan-950/50 p-6 md:p-8 shadow-[0_0_48px_rgba(139,92,246,0.15)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(167,139,250,0.25),transparent)]" />
        <div className="relative flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/20"
          >
            <CheckCircle2 className="h-8 w-8 text-emerald-300" />
          </motion.div>
          <h2 className="text-lg font-semibold text-white">Đã nắm nội dung</h2>
          <p className="mt-2 max-w-md text-sm text-violet-100/90">
            Bạn đã vượt kiểm tra nhanh do giảng viên soạn. Trạng thái <strong className="text-white">Đã nắm (mastery)</strong> đã được
            ghi nhận — tách biệt với &quot;Đã đọc&quot;.
          </p>
        </div>
      </motion.div>
    )
  }

  const goCheck = () => {
    if (!answeredAll) return
    setPhase('checking')
    const ok = questions.every((q) => answers[q.id] === q.correctIndex)
    window.setTimeout(() => {
      if (ok) {
        onPassed()
        setPhase('idle')
      } else {
        setPhase('wrong')
      }
    }, 380)
  }

  const retry = () => {
    setPhase('idle')
    setAnswers({})
    setStep(0)
  }

  return (
    <div
      id="lesson-recall-quiz"
      className="relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#050a12] shadow-[0_0_40px_rgba(34,211,238,0.08)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_100%_0%,rgba(34,211,238,0.12),transparent),radial-gradient(ellipse_50%_40%_at_0%_100%,rgba(139,92,246,0.1),transparent)]" />

      <div className="relative border-b border-white/10 px-5 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
              <Sparkles className="h-4 w-4 text-cyan-200" />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-white">Kiểm tra nhanh</h2>
              <p className="text-[11px] text-slate-500">Studio · {total} câu · làm tuần tự</p>
            </div>
          </div>
          <div className="flex gap-1.5">
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
                    setPhase('idle')
                  }}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    active ? 'w-7 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : filled ? 'bg-emerald-500/70' : 'bg-white/15 hover:bg-white/25'
                  }`}
                  aria-label={`Câu ${i + 1}`}
                />
              )
            })}
          </div>
        </div>
      </div>

      <div className="relative px-5 py-6 md:px-8 md:py-8 min-h-[280px]">
        <AnimatePresence mode="wait">
          {phase === 'wrong' ? (
            <motion.div
              key="wrong"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <p className="text-rose-300 text-sm font-medium">Chưa đúng hết các câu</p>
              <p className="mt-2 max-w-sm text-xs text-slate-400">Xem lại từng ý rồi thử lại — đáp án đúng phải khớp toàn bộ.</p>
              <button
                type="button"
                onClick={retry}
                className="mt-5 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
              >
                Làm lại từ đầu
              </button>
            </motion.div>
          ) : current ? (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="max-w-xl mx-auto"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-500/90 mb-2">
                Câu {step + 1} / {total}
              </p>
              <h3 className="text-lg md:text-xl font-medium text-slate-100 leading-snug">{current.question}</h3>
              <div className="mt-6 grid gap-3">
                {current.options.map((opt, i) => {
                  const selected = answers[current.id] === i
                  const showEvaluation = selectedIdx !== undefined && (selected || i === current.correctIndex)
                  const isCorrectOption = i === current.correctIndex
                  return (
                    <motion.button
                      key={`${current.id}-o-${i}`}
                      type="button"
                      whileTap={{ scale: 0.985 }}
                      onClick={() => {
                        setAnswers((prev) => ({ ...prev, [current.id]: i }))
                        setPhase('idle')
                      }}
                      className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm transition-colors md:py-4 ${
                        showEvaluation
                          ? isCorrectOption
                            ? 'border-emerald-400/55 bg-emerald-500/10 text-emerald-50 ring-2 ring-emerald-500/25'
                            : selected
                              ? 'border-rose-400/55 bg-rose-500/10 text-rose-50 ring-2 ring-rose-500/20'
                              : 'border-white/10 bg-white/[0.03] text-slate-200'
                          : selected
                            ? 'border-cyan-400/55 bg-cyan-500/15 text-cyan-50 ring-2 ring-cyan-500/30'
                            : 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-cyan-500/35 hover:bg-cyan-500/5'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                          showEvaluation
                            ? isCorrectOption
                              ? 'bg-emerald-500/25 text-emerald-100'
                              : selected
                                ? 'bg-rose-500/20 text-rose-100'
                                : 'bg-white/10 text-slate-400'
                            : selected
                              ? 'bg-cyan-500/30 text-cyan-100'
                              : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="pt-1 leading-relaxed">
                        {opt}
                        {showEvaluation ? (
                          <span
                            className={`mt-2 block rounded-lg border px-2.5 py-2 text-xs leading-relaxed ${
                              isCorrectOption
                                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                                : selected
                                  ? 'border-rose-400/40 bg-rose-500/10 text-rose-100'
                                  : 'border-white/10 bg-white/5 text-slate-400'
                            }`}
                          >
                            <span className="mb-1 inline-flex items-center gap-1 font-semibold">
                              {isCorrectOption ? <CheckCircle2 className="h-3.5 w-3.5" /> : selected ? <XCircle className="h-3.5 w-3.5" /> : null}
                              {isCorrectOption ? 'Đúng' : selected ? 'Chưa đúng' : 'Giải thích'}
                            </span>
                            <span className="block">{current.optionExplanations?.[i] || ''}</span>
                          </span>
                        ) : null}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
              {selectedIdx !== undefined ? (
                <p className={`mt-4 text-xs ${isSelectedCorrect ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {isSelectedCorrect ? 'Bạn đang chọn đáp án đúng cho câu này.' : 'Bạn đang chọn đáp án sai cho câu này.'}
                </p>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/25 px-5 py-4 md:px-6">
        <button
          type="button"
          disabled={step === 0 || phase === 'checking'}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
          Trước
        </button>
        {step < total - 1 ? (
          <button
            type="button"
            disabled={!currentAnswered || phase === 'checking'}
            onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-600/80 to-cyan-500/60 px-5 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:from-cyan-500 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Tiếp
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!answeredAll || phase === 'checking'}
            onClick={goCheck}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/70 px-6 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,0.25)] hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {phase === 'checking' ? 'Đang chấm…' : 'Nộp bài kiểm tra'}
          </button>
        )}
      </div>
    </div>
  )
}
