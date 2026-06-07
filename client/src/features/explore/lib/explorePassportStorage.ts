import { isSkyOnlyTarget } from '@/features/explore/lib/exploreTargets'
import { loadDiscoveryMap, saveDiscoveryMap } from '@/features/content3d/showcase/lib/showcaseLearningBridge'

const SKY_PREFIX = 'explore-passport-sky-v1'
const STORY_PREFIX = 'explore-passport-story-v1'

function scopedKey(prefix: string, userId?: string | null): string {
  const id = userId != null && String(userId).trim() ? String(userId).trim() : 'guest'
  return `${prefix}:${id}`
}

function parseStringSet(raw: string | null): Set<string> {
  try {
    const data = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(data)) return new Set()
    return new Set(data.map((x) => String(x || '').trim()).filter(Boolean))
  } catch {
    return new Set()
  }
}

function saveStringSet(key: string, set: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify([...set]))
  } catch {
    /* ignore */
  }
}

export function loadPassportSkyTargetIds(userId?: string | null): Set<string> {
  if (typeof window === 'undefined') return new Set()
  return parseStringSet(localStorage.getItem(scopedKey(SKY_PREFIX, userId)))
}

/** Chòm sao từng lưu nhầm trong discovery map → chuyển sang sky stamps. */
export function migrateSkyStampsFromDiscoveryMap(userId?: string | null) {
  if (typeof window === 'undefined') return
  const discovered = loadDiscoveryMap(userId)
  const keys = Object.keys(discovered).filter((id) => discovered[id] && isSkyOnlyTarget(id))
  if (keys.length === 0) return

  const sky = loadPassportSkyTargetIds(userId)
  let skyChanged = false
  for (const id of keys) {
    if (!sky.has(id)) {
      sky.add(id)
      skyChanged = true
    }
  }

  const nextDiscovered = { ...discovered }
  for (const id of keys) delete nextDiscovered[id]
  saveDiscoveryMap(nextDiscovered, userId)
  if (skyChanged) saveStringSet(scopedKey(SKY_PREFIX, userId), sky)
}

export function markPassportSkyTarget(userId: string | null | undefined, targetId: string) {
  const id = String(targetId || '').trim()
  if (!id) return
  const set = loadPassportSkyTargetIds(userId)
  if (set.has(id)) return
  set.add(id)
  saveStringSet(scopedKey(SKY_PREFIX, userId), set)
}

export function loadPassportStoryTourIds(userId?: string | null): Set<string> {
  if (typeof window === 'undefined') return new Set()
  return parseStringSet(localStorage.getItem(scopedKey(STORY_PREFIX, userId)))
}

export function markPassportStoryTourCompleted(userId: string | null | undefined, storyId: string) {
  const id = String(storyId || '').trim()
  if (!id) return
  const set = loadPassportStoryTourIds(userId)
  if (set.has(id)) return
  set.add(id)
  saveStringSet(scopedKey(STORY_PREFIX, userId), set)
}
