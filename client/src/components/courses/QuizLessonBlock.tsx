'use client'

import { useState } from 'react'
import type { QuizQuestion } from '@/features/courses/api/coursesApi'
import { mcqAnswerIndex, mcqOptionTexts } from '@/shared/types/quizQuestion'

export function QuizLessonBlock({
  questions,
  onComplete,
}: {
  questions: QuizQuestion[]
  onComplete?: () => void
}) {
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1))
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (qIndex: number, optionIndex: number) => {
    if (submitted) return
    setAnswers((prev) => {
      const next = [...prev]
      next[qIndex] = optionIndex
      return next
    })
  }

  const handleSubmit = () => {
    setSubmitted(true)
    onComplete?.()
  }

  const correctCount = questions.reduce(
    (acc, q, i) => acc + (answers[i] === mcqAnswerIndex(q) ? 1 : 0),
    0
  )
  const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="rounded-xl border border-ds-accent-strong bg-cyan-950/20 p-4">
        <h3 className="text-white font-semibold">Bài kiểm tra kiến thức</h3>
        <p className="text-sm text-ds-muted mt-1">Trả lời đầy đủ tất cả câu hỏi trước khi nộp bài.</p>
      </div>
      {questions.map((q, qIndex) => {
        const correctIdx = mcqAnswerIndex(q)
        const opts = mcqOptionTexts(q)
        return (
        <fieldset
          key={q.id || qIndex}
          className={`rounded-xl border p-4 ${
            submitted
              ? answers[qIndex] === correctIdx
                ? 'border-green-500/50 bg-green-950/20'
                : 'border-red-500/30 bg-red-950/10'
              : 'border-ds-border bg-white/5'
          }`}
        >
          <legend className="text-sm md:text-base font-medium text-white px-1">
            Câu {qIndex + 1}. {q.question}
          </legend>
          <div className="mt-2 space-y-2">
            {opts.map((opt, optIndex) => (
              <label
                key={optIndex}
                className={`flex items-center gap-2 cursor-pointer text-sm ${
                  submitted
                    ? optIndex === correctIdx
                      ? 'text-green-400'
                      : answers[qIndex] === optIndex && optIndex !== correctIdx
                        ? 'text-red-400'
                        : 'text-ds-subtle'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name={`q-${qIndex}`}
                  checked={answers[qIndex] === optIndex}
                  onChange={() => handleChange(qIndex, optIndex)}
                  disabled={submitted}
                  className="rounded border-ds-border-strong text-cyan-600"
                />
                <span>
                  {String.fromCharCode(65 + optIndex)}. {opt}
                  {submitted && optIndex === correctIdx && (
                    <span className="ml-2 text-green-400">✓ Đáp án đúng</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )})}

      {!submitted ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={answers.some((a) => a < 0)}
          className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Nộp bài
        </button>
      ) : (
        <div className="rounded-lg border border-ds-accent-strong bg-cyan-950/20 p-4">
          <p className="text-ds-accent font-medium">
            Kết quả: {correctCount}/{questions.length} câu đúng ({score}%)
          </p>
          <p className="text-sm text-ds-muted mt-1">
            {score >= 80 ? 'Bạn đã nắm tốt nội dung.' : 'Hãy xem lại bài học và thử lại.'}
          </p>
        </div>
      )}
    </div>
  )
}
