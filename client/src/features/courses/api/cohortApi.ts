import { getToken } from '@/features/auth/public'
import { getApiPathBase } from '@/lib/apiConfig'

const BASE = getApiPathBase()

function authHeaders(): HeadersInit {
  const token = getToken()
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`
  return h
}

export type CohortSummary = {
  _id?: string
  id?: string
  title: string
  slug: string
  startAt?: string
  endAt?: string
  timezone?: string
  status: string
  enrollmentOpen?: boolean
  inviteCode?: string
  studentCount?: number
}

export type MyCohortRow = {
  id: string
  title: string
  slug: string
  startAt?: string
  endAt?: string
  status?: string
  inviteEmailSent?: boolean
}

export type SyllabusLesson = {
  title: string
  slug: string
  type: string
  order: number
  moduleId?: string | null
  description?: string
  quizQuestionCount?: number
  meetingUrl?: string | null
  schedule: { openAt?: string | null; dueAt?: string | null; closeAt?: string | null }
  access: 'open' | 'locked' | 'closed'
}

export type SyllabusModule = {
  _id?: string
  title: string
  slug?: string
  icon?: string
  order?: number
  materials?: { id: string; label: string; kind: string; url: string }[]
}

export type ScheduleLessonRow = {
  slug: string
  title: string
  type: string
  moduleId?: string | null
  schedule: { openAt?: string | Date | null; dueAt?: string | Date | null; closeAt?: string | Date | null }
}

export type AssignmentSubmissionRow = {
  id: string
  userId: string
  lessonSlug: string
  lessonTitle: string
  status: string
  submittedAt?: string
  isLate?: boolean
  grade?: number | null
  feedback?: string
  files: { url: string; name: string }[]
  note?: string
}

export async function fetchCourseCohorts(slug: string) {
  const res = await fetch(`${BASE}/courses/${encodeURIComponent(slug)}/cohorts`)
  return res.json()
}

export async function fetchMyCohorts(slug: string) {
  const res = await fetch(`${BASE}/courses/${encodeURIComponent(slug)}/cohorts/my`, { headers: authHeaders() })
  return res.json()
}

export async function fetchCohortsManage(slug: string) {
  const res = await fetch(`${BASE}/courses/${encodeURIComponent(slug)}/cohorts/manage`, { headers: authHeaders() })
  return res.json()
}

export type JoinCohortResult = {
  success: boolean
  error?: string
  code?: string
  requiresPayment?: boolean
  courseSlug?: string
  courseId?: string
  amount?: number
  currency?: string
  data?: { cohortId?: string; slug?: string; title?: string }
}

export async function joinCohort(slug: string, inviteCode: string): Promise<JoinCohortResult> {
  const res = await fetch(`${BASE}/courses/${encodeURIComponent(slug)}/cohorts/join`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ inviteCode }),
  })
  return res.json()
}

export type EnrollCohortResult = {
  success: boolean
  error?: string
  code?: string
  requiresPayment?: boolean
  courseSlug?: string
  courseId?: string
  amount?: number
  currency?: string
  cohortId?: string
  data?: {
    cohortId?: string
    slug?: string
    title?: string
    inviteEmailSent?: boolean
    message?: string
  }
}

export async function enrollCohort(slug: string, cohortId: string): Promise<EnrollCohortResult> {
  const res = await fetch(`${BASE}/courses/${encodeURIComponent(slug)}/cohorts/enroll`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ cohortId }),
  })
  return res.json()
}

export async function fetchCohortSyllabus(slug: string, cohortId: string) {
  const res = await fetch(`${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/syllabus`, {
    headers: authHeaders(),
  })
  return res.json()
}

export async function createCohort(
  slug: string,
  body: { title: string; status?: string; timezone?: string },
) {
  const res = await fetch(`${BASE}/courses/${encodeURIComponent(slug)}/cohorts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function patchCohort(
  slug: string,
  cohortId: string,
  body: {
    status?: string
    title?: string
    timezone?: string
    startAt?: string | null
    endAt?: string | null
  },
) {
  const res = await fetch(`${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function fetchCohortSchedules(slug: string, cohortId: string) {
  const res = await fetch(
    `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/schedules`,
    { headers: authHeaders() },
  )
  return res.json()
}

export async function saveCohortSchedules(
  slug: string,
  cohortId: string,
  schedules: {
    lessonSlug: string
    openAt?: string | null
    dueAt?: string | null
    closeAt?: string | null
    openAtLocal?: string | null
    dueAtLocal?: string | null
    closeAtLocal?: string | null
  }[],
) {
  const res = await fetch(
    `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/schedules`,
    {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ schedules }),
    },
  )
  return res.json()
}

export async function fetchCohortSubmissions(slug: string, cohortId: string, status = 'submitted') {
  const res = await fetch(
    `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/submissions?status=${status}`,
    { headers: authHeaders() },
  )
  return res.json()
}

export async function gradeSubmission(
  slug: string,
  cohortId: string,
  submissionId: string,
  body: { grade?: number; feedback?: string },
) {
  const res = await fetch(
    `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/submissions/${submissionId}/grade`,
    {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ ...body, status: 'graded' }),
    },
  )
  return res.json()
}

export async function fetchCohortQuizAttempts(slug: string, cohortId: string) {
  const res = await fetch(
    `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/quiz-attempts`,
    { headers: authHeaders() },
  )
  return res.json()
}

/** datetime-local in a specific IANA timezone (GV nhập lịch theo lớp). */
export function isoToDatetimeLocalInTz(iso?: string | Date | null, timeZone = 'Asia/Ho_Chi_Minh'): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** datetime-local value from ISO (browser local) */
export function isoToDatetimeLocal(iso?: string | Date | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function datetimeLocalToIso(local: string): string | null {
  if (!local.trim()) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}
