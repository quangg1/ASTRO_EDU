import { getMediaBase } from '@/lib/apiConfig'
import { hasClientSession } from '@/features/auth/public'
import { apiFetch, apiRequestInit } from '@/lib/apiRequestInit'

export async function uploadTeacherApplicationCv(
  file: File,
): Promise<{ success: boolean; url?: string; filename?: string; error?: string }> {
  if (!hasClientSession()) return { success: false, error: 'Chưa đăng nhập' }
  if (!/\.pdf$/i.test(file.name)) {
    return { success: false, error: 'Chỉ chấp nhận file PDF' }
  }
  const form = new FormData()
  form.append('file', file)
  const res = await apiFetch(
    `${getMediaBase()}/upload/teacher-application-cv`,
    apiRequestInit({ method: 'POST', body: form }, false),
  )
  const data = await res.json()
  if (data.success && data.url) {
    return { success: true, url: data.url, filename: data.filename || file.name }
  }
  return { success: false, error: data.error || 'Tải CV thất bại' }
}

export async function uploadTeacherApplicationCertificate(
  file: File,
): Promise<{ success: boolean; url?: string; filename?: string; error?: string }> {
  if (!hasClientSession()) return { success: false, error: 'Chưa đăng nhập' }
  const okExt = /\.(pdf|jpe?g|png|webp)$/i.test(file.name)
  if (!okExt) {
    return { success: false, error: 'Chỉ chấp nhận PDF hoặc ảnh JPG/PNG/WebP' }
  }
  const form = new FormData()
  form.append('file', file)
  const res = await apiFetch(
    `${getMediaBase()}/upload/teacher-application-certificate`,
    apiRequestInit({ method: 'POST', body: form }, false),
  )
  const data = await res.json()
  if (data.success && data.url) {
    return { success: true, url: data.url, filename: data.filename || file.name }
  }
  return { success: false, error: data.error || 'Tải giấy tờ thất bại' }
}

export async function uploadAvatarForApplication(
  file: File,
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!hasClientSession()) return { success: false, error: 'Chưa đăng nhập' }
  const form = new FormData()
  form.append('file', file)
  const res = await apiFetch(
    `${getMediaBase()}/upload/avatar`,
    apiRequestInit({ method: 'POST', body: form }, false),
  )
  const data = await res.json()
  if (data.success && data.url) return { success: true, url: data.url }
  return { success: false, error: data.error || 'Tải ảnh thất bại' }
}
