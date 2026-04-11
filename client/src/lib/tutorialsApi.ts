import { getApiPathBase } from './apiConfig'
const API = `${getApiPathBase()}/tutorials`

export interface TutorialCategory {
  _id: string
  title: string
  slug: string
  description?: string
  icon?: string
  order: number
}

export interface TutorialSection {
  type: string
  title?: string
  content?: string
  html?: string
  imageUrl?: string | null
  videoUrl?: string | null
  code?: string
  language?: string
  calloutVariant?: string
  caption?: string
  latex?: string
  chartType?: string
  chartData?: unknown[]
}

export interface Tutorial {
  _id: string
  title: string
  slug: string
  summary: string
  categoryId: string | null
  category?: { id: string; title: string; slug: string } | null
  readTime: number
  tags: string[]
  sections: TutorialSection[]
  relatedSlugs: string[]
  published: boolean
  order: number
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  prerequisites?: string[]
  learningObjectives?: string[]
}

export interface TutorialTrackItem {
  title: string
  tutorialSlug: string
  description?: string
  order: number
}

export interface TutorialTrackItem {
  title: string
  tutorialSlug: string
  description?: string
  order: number
}

export interface TutorialTrackSubtopic {
  title: string
  description?: string
  order: number
  items: TutorialTrackItem[]
}

export interface TutorialTrackTopic {
  title: string
  description?: string
  order: number
  subtopics: TutorialTrackSubtopic[]
}

export interface TutorialTrack {
  _id: string
  title: string
  slug: string
  description?: string
  icon?: string
  level: number
  order: number
  topics: TutorialTrackTopic[]
}

// legacy names kept for backwards compatibility in components
export interface TutorialTrackSection extends TutorialTrackTopic {
  items: TutorialTrackItem[]
}

export async function fetchTutorialCategories(): Promise<TutorialCategory[]> {
  const res = await fetch(`${API}/categories`)
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return data.data
  return []
}

export async function fetchTutorials(categoryId?: string, search?: string): Promise<Tutorial[]> {
  const params = new URLSearchParams()
  if (categoryId) params.set('categoryId', categoryId)
  if (search?.trim()) params.set('q', search.trim())
  const url = params.toString() ? `${API}?${params.toString()}` : API
  const res = await fetch(url)
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return data.data
  return []
}

export async function fetchTutorialTracks(): Promise<TutorialTrack[]> {
  const res = await fetch(`${API}/tracks`)
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return data.data
  return []
}

export async function fetchTrackProgress(
  trackSlug: string,
): Promise<{ items: string[]; progress: Record<string, { status: string }> } | null> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
  if (!token) return null
  const res = await fetch(`${API}/tracks/${encodeURIComponent(trackSlug)}/progress`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (data.success && data.data) return data.data
  return null
}

export async function fetchTutorial(slug: string): Promise<Tutorial | null> {
  const res = await fetch(`${API}/${encodeURIComponent(slug)}`)
  const data = await res.json()
  if (data.success && data.data) return data.data
  return null
}

export async function completeTutorial(slug: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API}/${encodeURIComponent(slug)}/progress/complete`, {
    method: 'POST',
    headers: (() => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
      const h: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`
      return h
    })(),
  })
  const data = await res.json()
  return { success: !!data.success }
}

/** Editor API – cần auth (teacher/admin) */
function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`
  return h
}

export async function fetchTutorialsForEditor(): Promise<{
  tutorials: Tutorial[]
  categories: TutorialCategory[]
}> {
  const res = await fetch(`${API}/editor/all`, { headers: authHeaders() })
  const data = await res.json()
  if (data.success && data.data)
    return {
      tutorials: data.data.tutorials ?? [],
      categories: data.data.categories ?? [],
    }
  return { tutorials: [], categories: [] }
}

export async function fetchTutorialForEditor(slug: string): Promise<{
  tutorial: Tutorial
  categories: TutorialCategory[]
} | null> {
  const res = await fetch(`${API}/editor/${encodeURIComponent(slug)}`, { headers: authHeaders() })
  const data = await res.json()
  if (data.success && data.data) return data.data
  return null
}

export async function createTutorial(payload: {
  title: string
  slug: string
  summary?: string
  categoryId?: string | null
  readTime?: number
  tags?: string[]
  sections?: TutorialSection[]
  relatedSlugs?: string[]
  published?: boolean
}): Promise<{ success: boolean; data?: Tutorial; error?: string }> {
  const res = await fetch(`${API}/editor`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (data.success) return { success: true, data: data.data }
  return { success: false, error: data.error || 'Tạo bài viết thất bại' }
}

export async function updateTutorial(
  slug: string,
  payload: Partial<{
    title: string
    summary: string
    categoryId: string | null
    readTime: number
    tags: string[]
    sections: TutorialSection[]
    relatedSlugs: string[]
    published: boolean
  }>
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API}/editor/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (data.success) return { success: true }
  return { success: false, error: data.error || 'Lưu thất bại' }
}

export async function deleteTutorial(slug: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API}/editor/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const data = await res.json()
  if (data.success) return { success: true }
  return { success: false, error: data.error || 'Xóa thất bại' }
}
