/**
 * Tiến độ milestone — hiện localStorage; sau này đồng bộ API + user id.
 */

import { getApiPathBase } from '@/lib/apiConfig'

const PREFIX = 'cosmo-solar-journey-milestones-v1'
const API = `${getApiPathBase()}/learning-path/solar-journey/progress`

export function getSolarJourneyStorageKey(userId?: string | null) {
  const id = userId != null && String(userId).trim() ? String(userId).trim() : null
  if (id) return `${PREFIX}:user:${id}`
  return `${PREFIX}:guest`
}

function normalizeIds(arr: string[]) {
  return [...new Set(arr.map((x) => String(x || '').trim()).filter(Boolean))]
}

function getAuthToken() {
  if (typeof window === 'undefined') return null
  const t = localStorage.getItem('galaxies_token')
  return t && t.trim() ? t : null
}

export function loadCompletedMilestoneIds(userId?: string | null): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(getSolarJourneyStorageKey(userId))
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? normalizeIds(arr) : [])
  } catch {
    return new Set()
  }
}

export function saveCompletedMilestoneIds(ids: Set<string>, userId?: string | null): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getSolarJourneyStorageKey(userId), JSON.stringify(normalizeIds([...ids])))
  } catch {
    /* ignore quota */
  }
}

export async function syncSolarJourneyProgress(userId?: string | null): Promise<Set<string>> {
  const local = loadCompletedMilestoneIds(userId)
  const token = getAuthToken()
  if (!token || !userId) return local
  try {
    const res = await fetch(API, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const data = await res.json()
    const serverIds = normalizeIds(
      data?.success && Array.isArray(data?.data?.completedMilestoneIds) ? data.data.completedMilestoneIds : [],
    )
    if (serverIds.length > 0) {
      const next = new Set(serverIds)
      saveCompletedMilestoneIds(next, userId)
      return next
    }
    if (local.size > 0) {
      await pushSolarJourneyProgress(local, userId)
    }
    return local
  } catch {
    return local
  }
}

export async function pushSolarJourneyProgress(ids: Set<string>, userId?: string | null): Promise<void> {
  const token = getAuthToken()
  if (!token || !userId) return
  try {
    await fetch(API, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ completedMilestoneIds: normalizeIds([...ids]) }),
    })
  } catch {
    /* ignore */
  }
}
