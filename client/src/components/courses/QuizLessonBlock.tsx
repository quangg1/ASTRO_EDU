'use client'

import { useState } from 'react'
import type { QuizQuestion } from '@/features/courses/api/coursesApi'
import { mcqAnswerIndex, mcqOptionTexts } from '@/shared/types/quizQuestion'
import { useT } from '@/i18n/public'

export function QuizLessonBlock({
  questions,
  onComplete,
}: {
  questions: QuizQuestion[]
  onComplete?: () => void
}) {
  const { t } = useT()
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
    0,
  )
  const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0
  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <div
        className="relative overflow-hidden border p-4"
        style={{
          clipPath:
            'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)',
          borderColor: 'rgba(126,231,255,0.3)',
          background: 'rgba(10,16,36,0.65)',
        }}
      >
        <h3 className="font-semibold text-white">{t('courses.quizTitle')}</h3>
        <p className="mt-1 text-sm text-ds-muted">{t('courses.quizInstructionsFull')}</p>
        <span
          className="absolute right-3 top-3 text-[10px] uppercase tracking-wider text-cyan-200/80"
          style={mono}
        >
          {t('courses.quizEyebrow')}
        </span>
      </div>
      {questions.map((q, qIndex) => {
        const correctIdx = mcqAnswerIndex(q)
        const opts = mcqOptionTexts(q)
        return (
          <fieldset
            key={q.id || qIndex}
            className={`border p-4 ${
              submitted
                ? answers[qIndex] === correctIdx
                  ? 'border-green-500/50 bg-green-950/20'
                  : 'border-red-500/30 bg-red-950/10'
                : 'border-ds-border bg-white/5'
            }`}
            style={{
              clipPath:
                'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)',
            }}
          >
            <legend className="px-1 text-sm font-medium text-white md:text-base">
              {t('courses.quizQuestion', { n: qIndex + 1 })} {q.question}
            </legend>
            <div className="mt-2 space-y-2">
              {opts.map((opt, optIndex) => (
                <label
                  key={optIndex}
                  className={`flex cursor-pointer items-center gap-2 text-sm ${
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
                      <span className="ml-2 text-green-400">✓ {t('courses.quizCorrectAnswer')}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )
      })}

      {!submitted ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={answers.some((a) => a < 0)}
          className="border px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            clipPath:
              'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%)',
            borderColor: 'rgba(126,231,255,0.4)',
          }}
        >
          {t('courses.quizSubmit')}
        </button>
      ) : (
        <div
          className="border p-4"
          style={{
            clipPath:
              'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)',
            borderColor: 'rgba(126,231,255,0.3)',
            background: 'rgba(8,20,44,0.5)',
          }}
        >
          <p className="text-ds-accent font-medium">
            {t('courses.quizResult', { correct: correctCount, total: questions.length, score })}
          </p>
          <p className="text-sm text-ds-muted mt-1">
            {score >= 80 ? t('courses.quizResultPass') : t('courses.quizResultFail')}
          </p>
        </div>
      )}
    </div>
  )
}
