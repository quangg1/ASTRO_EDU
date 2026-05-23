import { getApiPathBase } from '@/lib/apiConfig'

const BASE = () => getApiPathBase()
const KEY_DETAIL = 'galaxies_eng_detail_'
const KEY_SOURCE = 'galaxies_eng_source_'

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

async function postView(postId: string): Promise<number | null> {
  try {
    const res = await fetch(`${BASE()}/posts/${postId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await res.json()
    if (json.success && typeof json.viewCount === 'number') return json.viewCount
  } catch {
    /* ignore */
  }
  return null
}

/** Một lần mỗi phiên: người dùng mở trang chi tiết bài trong app → tăng viewCount (dùng cho xếp hạng hot). */
export async function recordPostDetailView(postId: string): Promise<number | null> {
  const s = storage()
  if (!s) return null
  const k = KEY_DETAIL + postId
  if (s.getItem(k)) return null
  s.setItem(k, '1')
  return postView(postId)
}

/** Một lần mỗi phiên: mở bài gốc (tab mới) từ thẻ tin hoặc nút “Đọc bài gốc” → tăng viewCount. */
export async function recordPostSourceOpen(postId: string): Promise<number | null> {
  const s = storage()
  if (!s) return null
  const k = KEY_SOURCE + postId
  if (s.getItem(k)) return null
  s.setItem(k, '1')
  return postView(postId)
}
