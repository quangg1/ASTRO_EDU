import { getApiPathBase } from '@/lib/apiConfig'
import { apiClientHeaders, apiFetchInit } from '@/lib/apiClientHeaders'
import type { AstronomyEventAdmin, CreateAstronomyEventPayload } from '@/features/astronomy-calendar/types'

const BASE = `${getApiPathBase()}/admin/astronomy-calendar`

function authInit(method: string, body?: unknown): RequestInit {
  return apiFetchInit({
    method,
    headers: apiClientHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })
}

async function parseAdminJson<T extends { success?: boolean; error?: string }>(
  res: Response,
  fallbackError: string,
): Promise<T & { success: boolean; error?: string }> {
  let json: T
  try {
    json = (await res.json()) as T
  } catch {
    return {
      success: false,
      error: res.ok ? fallbackError : `${fallbackError} (HTTP ${res.status})`,
    } as T & { success: boolean; error?: string }
  }
  if (json.success) return { ...json, success: true }
  return {
    ...json,
    success: false,
    error: json.error || `${fallbackError} (HTTP ${res.status})`,
  }
}

export async function fetchAdminAstronomyEvents(): Promise<AstronomyEventAdmin[]> {
  const res = await fetch(BASE, authInit('GET'))
  const json = (await res.json()) as { success?: boolean; data?: AstronomyEventAdmin[] }
  return json.success && Array.isArray(json.data) ? json.data : []
}

export async function importAdminAstronomySuggestions(
  days = 90,
  publish = false,
): Promise<{ success: boolean; data?: { created: number; updated: number }; error?: string }> {
  const res = await fetch(BASE + '/import-suggestions', authInit('POST', { days, publish }))
  const json = (await res.json()) as {
    success?: boolean
    data?: { created: number; updated: number }
    error?: string
  }
  if (json.success) return { success: true, data: json.data }
  return { success: false, error: json.error || 'Import thất bại' }
}

export async function publishAdminAstronomyEvent(id: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BASE}/${id}/publish`, authInit('POST'))
  const json = (await res.json()) as { success?: boolean; error?: string }
  return json.success ? { success: true } : { success: false, error: json.error || 'Publish thất bại' }
}

export async function patchAdminAstronomyEvent(
  id: string,
  body: Partial<AstronomyEventAdmin>,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BASE}/${id}`, authInit('PATCH', body))
  const json = (await res.json()) as { success?: boolean; error?: string }
  return json.success ? { success: true } : { success: false, error: json.error || 'Cập nhật thất bại' }
}

export async function createAdminAstronomyEvent(
  body: CreateAstronomyEventPayload,
): Promise<{ success: boolean; data?: AstronomyEventAdmin; error?: string }> {
  const res = await fetch(BASE, authInit('POST', body))
  const json = await parseAdminJson<{ success?: boolean; data?: AstronomyEventAdmin; error?: string }>(
    res,
    'Tạo sự kiện thất bại',
  )
  if (json.success && json.data) return { success: true, data: json.data }
  return { success: false, error: json.error || 'Tạo sự kiện thất bại' }
}

export async function deleteAdminAstronomyEvent(id: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, authInit('DELETE'))
  const json = (await res.json()) as { success?: boolean; error?: string }
  return json.success ? { success: true } : { success: false, error: json.error || 'Xóa thất bại' }
}

export async function fetchAdminTypeKits(): Promise<import('@/features/astronomy-calendar/types').AstronomyEventTypeKit[]> {
  const res = await fetch(`${BASE}/type-kits`, authInit('GET'))
  const json = (await res.json()) as {
    success?: boolean
    data?: import('@/features/astronomy-calendar/types').AstronomyEventTypeKit[]
  }
  return json.success && Array.isArray(json.data) ? json.data : []
}

export async function patchAdminTypeKit(
  type: string,
  body: Partial<import('@/features/astronomy-calendar/types').AstronomyEventTypeKit>,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BASE}/type-kits/${encodeURIComponent(type)}`, authInit('PATCH', body))
  const json = (await res.json()) as { success?: boolean; error?: string }
  return json.success ? { success: true } : { success: false, error: json.error || 'Cập nhật thất bại' }
}
