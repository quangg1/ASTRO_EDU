import { parseCourseEditorListResponse } from '@galaxies/contracts'
import { getToken } from '@/features/auth/public'
import { apiClientHeaders } from '@/lib/apiClientHeaders'
import { getApiPathBase, getUploadBase } from '@/lib/apiConfig'
import type { QuizQuestion } from '@/shared/types/quizQuestion'
import type { VideoTranscript } from '@/features/courses/lib/videoTranscript'

export type { QuizQuestion }

const COURSES_BASE = getApiPathBase()

function authHeaders(): HeadersInit {
  return apiClientHeaders()
}

export type SectionType = 'richtext' | 'text' | 'image' | 'video' | 'code' | 'embed' | '3d' | 'callout' | 'divider' | 'gif' | 'math' | 'chart' | 'slider' | 'observable'

export interface LessonSection {
  type: SectionType
  sectionLevel?: 'main' | 'sub'
  title?: string
  summary?: string
  bullets?: string[]
  content?: string
  html?: string
  imageUrl?: string | null
  imageWidthPct?: number
  videoUrl?: string | null
  code?: string
  language?: string
  embedUrl?: string | null
  embedType?: 'iframe' | 'canva' | 'gslides' | 'figma' | 'other'
  modelUrl?: string | null
  calloutVariant?: 'info' | 'warning' | 'tip' | 'danger'
  caption?: string
  latex?: string
  chartType?: 'line' | 'bar' | 'area' | 'pie'
  chartData?: Array<{ name?: string; value?: number; x?: number | string; y?: number }>
  sliderMin?: number
  sliderMax?: number
  sliderStep?: number
  sliderFormula?: string
  sliderLabel?: string
  sliderUnit?: string
  notebookUrl?: string | null
  videoTranscript?: VideoTranscript | null
}

export interface ResourceLink {
  label: string
  url: string
  kind: 'video' | 'article' | 'model' | 'other'
}

export interface ModuleMaterial {
  id: string
  label: string
  kind: 'pdf' | 'slides' | 'link' | 'video'
  url: string
  uploadedAt?: string | null
}

export type CourseDeliveryContext =
  | { mode: 'catalog' }
  | { mode: 'cohort'; cohortId: string; cohortIds?: string[] }
  | { mode: 'editor' }

export interface QuizSettings {
  revealMode?: 'after_submit' | 'after_each_question' | 'never'
  timeLimitMinutes?: number | null
  maxAttempts?: number | null
  shuffleOptions?: boolean
  passingScorePct?: number | null
}

export interface CourseModule {
  _id?: string
  title: string
  slug: string
  description?: string
  icon?: string
  order: number
  materials?: ModuleMaterial[]
}

/** `GET /courses/:slug?outline=1` — không có payload đầy đủ của bài */
export interface CourseLessonOutline {
  title: string
  slug: string
  description?: string
  type: 'text' | 'visualization' | 'quiz' | 'assignment' | 'live_session'
  order: number
  moduleId?: string | null
  week?: number | null
  visualizationId?: string | null
  quizQuestionCount: number
  sectionCount: number
}

export interface Lesson {
  title: string
  slug: string
  description: string
  type: 'text' | 'visualization' | 'quiz' | 'assignment' | 'live_session'
  visualizationId: string | null
  stageTime?: number | null
  videoUrl?: string | null
  coverImage?: string | null
  galleryImages?: string[]
  week?: number | null
  moduleId?: string | null
  content: string
  /** Mục tiêu học tập */
  learningGoals?: string[]
  /** Các block: text, image, video */
  sections?: LessonSection[]
  /** Câu hỏi quiz (cho type quiz) */
  quizQuestions?: QuizQuestion[]
  quizSettings?: QuizSettings | null
  assignmentSettings?: { maxFiles?: number; maxBytesPerFile?: number } | null
  meetingUrl?: string | null
  liveScheduledAt?: string | null
  /** Tài nguyên bổ sung */
  resourceLinks?: ResourceLink[]
  /** Metadata nguồn PDF */
  sourcePdf?: string | null
  sourcePageCount?: number | null
  order: number
}

export interface Course {
  id: string
  title: string
  slug: string
  description: string
  thumbnail: string | null
  level: string
  durationWeeks?: number | null
  price?: number
  currency?: string
  cohortPrice?: number | null
  cohortCurrency?: string | null
  isPaid?: boolean
  /** Catalog self-paced enroll; false = chỉ cohort */
  catalogEnabled?: boolean
  /** self_paced | instructor_led | hybrid */
  distributionStrategy?: 'self_paced' | 'instructor_led' | 'hybrid'
  published?: boolean
  /** true when GV/admin xem khóa chưa publish */
  editorPreview?: boolean
  /** Server: GV/admin — bypass paywall + full quiz for preview */
  staffAccess?: boolean
  /** Server-computed: isPaid && price > 0 */
  requiresPayment?: boolean
  modules?: CourseModule[]
  lessonCount?: number
  lessons?: Array<Lesson | CourseLessonOutline>
  outlineOnly?: boolean
  paywalledLessonBodies?: boolean
  crossSellTutorialHref?: string
  crossSellTutorialLabelVi?: string
  crossSellTutorialBodyVi?: string
  enrollment?: {
    enrolledAt: string
    progress: { lessonSlug: string; completed: boolean; completedAt: string | null }[]
  } | null
  /** Server: catalog vs cohort delivery — cohort wins when user is in a class */
  deliveryContext?: CourseDeliveryContext
  teacherId?: string | null
  teacher?: {
    userId: string
    fullName: string
    headline: string
    bio: string
    organization: string
    expertise: string[]
    education: string
    yearsExperience: number | null
    website: string
    linkedin: string
    avatarUrl: string | null
    email: string | null
    verified: boolean
  } | null
}

/** Payload đầy đủ lesson từ GET /courses/:slug/editor (Studio); khác catalogue `Course.lessons` union */
export type CourseEditorPayload = Omit<Course, 'lessons' | 'modules'> & {
  modules: CourseModule[]
  lessons: Lesson[]
}

export interface MyCourse {
  id: string
  courseId: string
  title: string
  slug: string
  description: string
  thumbnail: string | null
  level: string
  lessonCount: number
  enrolledAt: string
  progress: { lessonSlug: string; completed: boolean; completedAt: string | null }[]
  completedCount: number
  totalLessons: number
  percentComplete: number
}

export async function fetchMyCourses(): Promise<MyCourse[]> {
  const res = await fetch(`${COURSES_BASE}/courses/my`, { headers: authHeaders() })
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return data.data
  return []
}

export type FetchCoursesOpts = {
  search?: string
  level?: 'beginner' | 'intermediate' | 'advanced' | ''
  pricing?: '' | 'free' | 'paid'
}

export async function fetchCourses(filters?: string | FetchCoursesOpts): Promise<Course[]> {
  try {
    const opts: FetchCoursesOpts = typeof filters === 'string' ? { search: filters } : filters ?? {}
    const qs = new URLSearchParams()
    if (opts.search?.trim()) qs.set('q', opts.search.trim())
    if (opts.level && ['beginner', 'intermediate', 'advanced'].includes(opts.level)) qs.set('level', opts.level)
    if (opts.pricing === 'free' || opts.pricing === 'paid') qs.set('pricing', opts.pricing)
    const suffix = qs.toString()
    const url = suffix ? `${COURSES_BASE}/courses?${suffix}` : `${COURSES_BASE}/courses`
    const res = await fetch(url, { headers: authHeaders() })
    const data = await res.json()
    if (data.success && Array.isArray(data.data)) return data.data
    return []
  } catch {
    return []
  }
}

/** Landing outline (client) — có auth để GV xem khóa nháp (Studio Student View). */
export async function fetchCourseOutline(
  slug: string,
): Promise<{ course: Course | null; error?: string }> {
  const res = await fetch(`${COURSES_BASE}/courses/${encodeURIComponent(slug)}?outline=1`, {
    headers: authHeaders(),
    cache: 'no-store',
  })
  const data = await res.json()
  if (data.success && data.data) return { course: data.data }
  return { course: null, error: data.error || (res.status === 401 ? 'Phiên đăng nhập hết hạn' : undefined) }
}

/** Danh sách khóa học cho Studio (teacher/admin), gồm cả chưa publish */
export async function fetchCoursesForEditor(): Promise<Course[]> {
  const res = await fetch(`${COURSES_BASE}/courses/editor/list`, { headers: authHeaders() })
  const data = await res.json()
  if (!data?.success) return []
  try {
    return parseCourseEditorListResponse(data) as Course[]
  } catch {
    return []
  }
}

export type CourseEditorTeacherOption = {
  id: string
  email: string | null
  displayName: string
  fullName: string
  headline: string
}

/** Admin Studio — chọn giảng viên hiển thị trên trang khóa học */
export async function fetchTeachersForCourseEditor(): Promise<CourseEditorTeacherOption[]> {
  const res = await fetch(`${COURSES_BASE}/courses/editor/teachers`, { headers: authHeaders() })
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return data.data
  return []
}

export async function fetchCourse(slug: string): Promise<Course | null> {
  const res = await fetch(`${COURSES_BASE}/courses/${encodeURIComponent(slug)}`, {
    headers: authHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.success && data.data) return data.data
  return null
}

export async function enrollCourse(slug: string): Promise<{
  success: boolean
  error?: string
  requiresPayment?: boolean
  courseId?: string
  courseSlug?: string
  amount?: number
  currency?: string
}> {
  const res = await fetch(`${COURSES_BASE}/courses/${encodeURIComponent(slug)}/enroll`, {
    method: 'POST',
    headers: authHeaders(),
  })
  const data = await res.json()
  if (data.success) return { success: true }
  return {
    success: false,
    error: data.error || 'Đăng ký khóa học thất bại',
    requiresPayment: data.requiresPayment,
    courseId: data.courseId,
    courseSlug: data.courseSlug,
    amount: data.amount,
    currency: data.currency,
  }
}

export async function updateLessonProgress(
  slug: string,
  lessonSlug: string,
  completed: boolean
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${COURSES_BASE}/courses/${encodeURIComponent(slug)}/progress`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ lessonSlug, completed }),
  })
  const data = await res.json()
  if (data.success) return { success: true }
  return { success: false, error: data.error || 'Cập nhật thất bại' }
}

export type MediaUploadPurpose =
  | 'course-thumbnail'
  | 'course-lesson'
  | 'course-block'
  | 'course-module-material'
  | 'assignment-staging'
  | 'showcase-entity'
  | 'learning-path-lesson'
  | 'generic'

/** Metadata gửi kèm upload — API map sang key S3 có cấu trúc (vd. `courses/{id}/thumbnail.jpg`). */
export interface UploadMediaContext {
  purpose: MediaUploadPurpose
  /** Mongo id hoặc id ổn định của entity */
  entityId?: string
  /** Fallback khi chưa có entityId (vd. slug khóa học) */
  slug?: string
  lessonSlug?: string
  /** Tên field semantic: thumbnail, cover, diffuse, blocks/image-0, … */
  variant?: string
}

function appendUploadContext(form: FormData, context?: UploadMediaContext) {
  if (!context?.purpose || context.purpose === 'generic') return
  form.append('purpose', context.purpose)
  if (context.entityId) form.append('entityId', context.entityId)
  if (context.slug) form.append('slug', context.slug)
  if (context.lessonSlug) form.append('lessonSlug', context.lessonSlug)
  if (context.variant) form.append('variant', context.variant)
}

export async function uploadMedia(
  file: File,
  context?: UploadMediaContext,
): Promise<{ success: boolean; url?: string; storageKey?: string; error?: string }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
  const form = new FormData()
  form.append('file', file)
  appendUploadContext(form, context)
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  let uploadBase = ''
  try {
    uploadBase = getUploadBase()
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Upload failed' }
  }

  try {
    const res = await fetch(`${uploadBase}/upload`, { method: 'POST', headers, body: form })
    let data: { success?: boolean; url?: string; storageKey?: string; error?: string }
    try {
      data = (await res.json()) as typeof data
    } catch {
      return {
        success: false,
        error: res.ok ? 'Phản hồi upload không hợp lệ' : `Upload thất bại (HTTP ${res.status})`,
      }
    }
    if (data.success && data.url) {
      return { success: true, url: data.url, storageKey: data.storageKey }
    }
    return { success: false, error: data.error || 'Upload failed' }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Upload failed' }
  }
}

export async function fetchCourseForEditor(slug: string): Promise<CourseEditorPayload | null> {
  try {
    const res = await fetch(`${COURSES_BASE}/courses/${encodeURIComponent(slug)}/editor`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    if (!res.ok || res.status === 304) return null
    const data = await res.json()
    if (data.success && data.data) return data.data as CourseEditorPayload
    return null
  } catch {
    return null
  }
}

export async function saveCourseFromEditor(
  slug: string,
  payload: Partial<Course> & {
    lessons?: Lesson[]
    crossSellTutorialHref?: string
    crossSellTutorialLabelVi?: string
    crossSellTutorialBodyVi?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${COURSES_BASE}/courses/${encodeURIComponent(slug)}/editor`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (data.success) return { success: true }
  return { success: false, error: data.error || 'Lưu khóa học thất bại' }
}

export async function createCourse(title: string, slug?: string): Promise<{ success: boolean; slug?: string; error?: string }> {
  const res = await fetch(`${COURSES_BASE}/courses`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ title: title.trim(), slug: slug?.trim() || undefined }),
  })
  const data = await res.json()
  if (data.success && data.data?.slug) return { success: true, slug: data.data.slug }
  return { success: false, error: data.error || 'Tạo khóa học thất bại' }
}
