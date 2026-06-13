import { getApiPathBase } from '@/lib/apiConfig'
import { apiClientHeaders, apiFetchInit } from '@/lib/apiClientHeaders'

const BASE = `${getApiPathBase()}/users`

function authHeaders(): HeadersInit {
  return apiClientHeaders()
}

export type SavedItemSource = 'learning-path' | 'course'

export type SavedItem = {
  id: string
  itemKey: string
  source: SavedItemSource
  lessonId: string | null
  moduleId: string | null
  nodeId: string | null
  depth: 'beginner' | 'explorer' | 'researcher' | null
  courseSlug: string | null
  lessonSlug: string | null
  courseId: string | null
  title: string
  subtitle: string
  href: string
  savedAt: string
}

export type ToggleSavedPayload =
  | {
      source: 'learning-path'
      lessonId: string
      moduleId: string
      nodeId: string
      depth?: 'beginner' | 'explorer' | 'researcher'
      title: string
      subtitle?: string
    }
  | {
      source: 'course'
      courseSlug: string
      lessonSlug: string
      title: string
      subtitle?: string
    }

export function savedItemKeyForLp(lessonId: string) {
  return `lp:${lessonId}`
}

export function savedItemKeyForCourse(courseSlug: string, lessonSlug: string) {
  return `course:${courseSlug}:${lessonSlug}`
}

export async function fetchSavedItems(source?: SavedItemSource): Promise<SavedItem[]> {
  const qs = source ? `?source=${encodeURIComponent(source)}` : ''
  const res = await fetch(`${BASE}/me/saved${qs}`, apiFetchInit({ headers: authHeaders(), cache: 'no-store' }))
  const data = await res.json()
  if (data.success && Array.isArray(data.data)) return data.data as SavedItem[]
  return []
}

export async function fetchSavedLessonIds(): Promise<string[]> {
  const res = await fetch(`${BASE}/me/saved/keys?source=learning-path`, apiFetchInit({
    headers: authHeaders(),
    cache: 'no-store',
  }))
  const data = await res.json()
  if (data.success && data.data?.lessonIds) return data.data.lessonIds as string[]
  return []
}

export async function toggleSavedItem(
  payload: ToggleSavedPayload,
): Promise<{ saved: boolean; item: SavedItem | null; error?: string }> {
  const res = await fetch(`${BASE}/me/saved/toggle`, apiFetchInit({
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }))
  const data = await res.json()
  if (data.success && data.data) {
    return { saved: Boolean(data.data.saved), item: data.data.item ?? null }
  }
  return { saved: false, item: null, error: data.error || 'Không lưu được' }
}

export async function removeSavedItem(itemKey: string): Promise<boolean> {
  const res = await fetch(`${BASE}/me/saved/${encodeURIComponent(itemKey)}`, apiFetchInit({
    method: 'DELETE',
    headers: authHeaders(),
  }))
  const data = await res.json()
  return Boolean(data.success)
}

export const SAVED_ITEMS_CHANGED_EVENT = 'saved-items-changed'

export function notifySavedItemsChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(SAVED_ITEMS_CHANGED_EVENT))
}
