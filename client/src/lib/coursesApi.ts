import { getToken } from './authApi'
import { getApiPathBase, getMediaBase } from './apiConfig'

const COURSES_BASE = getApiPathBase()
const MEDIA_BASE = getMediaBase()

function authHeaders(): HeadersInit {
  const token = getToken()
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`
  return h
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
}

export interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
}

export interface ResourceLink {
  label: string
  url: string
  kind: 'video' | 'article' | 'model' | 'other'
}

export interface CourseModule {
  _id?: string
  title: string
  slug: string
  description?: string
  icon?: string
  order: number
}

export interface Lesson {
  title: string
  slug: string
  description: string
  type: 'text' | 'visualization' | 'quiz'
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
  isPaid?: boolean
  modules?: CourseModule[]
  lessonCount?: number
  lessons?: Lesson[]
  enrollment?: {
    enrolledAt: string
    progress: { lessonSlug: string; completed: boolean; completedAt: string | null }[]
  } | null
  published?: boolean
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

export async function fetchCourses(search?: string): Promise<Course[]> {
  const url = search?.trim() ? `${COURSES_BASE}/courses?q=${encodeURIComponent(search.trim())}` : `${COURSES_BASE}/courses`
  const res = await fetch(url, { headers: authHeaders() })
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return data.data
  return []
}

/** Danh sách khóa học cho Studio (teacher/admin), gồm cả chưa publish */
export async function fetchCoursesForEditor(): Promise<Course[]> {
  const res = await fetch(`${COURSES_BASE}/courses/editor/list`, { headers: authHeaders() })
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return data.data
  return []
}

export async function fetchCourse(slug: string): Promise<Course | null> {
  const res = await fetch(`${COURSES_BASE}/courses/${encodeURIComponent(slug)}`, {
    headers: authHeaders(),
  })
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

export async function uploadMedia(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
  const form = new FormData()
  form.append('file', file)
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${MEDIA_BASE}/upload`, { method: 'POST', headers, body: form })
  const data = await res.json()
  if (data.success && data.url) return { success: true, url: data.url }
  return { success: false, error: data.error || 'Upload failed' }
}

export async function fetchCourseForEditor(slug: string): Promise<Course | null> {
  const res = await fetch(`${COURSES_BASE}/courses/${encodeURIComponent(slug)}/editor`, {
    headers: authHeaders(),
  })
  const data = await res.json()
  if (data.success && data.data) return data.data
  return null
}

export async function saveCourseFromEditor(
  slug: string,
  payload: Partial<Course> & { lessons?: Lesson[] }
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
