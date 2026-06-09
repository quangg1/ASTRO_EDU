import { getToken } from '@/features/auth/public'
import { getApiPathBase } from '@/lib/apiConfig'
import { apiClientHeaders } from '@/lib/apiClientHeaders'

const BASE = getApiPathBase()

function authHeaders(): HeadersInit {
  return apiClientHeaders()
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
  price?: number
  currency?: string
  requiresPayment?: boolean
  catalogPrice?: number
  catalogCurrency?: string
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

export type LessonVisibilityIssue = 'course_draft' | 'empty_lesson' | 'no_quiz_questions'

export type ScheduleModuleRow = {
  id: string
  title: string
  order?: number
  deliveryWeek?: number | null
}

export type ScheduleLessonRow = {
  slug: string
  title: string
  type: string
  videoUrl?: string | null
  week?: number | null
  deliveryWeek?: number | null
  order?: number
  moduleId?: string | null
  moduleTitle?: string | null
  schedule: { openAt?: string | Date | null; dueAt?: string | Date | null; closeAt?: string | Date | null }
  visibilityIssues?: LessonVisibilityIssue[]
  scheduleWarning?: LessonVisibilityIssue | 'course_draft' | null
}

export type AssignmentSubmissionRow = {
  id: string
  userId: string
  studentName?: string
  lessonSlug: string
  lessonTitle: string
  status: string
  submittedAt?: string
  isLate?: boolean
  grade?: number | null
  feedback?: string
  gradedAt?: string
  files: { url: string; name: string }[]
  note?: string
}

export type CohortAnnouncementRow = {
  id: string
  title: string
  body: string
  pinned?: boolean
  notifyEmail?: boolean
  authorId?: string
  createdAt?: string
}

export type CohortUpcomingRow = {
  kind: 'opens' | 'due'
  at: string
  lessonSlug: string
  lessonTitle: string
  lessonType: string
  access: string
}

export type CohortProgressSummary = {
  completedLessons: number
  totalLessons: number
  percent: number
  pendingAssignments: number
  gradedAssignments: number
  submittedAssignments: number
  avgQuizScore: number | null
  quizAttemptCount: number
}

export type CohortHomeData = {
  cohort: { id: string; title: string; slug: string; timezone?: string; startAt?: string; endAt?: string }
  course: { slug: string; title: string }
  announcements: CohortAnnouncementRow[]
  upcoming: CohortUpcomingRow[]
  progress: CohortProgressSummary
  completedLessonSlugs?: string[]
  modules: SyllabusModule[]
  lessons: SyllabusLesson[]
}

export type LessonCellStatus = 'completed' | 'open' | 'locked' | 'missed'

export type CohortAtRiskReason = 'inactive' | 'low_quiz' | 'behind_week' | 'overdue_assignment'

export type CohortLessonColumn = {
  slug: string
  title: string
  type: string
  order?: number
  deliveryWeek?: number | null
}

export type CohortStudentAnalyticsRow = {
  userId: string
  displayName: string
  email?: string | null
  completedLessons: number
  totalLessons: number
  avgQuizScore: number | null
  pendingAssignments: number
  lastActiveAt: string | null
  atRisk: boolean
  atRiskReasons?: CohortAtRiskReason[]
  lessonStatus?: Record<string, LessonCellStatus>
}

export type CohortBehaviorLessonRow = {
  lessonSlug: string
  opens: number
  completions: number
  avgDwellSec: number
}

export type CohortBehaviorStudentRow = {
  userId: string
  displayName: string
  eventCount: number
  lessonsOpened: number
  dwellMinutes: number
  lastBehaviorAt: string | null
}

export type CohortAnalyticsData = {
  summary: {
    studentCount: number
    avgCompletionPct: number
    avgQuizScore: number | null
    pendingSubmissions: number
    atRiskCount: number
    currentDeliveryWeek?: number
  }
  lessonColumns?: CohortLessonColumn[]
  students: CohortStudentAnalyticsRow[]
  behavior?: {
    lessonEngagement: CohortBehaviorLessonRow[]
    studentActivity: CohortBehaviorStudentRow[]
    windowDays: number
  }
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

export async function fetchCohortHome(slug: string, cohortId: string) {
  const res = await fetch(
    `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/home`,
    { headers: authHeaders() },
  )
  return res.json() as Promise<{ success: boolean; data?: CohortHomeData; error?: string }>
}

export async function fetchCohortAnalytics(slug: string, cohortId: string) {
  const res = await fetch(
    `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/analytics`,
    { headers: authHeaders() },
  )
  return res.json() as Promise<{ success: boolean; data?: CohortAnalyticsData; error?: string }>
}

export async function fetchCohortDiscussion(slug: string, cohortId: string) {
  const res = await fetch(
    `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/discussion`,
    { headers: authHeaders() },
  )
  return res.json() as Promise<{ success: boolean; data?: { slug: string; title: string }; error?: string }>
}

export async function fetchCohortAnnouncements(slug: string, cohortId: string) {
  const res = await fetch(
    `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/announcements`,
    { headers: authHeaders() },
  )
  return res.json() as Promise<{ success: boolean; data?: CohortAnnouncementRow[]; error?: string }>
}

export async function createCohortAnnouncement(
  slug: string,
  cohortId: string,
  body: { title: string; body: string; pinned?: boolean; notifyEmail?: boolean },
) {
  const res = await fetch(
    `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/announcements`,
    { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) },
  )
  return res.json()
}

export async function deleteCohortAnnouncement(slug: string, cohortId: string, announcementId: string) {
  const res = await fetch(
    `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/announcements/${announcementId}`,
    { method: 'DELETE', headers: authHeaders() },
  )
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
    moduleWeekMap?: Record<string, number>
    price?: number | null
    currency?: string | null
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

export async function applyCohortWeeklySchedule(
  slug: string,
  cohortId: string,
  body: { week1OpenAtLocal: string; daysPerWeek?: number; setDueAndClose?: boolean },
) {
  const res = await fetch(
    `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/schedules/apply-weekly`,
    { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) },
  )
  return res.json() as Promise<{ success: boolean; message?: string; error?: string }>
}

export async function copyCohortScheduleFrom(
  slug: string,
  targetCohortId: string,
  sourceCohortId: string,
) {
  const res = await fetch(
    `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(targetCohortId)}/schedules/copy-from`,
    { method: 'POST', headers: authHeaders(), body: JSON.stringify({ sourceCohortId }) },
  )
  return res.json() as Promise<{ success: boolean; message?: string; error?: string }>
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
