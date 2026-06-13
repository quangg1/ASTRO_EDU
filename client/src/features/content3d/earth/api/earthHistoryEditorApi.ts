import type { EarthStage } from '@/features/content3d/earth/lib/earthHistoryTypes'
import { getEarthHistoryApiPathBase } from '@/lib/apiConfig'
import { apiFetch } from '@/lib/apiRequestInit'

const API = `${getEarthHistoryApiPathBase()}/earth-history/editor`

export async function saveEarthHistoryStagesBulk(
  stages: EarthStage[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch(`${API}/bulk`, {
      method: 'PUT',
      body: JSON.stringify({ stages }),
    })
    const json = await res.json()
    if (json.success) return { ok: true }
    return { ok: false, error: json.error || 'Lưu thất bại' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi mạng' }
  }
}
