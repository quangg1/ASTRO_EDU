import type { LessonItem, LessonRecallQuizItem } from '@/data/learningPathCurriculum'

/** Câu hỏi đã chuẩn hóa cho component học viên (chỉ từ Studio). */
export type RecallQuestion = {
  id: string
  question: string
  options: string[]
  correctIndex: number
  optionExplanations: string[]
}

/** Giữ thứ tự đáp án không rỗng; map `correctIndex` theo chỉ số gốc (0–3). */
function trimOptionsKeepCorrect(
  opts: string[],
  correctIndex: number,
  optionExplanations?: string[],
): { options: string[]; correctIndex: number; optionExplanations: string[] } | null {
  const pairs: { text: string; orig: number; reason: string }[] = []
  for (let i = 0; i < opts.length; i += 1) {
    const text = String(opts[i] ?? '').trim()
    if (!text) continue
    pairs.push({ text, orig: i, reason: String(optionExplanations?.[i] ?? '').trim() })
  }
  if (pairs.length < 3) return null
  const pos = pairs.findIndex((p) => p.orig === correctIndex)
  if (pos < 0) return null
  return {
    options: pairs.map((p) => p.text),
    correctIndex: pos,
    optionExplanations: pairs.map((p, idx) => p.reason || (idx === pos ? 'Đây là đáp án đúng theo nội dung bài học.' : 'Phương án này chưa đúng với nội dung bài học.')),
  }
}

/**
 * Chỉ dùng `lesson.recallQuiz` do Studio soạn — không sinh tự động.
 * Trả về 3–5 câu hợp lệ (mỗi câu ≥ 3 đáp án, có đúng một đáp án đúng).
 */
export function normalizeStudioRecallQuiz(lesson: LessonItem): RecallQuestion[] {
  const raw = lesson.recallQuiz
  if (!raw || !Array.isArray(raw) || raw.length < 3) return []

  const out: RecallQuestion[] = []
  for (let i = 0; i < Math.min(5, raw.length); i += 1) {
    const q = raw[i] as LessonRecallQuizItem
    const question = String(q?.question || '').trim()
    const rawOpts = Array.isArray(q?.options) ? q.options : []
    const mapped = trimOptionsKeepCorrect(rawOpts, Number(q?.correctIndex) || 0, Array.isArray(q?.optionExplanations) ? q.optionExplanations : [])
    if (!mapped || !question) continue
    out.push({
      id: String(q?.id || '').trim() || `rq-${lesson.id}-${i}`,
      question,
      options: mapped.options,
      correctIndex: mapped.correctIndex,
      optionExplanations: mapped.optionExplanations,
    })
  }
  return out.length >= 3 ? out : []
}
