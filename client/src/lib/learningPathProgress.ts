import type { LearningModule } from '@/data/learningPathCurriculum'
import { DEPTH_ORDER, LEARNING_MODULES, countLessonSlots as countLessonsStatic } from '@/data/learningPathCurriculum'
import { getApiPathBase } from '@/lib/apiConfig'

/** Prefix phiên bản — mỗi user có key riêng để không dùng chung tiến độ trên cùng trình duyệt */
const PREFIX = 'cosmo-learning-path-v3'
/** Key cũ không gắn user (gây lỗi: nhiều account dùng chung tiến độ) — chỉ dùng để migrate cho guest */
const LEGACY_UNSCOPED_KEY = 'cosmo-learning-path-v3'
const LEGACY_STORAGE_KEYS = ['cosmo-learning-path-v2', 'cosmo-learning-path-v1', 'cosmo-learning-path']
const API = `${getApiPathBase()}/learning-path`
const LAST_LESSON_SUFFIX = ':lastLessonId'

export type LessonCompletionMap = Record<string, boolean>

/** Key lưu localStorage: mỗi user đăng nhập một key; khách dùng `:guest` */
export function getProgressStorageKey(userId: string | null | undefined): string {
  const id = userId != null && String(userId).trim() ? String(userId).trim() : null
  if (id) return `${PREFIX}:user:${id}`
  return `${PREFIX}:guest`
}

function getLastLessonStorageKey(userId: string | null | undefined): string {
  return `${getProgressStorageKey(userId)}${LAST_LESSON_SUFFIX}`
}

function progressKey(lessonId: string) {
  return lessonId
}

function getAllLessonIds(modules: LearningModule[] = LEARNING_MODULES) {
  const set = new Set<string>()
  for (const m of modules) {
    for (const node of m.nodes) {
      for (const d of DEPTH_ORDER) {
        for (const le of node.depths[d] ?? []) {
          set.add(String(le.id || '').trim())
        }
      }
    }
  }
  return set
}

function parseRawMap(raw: string | null): LessonCompletionMap {
  if (!raw) return {}
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    if (!data || typeof data !== 'object') return {}
    const next: LessonCompletionMap = {}
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof k === 'string' && k.trim()) next[k.trim()] = true
    }
    return next
  } catch {
    return {}
  }
}

function normalizeCompletionKeys(map: LessonCompletionMap): LessonCompletionMap {
  const validIds = getAllLessonIds()
  const normalized: LessonCompletionMap = {}
  for (const rawKey of Object.keys(map)) {
    const key = String(rawKey || '').trim()
    if (!key) continue
    const candidates = [key]
    try {
      candidates.push(decodeURIComponent(key))
    } catch {
      /* no-op */
    }
    try {
      candidates.push(encodeURIComponent(key))
    } catch {
      /* no-op */
    }
    if (key.includes('/')) {
      const last = key.split('/').filter(Boolean).pop()
      if (last) candidates.push(last)
    }
    const matched = candidates.find((x) => validIds.has(String(x || '').trim()))
    if (matched) normalized[String(matched).trim()] = true
  }
  return normalized
}

function isGuestScope(userId: string | null | undefined): boolean {
  return userId == null || String(userId).trim() === ''
}

/**
 * Đọc map hoàn thành bài.
 * - User đăng nhập: chỉ đọc key theo `user.id` (không merge từ key chung — tránh lẫn tiến độ giữa các account).
 * - Khách: migrate một lần từ key cũ không scope → `:guest`.
 */
export function loadLessonCompletion(userId?: string | null): LessonCompletionMap {
  if (typeof window === 'undefined') return {}
  const key = getProgressStorageKey(userId)
  try {
    let data = parseRawMap(localStorage.getItem(key))

    if (isGuestScope(userId) && Object.keys(data).length === 0) {
      for (const legacyKey of [LEGACY_UNSCOPED_KEY, ...LEGACY_STORAGE_KEYS]) {
        const legacyData = parseRawMap(localStorage.getItem(legacyKey))
        if (Object.keys(legacyData).length > 0) {
          data = legacyData
          break
        }
      }
    }

    const normalized = normalizeCompletionKeys(data)
    const serialized = JSON.stringify(normalized)
    if (localStorage.getItem(key) !== serialized) {
      localStorage.setItem(key, serialized)
    }
    return normalized
  } catch {
    return {}
  }
}

export function saveLessonCompletion(map: LessonCompletionMap, userId?: string | null) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getProgressStorageKey(userId), JSON.stringify(map))
  } catch {
    /* quota */
  }
}

export function loadLastLearningPathLessonId(userId?: string | null): string | null {
  if (typeof window === 'undefined') return null
  try {
    const v = String(localStorage.getItem(getLastLessonStorageKey(userId)) || '').trim()
    return v || null
  } catch {
    return null
  }
}

export function saveLastLearningPathLessonId(lessonId: string | null | undefined, userId?: string | null) {
  if (typeof window === 'undefined') return
  try {
    const key = getLastLessonStorageKey(userId)
    const v = String(lessonId || '').trim()
    if (!v) localStorage.removeItem(key)
    else localStorage.setItem(key, v)
  } catch {
    /* ignore */
  }
}

function getAuthToken() {
  if (typeof window === 'undefined') return null
  const t = localStorage.getItem('galaxies_token')
  return t && t.trim() ? t : null
}

function mapFromCompletedIds(ids: string[]): LessonCompletionMap {
  const next: LessonCompletionMap = {}
  for (const id of ids) next[id] = true
  return next
}

function completedIdsFromMap(map: LessonCompletionMap): string[] {
  return normalizeIdArray(Object.keys(map).filter((id) => !!map[id]))
}

function normalizeIdArray(ids: string[]) {
  return [...new Set(ids.map((x) => String(x || '').trim()).filter(Boolean))]
}

/** Đồng bộ 2 chiều local ↔ DB (DB là nguồn chính nếu đã có dữ liệu). */
export async function syncLearningPathCompletion(userId?: string | null): Promise<LessonCompletionMap> {
  const localMap = loadLessonCompletion(userId)
  const token = getAuthToken()
  if (!token || !userId) return localMap
  try {
    const res = await fetch(`${API}/progress`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const data = await res.json()
    const serverIds = normalizeIdArray(
      data?.success && Array.isArray(data?.data?.completedLessonIds) ? data.data.completedLessonIds : [],
    )
    const serverLastLessonId = String(data?.data?.lastLessonId || '').trim() || null
    const serverMap = mapFromCompletedIds(serverIds)
    if (serverIds.length > 0) {
      saveLessonCompletion(serverMap, userId)
      if (serverLastLessonId && serverMap[serverLastLessonId]) {
        saveLastLearningPathLessonId(serverLastLessonId, userId)
      }
      return serverMap
    }
    const localIds = completedIdsFromMap(localMap)
    if (localIds.length > 0) {
      await pushLearningPathCompletion(localMap, userId)
    }
    return localMap
  } catch {
    return localMap
  }
}

/** Push tiến độ lên DB (fire-and-forget được). */
export async function pushLearningPathCompletion(map: LessonCompletionMap, userId?: string | null): Promise<void> {
  return pushLearningPathCompletionWithLast(map, loadLastLearningPathLessonId(userId), userId)
}

export async function pushLearningPathCompletionWithLast(
  map: LessonCompletionMap,
  lastLessonId?: string | null,
  userId?: string | null,
): Promise<void> {
  const token = getAuthToken()
  if (!token || !userId) return
  const last = String(lastLessonId || '').trim()
  try {
    await fetch(`${API}/progress`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ completedLessonIds: completedIdsFromMap(map), lastLessonId: last || null }),
    })
  } catch {
    /* ignore network */
  }
}

export function toggleLessonComplete(
  map: LessonCompletionMap,
  lessonId: string,
  done: boolean,
): LessonCompletionMap {
  const k = progressKey(lessonId)
  const next = { ...map }
  if (done) next[k] = true
  else delete next[k]
  return next
}

export function isLessonComplete(map: LessonCompletionMap, lessonId: string): boolean {
  return !!map[progressKey(lessonId)]
}

export function computeProgressPercent(map: LessonCompletionMap, modules: LearningModule[] = LEARNING_MODULES): number {
  const total = countLessonsInModules(modules)
  if (total === 0) return 0
  let done = 0
  for (const m of modules) {
    for (const node of m.nodes) {
      for (const d of DEPTH_ORDER) {
        for (const le of node.depths[d] ?? []) {
          if (map[le.id]) done += 1
        }
      }
    }
  }
  return Math.round((done / total) * 100)
}

function countLessonsInModules(modules: LearningModule[]) {
  let n = 0
  for (const m of modules) {
    for (const node of m.nodes) {
      for (const d of DEPTH_ORDER) {
        n += node.depths[d]?.length ?? 0
      }
    }
  }
  return n
}

export function moduleProgressPercent(
  map: LessonCompletionMap,
  moduleId: string,
  modules: LearningModule[] = LEARNING_MODULES,
): number {
  const mod = modules.find((m) => m.id === moduleId)
  if (!mod) return 0
  let total = 0
  let done = 0
  for (const node of mod.nodes) {
    for (const d of DEPTH_ORDER) {
      for (const le of node.depths[d] ?? []) {
        total += 1
        if (map[le.id]) done += 1
      }
    }
  }
  if (total === 0) return 0
  return Math.round((done / total) * 100)
}

/** Tổng số bài trong một module (Learning Path). */
export function countLessonsInLearningModule(mod: LearningModule): number {
  let n = 0
  for (const node of mod.nodes) {
    for (const d of DEPTH_ORDER) {
      n += node.depths[d]?.length ?? 0
    }
  }
  return n
}

/** Số bài đã hoàn thành trong một module. */
export function countCompletedLessonsInModule(
  map: LessonCompletionMap,
  moduleId: string,
  modules: LearningModule[] = LEARNING_MODULES,
): number {
  const mod = modules.find((m) => m.id === moduleId)
  if (!mod) return 0
  let done = 0
  for (const node of mod.nodes) {
    for (const d of DEPTH_ORDER) {
      for (const le of node.depths[d] ?? []) {
        if (map[le.id]) done += 1
      }
    }
  }
  return done
}

/** Số module đã hoàn thành 100% (tất cả bài trong module). */
export function countFullyCompletedModules(
  map: LessonCompletionMap,
  modules: LearningModule[] = LEARNING_MODULES,
): number {
  let c = 0
  for (const m of modules) {
    const total = countLessonsInLearningModule(m)
    if (total === 0) continue
    const done = countCompletedLessonsInModule(map, m.id, modules)
    if (done === total) c += 1
  }
  return c
}

/** @deprecated — dùng countLessonSlots từ curriculum hoặc countLessonsInModules */
export function countDepthSlots() {
  return countLessonsStatic()
}

export { countLessonsStatic as countLessonSlots }
