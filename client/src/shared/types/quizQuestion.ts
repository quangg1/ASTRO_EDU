/**
 * Quiz SSOT — Course `quizQuestions` (assessment) + LP `recallQuiz` (mastery).
 */

export type QuizQuestionType = 'mcq' | 'true_false' | 'fill'

export type QuizOption = { text: string }

export type QuizQuestion = {
  id: string
  type: QuizQuestionType
  question: string
  options?: QuizOption[]
  answer: number | string | string[]
  explanation?: string
  /** LP mastery — giải thích từng phương án (theo thứ tự options sau trim) */
  optionExplanations?: string[]
}

export function newQuizQuestionId(prefix = 'qq'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function emptyMcqQuestion(prefix = 'qq', withExplanations = false): QuizQuestion {
  const q: QuizQuestion = {
    id: newQuizQuestionId(prefix),
    type: 'mcq',
    question: '',
    options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }],
    answer: 0,
  }
  if (withExplanations) {
    q.optionExplanations = ['', '', '', '']
  }
  return q
}

export function mcqAnswerIndex(q: QuizQuestion): number {
  if (q.type !== 'mcq') return 0
  const a = q.answer
  return typeof a === 'number' && Number.isFinite(a) ? Math.max(0, Math.floor(a)) : 0
}

export function mcqOptionTexts(q: QuizQuestion): string[] {
  return (q.options ?? []).map((o) => String(o?.text ?? ''))
}

export function patchMcqOption(q: QuizQuestion, index: number, text: string): QuizQuestion {
  const opts = [...(q.options ?? [])]
  while (opts.length <= index) opts.push({ text: '' })
  opts[index] = { text }
  return { ...q, options: opts }
}

export function patchMcqExplanation(q: QuizQuestion, index: number, text: string): QuizQuestion {
  const ex = [...(q.optionExplanations ?? [])]
  while (ex.length <= index) ex.push('')
  ex[index] = text
  return { ...q, optionExplanations: ex }
}

export function setMcqAnswer(q: QuizQuestion, index: number): QuizQuestion {
  return { ...q, type: 'mcq', answer: index }
}

export function isValidMcq(q: QuizQuestion, minFilledOptions = 3): boolean {
  const texts = mcqOptionTexts(q).map((t) => t.trim()).filter(Boolean)
  const ci = mcqAnswerIndex(q)
  const correct = String(mcqOptionTexts(q)[ci] ?? '').trim()
  return String(q.question ?? '').trim().length > 0 && texts.length >= minFilledOptions && correct.length > 0
}

export function normalizeQuizQuestion(
  raw: unknown,
  lessonId?: string,
  idx = 0,
): QuizQuestion | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const question = String(o.question ?? '').trim()
  if (!question) return null

  const typeRaw = String(o.type ?? 'mcq')
  const type: QuizQuestionType =
    typeRaw === 'true_false' || typeRaw === 'fill' ? typeRaw : 'mcq'

  let options: QuizOption[] = []
  if (Array.isArray(o.options)) {
    options = o.options.map((x) => {
      if (x && typeof x === 'object' && 'text' in (x as object)) {
        return { text: String((x as QuizOption).text ?? '') }
      }
      return { text: String(x ?? '') }
    })
  }

  const pairs = options
    .map((opt, orig) => ({ text: String(opt.text ?? '').trim(), orig }))
    .filter((p) => p.text)
  if (pairs.length < 3) return null

  const answerRaw = o.answer
  const answerNum =
    typeof answerRaw === 'number' && Number.isFinite(answerRaw)
      ? answerRaw
      : typeof answerRaw === 'string' && answerRaw !== ''
        ? Number(answerRaw)
        : 0
  const mappedIdx = pairs.findIndex((p) => p.orig === (Number.isFinite(answerNum) ? answerNum : 0))
  const answerIndex = mappedIdx >= 0 ? mappedIdx : 0

  const trimmedOptions = pairs.map((p) => ({ text: p.text }))
  const rawExpl = Array.isArray(o.optionExplanations)
    ? o.optionExplanations.map((e) => String(e ?? ''))
    : []
  const optionExplanations = trimmedOptions.map((_, i) => {
    const orig = pairs[i].orig
    const r = String(rawExpl[orig] ?? rawExpl[i] ?? '').trim()
    return (
      r ||
      (i === answerIndex
        ? 'Đây là đáp án đúng theo nội dung bài học.'
        : 'Phương án này chưa khớp với nội dung bài học.')
    )
  })

  return {
    id: String(o.id ?? '').trim() || newQuizQuestionId(`q-${lessonId ?? 'lesson'}-${idx}`),
    type,
    question,
    options: trimmedOptions,
    answer: answerIndex,
    explanation: o.explanation != null ? String(o.explanation) : undefined,
    optionExplanations: rawExpl.length || type === 'mcq' ? optionExplanations : undefined,
  }
}

export function normalizeQuizList(
  raw: unknown,
  lessonId?: string,
  opts?: { minCount?: number; maxCount?: number },
): QuizQuestion[] {
  if (!Array.isArray(raw)) return []
  const max = opts?.maxCount ?? 20
  const min = opts?.minCount ?? 0
  const out: QuizQuestion[] = []
  for (let i = 0; i < Math.min(max, raw.length); i += 1) {
    const q = normalizeQuizQuestion(raw[i], lessonId, i)
    if (q) out.push(q)
  }
  return out.length >= min ? out : []
}
