'use client'

import { useState } from 'react'
import type { QuizQuestion } from '@/lib/coursesApi'

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', textTransform: 'uppercase' }

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
    (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
    0
  )
  const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0

  return (
    <div className="p-6 max-w-3xl space-y-5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* Header */}
      <div className="hud-chamfer-md border p-5" style={{ borderColor: 'rgba(126,231,255,0.2)', background: 'rgba(126,231,255,0.04)' }}>
        <div style={{ ...MONO, fontSize: 9, color: '#5c6886', marginBottom: 8 }}>// quiz · knowledge check</div>
        <h3 className="font-semibold text-base" style={{ color: '#eaf6ff' }}>Bài kiểm tra kiến thức</h3>
        <p className="text-sm mt-1" style={{ color: '#9aa8c4' }}>Trả lời đầy đủ tất cả câu hỏi trước khi nộp bài.</p>
      </div>

      {/* Questions */}
      {questions.map((q, qIndex) => (
        <fieldset
          key={qIndex}
          className="hud-chamfer border p-5"
          style={
            submitted
              ? answers[qIndex] === q.correctIndex
                ? { borderColor: 'rgba(109,255,176,0.4)', background: 'rgba(109,255,176,0.05)' }
                : { borderColor: 'rgba(255,80,80,0.3)', background: 'rgba(255,80,80,0.04)' }
              : { borderColor: 'rgba(126,231,255,0.1)', background: 'rgba(255,255,255,0.03)' }
          }
        >
          <legend className="px-1 mb-1">
            <span style={{ ...MONO, fontSize: 9, color: '#5c6886' }}>// câu {qIndex + 1} / {questions.length}</span>
          </legend>
          <p className="text-sm md:text-base font-medium mb-3" style={{ color: '#eaf6ff' }}>{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, optIndex) => {
              const isCorrect = optIndex === q.correctIndex
              const isChosen = answers[qIndex] === optIndex
              const isWrong = submitted && isChosen && !isCorrect

              return (
                <label
                  key={optIndex}
                  className="flex items-center gap-3 cursor-pointer text-sm transition-colors"
                  style={{
                    color: submitted
                      ? isCorrect ? '#6dffb0'
                        : isWrong ? 'rgba(255,100,100,0.9)'
                        : '#5c6886'
                      : '#9aa8c4',
                  }}
                >
                  {/* Custom radio */}
                  <span
                    className="flex items-center justify-center shrink-0 transition-all"
                    style={{
                      width: 18, height: 18, fontSize: 9,
                      clipPath: 'polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)',
                      background: submitted
                        ? isCorrect ? 'rgba(109,255,176,0.2)' : isWrong ? 'rgba(255,80,80,0.2)' : 'transparent'
                        : isChosen ? 'rgba(126,231,255,0.15)' : 'transparent',
                      border: `1px solid ${
                        submitted
                          ? isCorrect ? 'rgba(109,255,176,0.6)' : isWrong ? 'rgba(255,80,80,0.5)' : '#2a3450'
                          : isChosen ? '#7ee7ff' : '#2a3450'
                      }`,
                      color: submitted ? (isCorrect ? '#6dffb0' : isWrong ? '#ff6464' : 'transparent') : isChosen ? '#7ee7ff' : 'transparent',
                    }}
                  >
                    {submitted ? (isCorrect ? '✓' : isWrong ? '✗' : '') : isChosen ? '●' : ''}
                  </span>
                  <input
                    type="radio"
                    name={`q-${qIndex}`}
                    checked={answers[qIndex] === optIndex}
                    onChange={() => handleChange(qIndex, optIndex)}
                    disabled={submitted}
                    className="sr-only"
                  />
                  <span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, marginRight: 6, color: '#5c6886' }}>
                      {String.fromCharCode(65 + optIndex)}.
                    </span>
                    {opt}
                    {submitted && isCorrect && (
                      <span className="ml-2" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6dffb0' }}>✓ đáp án đúng</span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      ))}

      {/* Submit / result */}
      {!submitted ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={answers.some((a) => a < 0)}
          className="px-6 py-2.5 hud-chamfer-sm font-semibold text-sm transition-all disabled:opacity-40"
          style={{
            background: answers.some((a) => a < 0) ? 'rgba(245,165,36,0.4)' : '#f5a524',
            color: '#1a0e00',
            boxShadow: answers.some((a) => a < 0) ? 'none' : '0 0 20px rgba(245,165,36,0.3)',
            cursor: answers.some((a) => a < 0) ? 'not-allowed' : 'pointer',
          }}
        >
          Nộp bài →
        </button>
      ) : (
        <div className="relative">
          <div
            className="hud-chamfer-md border p-5 space-y-2"
            style={{
              borderColor: score >= 80 ? 'rgba(109,255,176,0.4)' : 'rgba(126,231,255,0.25)',
              background: score >= 80 ? 'rgba(109,255,176,0.05)' : 'rgba(126,231,255,0.04)',
            }}
          >
            <div style={{ ...MONO, fontSize: 9, color: '#5c6886', marginBottom: 6 }}>// kết quả · result</div>
            <div className="flex items-center gap-3">
              <span
                className="text-2xl font-bold"
                style={{
                  background: score >= 80
                    ? 'linear-gradient(135deg, #6dffb0, #4dd2ff)'
                    : 'linear-gradient(135deg, #f5a524, #ffd27a)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {score}%
              </span>
              <div>
                <p className="font-semibold" style={{ color: score >= 80 ? '#6dffb0' : '#7ee7ff' }}>
                  {correctCount}/{questions.length} câu đúng
                </p>
                <p className="text-sm" style={{ color: '#9aa8c4' }}>
                  {score >= 80 ? 'Bạn đã nắm tốt nội dung.' : 'Hãy xem lại bài học và thử lại.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
