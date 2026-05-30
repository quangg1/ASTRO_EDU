'use client'

import type { QuizQuestion } from '@/shared/types/quizQuestion'
import { mcqAnswerIndex, mcqOptionTexts } from '@/shared/types/quizQuestion'

type Props = {
  open: boolean
  entityLabel: string
  entityId: string
  questions: QuizQuestion[]
  answers: Record<string, number>
  onAnswer: (questionId: string, optionIndex: number) => void
  onClose: () => void
  score: { answered: number; correct: number; total: number }
}

export function ExploreBridgeQuiz({
  open,
  entityLabel,
  entityId,
  questions,
  answers,
  onAnswer,
  onClose,
  score,
}: Props) {
  if (!open || questions.length === 0) return null

  return (
    <aside className="fixed right-4 bottom-4 z-[21] w-[23rem] rounded-xl border border-amber-400/35 bg-[#16100a]/95 p-3 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/90">Contextual quiz</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-white/20 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-white/10"
        >
          Đóng
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-200">
        Bạn vừa khám phá{' '}
        <span className="font-medium text-white">{entityLabel || entityId}</span>. Thử nhanh{' '}
        {questions.length} câu nhé?
      </p>
      <div className="mt-2 space-y-2">
        {questions.map((q, qIdx) => (
          <div key={q.id} className="rounded border border-white/10 bg-black/25 p-2">
            <p className="text-[11px] text-slate-100">
              {qIdx + 1}. {q.question}
            </p>
            <div className="mt-1.5 grid gap-1">
              {mcqOptionTexts(q).map((opt, oi) => {
                const picked = answers[q.id] === oi
                const reveal = answers[q.id] !== undefined
                const correct = oi === mcqAnswerIndex(q)
                return (
                  <button
                    key={`${q.id}-${oi}`}
                    type="button"
                    onClick={() => onAnswer(q.id, oi)}
                    className={`rounded border px-2 py-1 text-left text-[11px] ${
                      reveal
                        ? correct
                          ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-100'
                          : picked
                            ? 'border-rose-400/45 bg-rose-500/15 text-rose-100'
                            : 'border-white/10 bg-white/5 text-slate-400'
                        : picked
                          ? 'border-cyan-300/55 bg-cyan-500/20 text-cyan-100'
                          : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-amber-100/90">
        Điểm nhanh: {score.correct}/{score.total} đúng ({score.answered} đã trả lời)
      </p>
    </aside>
  )
}
