import type { EarthStage } from '@/features/content3d/earth/lib/earthHistoryTypes'
import { getEarthHistoryApiPathBase } from '@/lib/apiConfig'

const API = `${getEarthHistoryApiPathBase()}/earth-history/editor`

export async function saveEarthHistoryStagesBulk(
  token: string,
  stages: EarthStage[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API}/bulk`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stages }),
    })
    const json = await res.json()
    if (json.success) return { ok: true }
    return { ok: false, error: json.error || 'Lưu thất bại' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi mạng' }
  }
}
