'use client'

import { useCallback } from 'react'
import type { LessonRecallQuizItem } from '@/data/learningPathCurriculum'
import { Plus, Trash2, ClipboardList, Sparkles } from 'lucide-react'

type Props = {
  lessonId: string
  recallQuiz: LessonRecallQuizItem[] | undefined
  onChange: (next: LessonRecallQuizItem[] | undefined) => void
  onAutoGenerate: () => void
  generating: boolean
  generateError?: string | null
  inputCls: string
}

const emptyQuestion = (idx: number): LessonRecallQuizItem => ({
  id: `quiz-${idx}-${Math.random().toString(36).slice(2, 8)}`,
  question: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  optionExplanations: ['', '', '', ''],
})

export function LearningPathRecallQuizEditor({
  lessonId,
  recallQuiz,
  onChange,
  onAutoGenerate,
  generating,
  generateError,
  inputCls,
}: Props) {
  const items = recallQuiz && recallQuiz.length > 0 ? recallQuiz : []

  const setItems = useCallback(
    (next: LessonRecallQuizItem[]) => {
      onChange(next.length ? next : undefined)
    },
    [onChange],
  )

  const patchItem = (index: number, patch: Partial<LessonRecallQuizItem>) => {
    const base = items.length ? [...items] : [emptyQuestion(0), emptyQuestion(1), emptyQuestion(2)]
    const row = { ...base[index], ...patch }
    base[index] = row
    setItems(base)
  }

  const patchOption = (qIndex: number, optIndex: number, value: string) => {
    const base = [...items]
    const row = { ...base[qIndex] }
    const opts = [...(row.options || [])]
    while (opts.length < 4) opts.push('')
    opts[optIndex] = value
    row.options = opts
    base[qIndex] = row
    setItems(base)
  }

  const patchOptionExplanation = (qIndex: number, optIndex: number, value: string) => {
    const base = [...items]
    const row = { ...base[qIndex] }
    const exps = [...(row.optionExplanations || [])]
    while (exps.length < 4) exps.push('')
    exps[optIndex] = value
    row.optionExplanations = exps
    base[qIndex] = row
    setItems(base)
  }

  const addQuestion = () => {
    if (items.length >= 5) return
    if (items.length === 0) {
      seedThree()
      return
    }
    setItems([...items, emptyQuestion(items.length)])
  }

  const removeQuestion = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const seedThree = () => {
    setItems([emptyQuestion(0), emptyQuestion(1), emptyQuestion(2)])
  }

  const validCount = items.filter((q) => {
    const qn = String(q.question || '').trim()
    const raw = q.options || []
    const nonEmpty = raw.map((o) => String(o || '').trim()).filter(Boolean)
    const ci = Number(q.correctIndex)
    const correctSlot = String(raw[ci] ?? '').trim()
    return qn.length > 0 && nonEmpty.length >= 3 && correctSlot.length > 0
  }).length

  return (
    <div className="border-t border-violet-500/15 bg-[#060a12] p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-violet-200">
            <ClipboardList className="w-4 h-4 shrink-0" />
            <h3 className="text-sm font-semibold">Kiểm tra nhanh (mastery)</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Soạn 3–5 câu trắc nghiệm; học viên phải làm đúng hết để đạt trạng thái <strong className="text-violet-300">Đã nắm</strong>. Không có
            quiz thì bài không bắt kiểm tra — chỉ đánh dấu đã đọc.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAutoGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {generating ? 'Đang sinh quiz...' : 'Sinh tự động bằng AI'}
          </button>
          <button
            type="button"
            onClick={seedThree}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
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

      <p className="text-[11px] rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-400">
        Hợp lệ: <span className="text-cyan-300 tabular-nums">{validCount}</span> / {items.length} câu (mỗi câu cần đủ đáp án và chọn đúng một phương án đúng).
      </p>
      {generateError ? (
        <p className="text-[11px] rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-rose-200">{generateError}</p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center">
          Chưa có câu nào. Bấm <strong className="text-violet-300">Khung 3 câu</strong> để soạn mastery quiz (tối thiểu 3 câu hợp lệ trên học viên).
        </p>
      ) : (
      <div className="space-y-5">
        {items.map((q, qi) => (
          <div
            key={q.id || `q-${qi}`}
            className="rounded-2xl border border-white/10 bg-[#0a1018]/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-mono text-slate-500">Câu {qi + 1}</span>
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
            <label className="block text-xs text-slate-400 mb-2">
              Câu hỏi
              <textarea
                value={q.question}
                onChange={(e) => patchItem(qi, { question: e.target.value })}
                rows={2}
                className={`mt-1 min-h-[3rem] resize-y ${inputCls}`}
                placeholder="Ví dụ: Điều nào đúng về …?"
              />
            </label>
            <p className="text-[11px] text-slate-500 mb-2">Đáp án (tối thiểu 3 dòng có nội dung) — chọn đáp án đúng:</p>
            <div className="space-y-2">
              {[0, 1, 2, 3].map((oi) => (
                <div key={`${qi}-opt-${oi}`} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`rq-correct-${lessonId}-${qi}`}
                      checked={q.correctIndex === oi}
                      onChange={() => patchItem(qi, { correctIndex: oi })}
                      className="h-4 w-4 accent-violet-500 shrink-0"
                      title="Đáp án đúng"
                    />
                    <span className="w-6 text-center text-[10px] font-mono text-slate-600 shrink-0">{String.fromCharCode(65 + oi)}</span>
                    <input
                      value={(q.options && q.options[oi]) || ''}
                      onChange={(e) => patchOption(qi, oi, e.target.value)}
                      className={`flex-1 ${inputCls}`}
                      placeholder={`Phương án ${String.fromCharCode(65 + oi)}`}
                    />
                  </div>
                  <textarea
                    value={(q.optionExplanations && q.optionExplanations[oi]) || ''}
                    onChange={(e) => patchOptionExplanation(qi, oi, e.target.value)}
                    rows={2}
                    className={`mt-2 min-h-[2.8rem] resize-y ${inputCls}`}
                    placeholder={`Giải thích cho phương án ${String.fromCharCode(65 + oi)} (${q.correctIndex === oi ? 'đúng' : 'sai'})`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
