'use client'

import { useCallback } from 'react'
import type { QuizQuestion } from '@/shared/types/quizQuestion'
import {
  emptyMcqQuestion,
  isValidMcq,
  mcqAnswerIndex,
  mcqOptionTexts,
  patchMcqExplanation,
  patchMcqOption,
  setMcqAnswer,
} from '@/shared/types/quizQuestion'
import { Plus, Trash2, ClipboardList, Sparkles } from 'lucide-react'

type Props = {
  lessonId: string
  recallQuiz: QuizQuestion[] | undefined
  onChange: (next: QuizQuestion[] | undefined) => void
  onAutoGenerate: () => void
  generating: boolean
  generateError?: string | null
}

export function LearningPathRecallQuizEditor({
  lessonId,
  recallQuiz,
  onChange,
  onAutoGenerate,
  generating,
  generateError,
}: Props) {
  const items = recallQuiz && recallQuiz.length > 0 ? recallQuiz : []

  const setItems = useCallback(
    (next: QuizQuestion[]) => {
      onChange(next.length ? next : undefined)
    },
    [onChange],
  )

  const patchItem = (index: number, patch: Partial<QuizQuestion>) => {
    const base = items.length ? [...items] : [emptyMcqQuestion('recall', true), emptyMcqQuestion('recall', true), emptyMcqQuestion('recall', true)]
    base[index] = { ...base[index], ...patch }
    setItems(base)
  }

  const patchOption = (qIndex: number, optIndex: number, value: string) => {
    const base = [...items]
    base[qIndex] = patchMcqOption(base[qIndex], optIndex, value)
    setItems(base)
  }

  const patchOptionExplanation = (qIndex: number, optIndex: number, value: string) => {
    const base = [...items]
    base[qIndex] = patchMcqExplanation(base[qIndex], optIndex, value)
    setItems(base)
  }

  const addQuestion = () => {
    if (items.length >= 5) return
    if (items.length === 0) {
      seedThree()
      return
    }
    setItems([...items, emptyMcqQuestion('recall', true)])
  }

  const removeQuestion = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const seedThree = () => {
    setItems([emptyMcqQuestion('recall', true), emptyMcqQuestion('recall', true), emptyMcqQuestion('recall', true)])
  }

  const validCount = items.filter((q) => isValidMcq(q, 3)).length

  return (
    <div className="border-t border-violet-500/15 bg-ds-surface p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-violet-200">
            <ClipboardList className="w-4 h-4 shrink-0" />
            <h3 className="text-sm font-semibold">Kiểm tra nhanh (mastery)</h3>
          </div>
          <p className="text-xs text-ds-subtle mt-1 max-w-xl">
            Soạn 3–5 câu trắc nghiệm; học viên phải làm đúng hết để đạt trạng thái <strong className="text-violet-300">Đã nắm</strong>. Không có
            quiz thì bài không bắt kiểm tra — chỉ đánh dấu đã đọc.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAutoGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ds-accent-strong bg-ds-accent-soft px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-ds-accent-strong disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {generating ? 'Đang sinh quiz...' : 'Sinh tự động bằng AI'}
          </button>
          <button
            type="button"
            onClick={seedThree}
            className="rounded-lg border border-ds-border-strong bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
          >
            Khung 3 câu
          </button>
          <button
            type="button"
            onClick={addQuestion}
            disabled={items.length >= 5}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/35 bg-violet-500/15 px-3 py-1.5 text-xs font-medium text-violet-100 hover:bg-violet-500/25 disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm câu ({items.length}/5)
          </button>
        </div>
      </div>

      <p className="text-[11px] rounded-lg border border-ds-border bg-black/30 px-3 py-2 text-ds-muted">
        Hợp lệ: <span className="text-ds-accent tabular-nums">{validCount}</span> / {items.length} câu (mỗi câu cần đủ đáp án và chọn đúng một phương án đúng).
      </p>
      {generateError ? (
        <p className="text-[11px] rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-rose-200">{generateError}</p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-ds-subtle rounded-xl border border-dashed border-ds-border bg-black/20 px-4 py-6 text-center">
          Chưa có câu nào. Bấm <strong className="text-violet-300">Khung 3 câu</strong> để soạn mastery quiz (tối thiểu 3 câu hợp lệ trên học viên).
        </p>
      ) : (
      <div className="space-y-5">
        {items.map((q, qi) => {
          const answerIdx = mcqAnswerIndex(q)
          const optionTexts = mcqOptionTexts(q)
          return (
          <div
            key={q.id || `q-${qi}`}
            className="rounded-2xl border border-ds-border bg-ds-overlay p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-mono text-ds-subtle">Câu {qi + 1}</span>
              {items.length > 3 ? (
                <button
                  type="button"
                  onClick={() => removeQuestion(qi)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-500/25 px-2 py-1 text-[11px] text-red-300/90 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3 h-3" />
                  Xóa
                </button>
              ) : null}
            </div>
            <label className="block text-xs text-ds-muted mb-2">
              Câu hỏi
              <textarea
                value={q.question}
                onChange={(e) => patchItem(qi, { question: e.target.value })}
                rows={2}
                className={`mt-1 min-h-[3rem] resize-y studio-field`}
                placeholder="Ví dụ: Điều nào đúng về …?"
              />
            </label>
            <p className="text-[11px] text-ds-subtle mb-2">Đáp án (tối thiểu 3 dòng có nội dung) — chọn đáp án đúng:</p>
            <div className="space-y-2">
              {[0, 1, 2, 3].map((oi) => (
                <div key={`${qi}-opt-${oi}`} className="rounded-lg border border-ds-border bg-black/20 p-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`rq-correct-${lessonId}-${qi}`}
                      checked={answerIdx === oi}
                      onChange={() => patchItem(qi, setMcqAnswer(q, oi))}
                      className="h-4 w-4 accent-violet-500 shrink-0"
                      title="Đáp án đúng"
                    />
                    <span className="w-6 text-center text-[10px] font-mono text-slate-600 shrink-0">{String.fromCharCode(65 + oi)}</span>
                    <input
                      value={optionTexts[oi] || ''}
                      onChange={(e) => patchOption(qi, oi, e.target.value)}
                      className={`flex-1 studio-field`}
                      placeholder={`Phương án ${String.fromCharCode(65 + oi)}`}
                    />
                  </div>
                  <textarea
                    value={(q.optionExplanations && q.optionExplanations[oi]) || ''}
                    onChange={(e) => patchOptionExplanation(qi, oi, e.target.value)}
                    rows={2}
                    className={`mt-2 min-h-[2.8rem] resize-y studio-field`}
                    placeholder={`Giải thích cho phương án ${String.fromCharCode(65 + oi)} (${answerIdx === oi ? 'đúng' : 'sai'})`}
                  />
                </div>
              ))}
            </div>
          </div>
        )})}
      </div>
      )}
    </div>
  )
}
