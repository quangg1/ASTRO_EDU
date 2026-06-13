import { getMediaBase } from '@/lib/apiConfig'
import { hasClientSession } from '@/features/auth/public'
import { apiFetch, apiRequestInit } from '@/lib/apiRequestInit'

export type AvatarUploadResult = {
  success: boolean
  url?: string
  cdn?: boolean
  error?: string
}

/** POST /upload/avatar — lưu S3/CDN khi cấu hình `S3_MEDIA_BUCKET` + `MEDIA_CDN_URL`. */
export async function uploadProfileAvatar(file: File): Promise<AvatarUploadResult> {
  if (!hasClientSession()) return { success: false, error: 'Bạn cần đăng nhập để tải ảnh lên.' }

  const form = new FormData()
  form.append('file', file)

  const res = await apiFetch(
    `${getMediaBase()}/upload/avatar`,
    apiRequestInit({ method: 'POST', body: form }, false),
  )
  const data = (await res.json()) as {
    success?: boolean
    url?: string
    cdn?: boolean
    error?: string
  }
  if (!res.ok || !data.success || !data.url) {
    return { success: false, error: data.error || 'Tải ảnh đại diện thất bại.' }
  }
  return { success: true, url: data.url, cdn: data.cdn }
}
