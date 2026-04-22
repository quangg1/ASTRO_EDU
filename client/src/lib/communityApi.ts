import { getToken } from './authApi'
import { getApiPathBase } from './apiConfig'

const COMMUNITY_BASE = getApiPathBase()

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`
  return h
}

export interface Forum {
  _id: string
  slug: string
  title: string
  description: string
  icon: string
  order: number
  postCount: number
  isNews?: boolean
}

export interface Post {
  _id: string
  forumId: string
  authorId: string
  authorName: string
  title: string
  content: string
  courseId?: string | null
  courseSlug?: string | null
  lessonSlug?: string | null
  sourceUrl?: string | null
  sourceName?: string | null
  publishedAt?: string | null
  imageUrl?: string | null
  isCrawled?: boolean
  /** true: card tin mở sourceUrl (đọc bài gốc), không nhúng full HTML crawl */
  isExternalArticle?: boolean
  /** Từ RSS &lt;category&gt; — filter theo metadata */
  rssCategories?: string[]
  voteCount: number
  commentCount: number
  viewCount: number
  isPinned?: boolean
  createdAt: string
}

export interface Comment {
  _id: string
  postId: string
  authorId: string
  authorName: string
  content: string
  parentId?: string | null
  voteCount: number
  createdAt: string
}

export async function fetchForums(): Promise<Forum[]> {
  const res = await fetch(`${COMMUNITY_BASE}/forums`, { headers: authHeaders() })
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return data.data
  return []
}

export async function fetchForum(slug: string): Promise<Forum | null> {
  const res = await fetch(`${COMMUNITY_BASE}/forums/${slug}`, { headers: authHeaders() })
  const data = await res.json()
  if (data.success && data.data) return data.data
  return null
}

export async function fetchForumPosts(
  slug: string,
  opts?: {
    page?: number
    limit?: number
    sort?: 'newest' | 'top' | 'hot'
    /** Khớp một giá trị trong rssCategories (tin crawl) */
    category?: string
    /** Tìm trong tiêu đề, tối thiểu 2 ký tự */
    q?: string
  }
): Promise<{ data: Post[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams()
  if (opts?.page) params.set('page', String(opts.page))
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.sort) params.set('sort', opts.sort)
  if (opts?.category) params.set('category', opts.category)
  if (opts?.q) params.set('q', opts.q)
  const q = params.toString()
  const res = await fetch(`${COMMUNITY_BASE}/forums/${slug}/posts${q ? `?${q}` : ''}`, { headers: authHeaders() })
  const json = await res.json()
  if (json.success) return { data: json.data || [], total: json.total || 0, page: json.page || 1, limit: json.limit || 20 }
  return { data: [], total: 0, page: 1, limit: 20 }
}

export async function fetchNews(opts?: {
  page?: number
  limit?: number
  category?: string
  q?: string
  /** newest | hot (lượt xem) | top (vote) */
  sort?: 'newest' | 'hot' | 'top'
}): Promise<{ data: Post[]; total: number }> {
  const params = new URLSearchParams()
  if (opts?.page) params.set('page', String(opts.page))
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.category) params.set('category', opts.category)
  if (opts?.q) params.set('q', opts.q)
  if (opts?.sort && opts.sort !== 'newest') params.set('sort', opts.sort)
  const q = params.toString()
  const res = await fetch(`${COMMUNITY_BASE}/news${q ? `?${q}` : ''}`, { headers: authHeaders() })
  const json = await res.json()
  if (json.success) return { data: json.data || [], total: json.total || 0 }
  return { data: [], total: 0 }
}

/** Danh sách category từ tin đã crawl (để filter). */
export async function fetchNewsCategories(): Promise<string[]> {
  const res = await fetch(`${COMMUNITY_BASE}/news/categories`, { headers: authHeaders() })
  const json = await res.json()
  if (json.success && Array.isArray(json.data)) return json.data
  return []
}

export async function fetchPost(id: string): Promise<{ post: Post & { comments: Comment[]; myVote?: number | null } } | null> {
  const res = await fetch(`${COMMUNITY_BASE}/posts/${id}`, { headers: authHeaders() })
  const json = await res.json()
  if (json.success && json.data) return { post: json.data }
  return null
}

export async function createPost(
  forumSlug: string,
  body: { title: string; content?: string; courseId?: string; courseSlug?: string; lessonSlug?: string }
): Promise<{ success: boolean; data?: Post; error?: string }> {
  const res = await fetch(`${COMMUNITY_BASE}/forums/${forumSlug}/posts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (json.success) return { success: true, data: json.data }
  return { success: false, error: json.error || 'Lỗi tạo bài viết' }
}

export async function addComment(postId: string, content: string, parentId?: string): Promise<{ success: boolean; data?: Comment; error?: string }> {
  const res = await fetch(`${COMMUNITY_BASE}/posts/${postId}/comments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ content, parentId }),
  })
  const json = await res.json()
  if (json.success) return { success: true, data: json.data }
  return { success: false, error: json.error || 'Lỗi gửi bình luận' }
}

export async function votePost(postId: string, value: 1 | -1): Promise<{ success: boolean; voteCount?: number; myVote?: number | null; error?: string }> {
  const res = await fetch(`${COMMUNITY_BASE}/posts/${postId}/vote`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ value }),
  })
  const json = await res.json()
  if (json.success) return { success: true, voteCount: json.voteCount, myVote: json.myVote }
  return { success: false, error: json.error || 'Lỗi vote' }
}

/** Admin: ghim / bỏ ghim bài viết */
export async function pinPost(postId: string, isPinned: boolean): Promise<{ success: boolean; data?: Post; error?: string }> {
  const res = await fetch(`${COMMUNITY_BASE}/posts/${postId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ isPinned }),
  })
  const json = await res.json()
  if (json.success) return { success: true, data: json.data }
  return { success: false, error: json.error || 'Lỗi cập nhật' }
}

/** Admin: xóa bài viết */
export async function deletePost(postId: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${COMMUNITY_BASE}/posts/${postId}`, { method: 'DELETE', headers: authHeaders() })
  const json = await res.json()
  if (json.success) return { success: true }
  return { success: false, error: json.error || 'Lỗi xóa' }
}
