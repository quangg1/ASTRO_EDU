'use client'

import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { CheckCircle2, Sparkles, X } from 'lucide-react'
import type { QuizQuestion } from '@/shared/types/quizQuestion'
import { mcqAnswerIndex, mcqOptionTexts } from '@/shared/types/quizQuestion'
import { GEM_EARN_CONTEXTUAL_QUIZ } from '@/features/rewards/lib/gemWallet'

type Props = {
  open: boolean
  entityLabel: string
  entityId: string
  questions: QuizQuestion[]
  loggedIn: boolean
  onDismiss: () => void
  onComplete: (result: { correct: number; total: number; allCorrect: boolean }) => void
}

type Phase = 'intro' | 'question' | 'result'

export function ExploreBridgeQuiz({
  open,
  entityLabel,
  entityId,
  questions,
  loggedIn,
  onDismiss,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [pickedIndex, setPickedIndex] = useState<number | null>(null)
  const [reveal, setReveal] = useState(false)

  const total = questions.length
  const current = questions[questionIndex] ?? null

  useEffect(() => {
    if (!open) return
    setPhase('intro')
    setQuestionIndex(0)
    setAnswers({})
    setPickedIndex(null)
    setReveal(false)
  }, [open, entityId, total])

  const score = useMemo(() => {
    const correct = questions.filter((q) => answers[q.id] === mcqAnswerIndex(q)).length
    return { correct, total, answered: Object.keys(answers).length }
  }, [answers, questions])

  if (!open || total === 0) return null

  const finish = (nextAnswers: Record<string, number>) => {
    const correct = questions.filter((q) => nextAnswers[q.id] === mcqAnswerIndex(q)).length
    const allCorrect = correct === total
    setPhase('result')
    onComplete({ correct, total, allCorrect })
  }

  const handlePick = (optionIndex: number) => {
    if (!current || reveal) return
    setPickedIndex(optionIndex)
    setReveal(true)
    const next = { ...answers, [current.id]: optionIndex }
    setAnswers(next)
    window.setTimeout(() => {
      if (questionIndex >= total - 1) {
        finish(next)
        return
      }
      setQuestionIndex((i) => i + 1)
      setPickedIndex(null)
      setReveal(false)
    }, 850)
  }

  const title = entityLabel || entityId

  return (
    <aside
      className="pointer-events-auto fixed bottom-4 right-4 z-[26] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-cyan-400/25 bg-[rgba(6,10,22,0.94)] shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      aria-live="polite"
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

      <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-300/90">
            Kiểm tra nhanh
          </p>
          <p className="mt-0.5 text-sm font-medium text-white">{title}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg border border-white/10 p-1.5 text-white/50 transition hover:border-white/25 hover:text-white"
          aria-label="Đóng"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {phase === 'intro' ? (
        <div className="space-y-4 px-4 py-4">
          <p className="text-[13px] leading-relaxed text-white/72">
            Bạn vừa dừng lại với <span className="font-medium text-white">{title}</span>. Trả lời{' '}
            {total} câu ngắn về thiên thể này — lấy từ ngân hàng câu đã lưu, không gọi AI mỗi lần bạn mở quiz.
          </p>
          {loggedIn ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100">
              <Sparkles className="h-3 w-3 text-amber-300" strokeWidth={1.75} />
              +{GEM_EARN_CONTEXTUAL_QUIZ} Gem nếu đúng hết · một lần / thiên thể
            </div>
          ) : (
            <p className="text-[11px] text-white/45">Đăng nhập để nhận Gem khi trả lời đúng hết.</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPhase('question')}
              className="flex-1 rounded-xl bg-cyan-500/90 px-3 py-2.5 text-[12px] font-semibold text-[#031018] transition hover:bg-cyan-400"
            >
              Bắt đầu
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-xl border border-white/15 px-3 py-2.5 text-[12px] text-white/65 transition hover:bg-white/5"
            >
              Bỏ qua
            </button>
          </div>
        </div>
      ) : null}

      {phase === 'question' && current ? (
        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-white/40">
            <span>
              Câu {questionIndex + 1}/{total}
            </span>
            <span className="flex gap-1">
              {questions.map((q, i) => (
                <span
                  key={q.id}
                  className={clsx(
                    'h-1.5 w-1.5 rounded-full',
                    i < questionIndex
                      ? 'bg-emerald-400/80'
                      : i === questionIndex
                        ? 'bg-cyan-400'
                        : 'bg-white/15',
                  )}
                />
              ))}
            </span>
          </div>
          <p className="text-[13px] font-medium leading-snug text-white">{current.question}</p>
          <div className="grid gap-1.5">
            {mcqOptionTexts(current).map((opt, oi) => {
              const isPicked = pickedIndex === oi
              const isCorrect = oi === mcqAnswerIndex(current)
              return (
                <button
                  key={`${current.id}-${oi}`}
                  type="button"
                  disabled={reveal}
                  onClick={() => handlePick(oi)}
                  className={clsx(
                    'rounded-xl border px-3 py-2.5 text-left text-[12px] leading-snug transition',
                    !reveal && 'border-white/10 bg-white/[0.04] text-white/85 hover:border-cyan-400/35 hover:bg-cyan-500/10',
                    reveal && isCorrect && 'border-emerald-400/45 bg-emerald-500/15 text-emerald-50',
                    reveal && isPicked && !isCorrect && 'border-rose-400/45 bg-rose-500/15 text-rose-50',
                    reveal && !isPicked && !isCorrect && 'border-white/8 bg-black/20 text-white/35',
                  )}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {phase === 'result' ? (
        <div className="space-y-3 px-4 py-4">
          <div
            className={clsx(
              'flex items-start gap-2.5 rounded-xl border px-3 py-3',
              score.correct === score.total
                ? 'border-emerald-400/35 bg-emerald-500/10'
                : 'border-white/10 bg-white/[0.04]',
            )}
          >
            <CheckCircle2
              className={clsx(
                'mt-0.5 h-4 w-4 shrink-0',
                score.correct === score.total ? 'text-emerald-300' : 'text-white/40',
              )}
            />
            <div>
              <p className="text-sm font-semibold text-white">
                {score.correct === score.total ? 'Xuất sắc!' : 'Đã xong!'}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/65">
                {score.correct}/{score.total} câu đúng.
                {score.correct === score.total && loggedIn
                  ? ' Gem sẽ cộng vào ví nếu đây là lần đầu với thiên thể này.'
                  : score.correct < score.total
                    ? ' Ôn lại bài trên lộ trình rồi thử lại sau nhé.'
                    : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-xl border border-white/15 py-2.5 text-[12px] font-medium text-white/80 transition hover:bg-white/5"
          >
            Tiếp tục khám phá
          </button>
        </div>
      ) : null}
    </aside>
  )
}
