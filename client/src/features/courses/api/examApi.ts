import { getApiPathBase } from '@/lib/apiConfig'
import { apiClientHeaders, apiFetchInit } from '@/lib/apiClientHeaders'

const BASE = getApiPathBase()

function authHeaders(): HeadersInit {
  return apiClientHeaders()
}

export type QuizRevealMode = 'after_submit' | 'after_each_question' | 'never'

export type ExamQuestionClient = {
  id: string
  type: string
  question: string
  options: { text: string }[]
}

export type QuizSettings = {
  revealMode: QuizRevealMode
  timeLimitMinutes?: number | null
  maxAttempts?: number | null
  shuffleOptions?: boolean
  passingScorePct?: number | null
}

export type ExamSession = {
  courseSlug: string
  lessonSlug: string
  lessonTitle: string
  cohortId: string | null
  settings: QuizSettings
  questions: ExamQuestionClient[]
  questionCount: number
}

function examBase(slug: string, lessonSlug: string, cohortId?: string | null) {
  if (cohortId) {
    return `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/exam/${encodeURIComponent(lessonSlug)}`
  }
  return `${BASE}/courses/${encodeURIComponent(slug)}/exam/${encodeURIComponent(lessonSlug)}`
}

export async function fetchExamSession(
  slug: string,
  lessonSlug: string,
  cohortId?: string | null,
): Promise<{ success: boolean; data?: ExamSession; error?: string }> {
  const res = await fetch(`${examBase(slug, lessonSlug, cohortId)}/session`, apiFetchInit({ headers: authHeaders() }))
  const json = await res.json()
  if (json.success && json.data) return { success: true, data: json.data as ExamSession }
  return { success: false, error: json.error || 'Không tải được bài thi' }
}

export async function fetchActiveExamAttempt(
  slug: string,
  lessonSlug: string,
  cohortId?: string | null,
) {
  const res = await fetch(`${examBase(slug, lessonSlug, cohortId)}/attempts/active`, apiFetchInit({ headers: authHeaders() }))
  return res.json()
}

export async function startExamAttempt(slug: string, lessonSlug: string, cohortId?: string | null) {
  const res = await fetch(`${examBase(slug, lessonSlug, cohortId)}/attempts`, apiFetchInit({
    method: 'POST',
    headers: authHeaders(),
  }))
  return res.json()
}

export async function checkpointExamAttempt(
  slug: string,
  lessonSlug: string,
  attemptId: string,
  body: { answers: Record<string, number>; revision: number },
  cohortId?: string | null,
) {
  const res = await fetch(`${examBase(slug, lessonSlug, cohortId)}/attempts/${attemptId}/checkpoint`, apiFetchInit({
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  }))
  return res.json()
}

export async function submitExamAttempt(
  slug: string,
  lessonSlug: string,
  attemptId: string,
  answers: Record<string, number>,
  cohortId?: string | null,
) {
  const res = await fetch(`${examBase(slug, lessonSlug, cohortId)}/attempts/${attemptId}/submit`, apiFetchInit({
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ answers }),
  }))
  return res.json()
}

export async function confirmExamQuestion(
  slug: string,
  lessonSlug: string,
  attemptId: string,
  questionId: string,
  answer: number,
  cohortId?: string | null,
) {
  const res = await fetch(`${examBase(slug, lessonSlug, cohortId)}/attempts/${attemptId}/confirm-question`, apiFetchInit({
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ questionId, answer }),
  }))
  return res.json()
}
