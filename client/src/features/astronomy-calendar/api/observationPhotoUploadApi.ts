import { getMediaBase } from '@/lib/apiConfig'
import { hasClientSession } from '@/features/auth/public'
import { apiFetch } from '@/lib/apiRequestInit'

export type ObservationPhotoUploadResult = {
  success: boolean
  url?: string
  cdn?: boolean
  error?: string
}

/** POST /upload/observation-photo — ảnh quan sát cho chứng nhận check-in. */
export async function uploadObservationPhoto(file: File): Promise<ObservationPhotoUploadResult> {
  if (!hasClientSession()) return { success: false, error: 'Bạn cần đăng nhập để tải ảnh lên.' }

  const form = new FormData()
  form.append('file', file)

  const res = await apiFetch(
    `${getMediaBase()}/upload/observation-photo`,
    { method: 'POST', body: form },
    false,
  )
  const data = (await res.json()) as {
    success?: boolean
    url?: string
    cdn?: boolean
    error?: string
  }
  if (!res.ok || !data.success || !data.url) {
    return { success: false, error: data.error || 'Tải ảnh quan sát thất bại.' }
  }
  return { success: true, url: data.url, cdn: data.cdn }
}
