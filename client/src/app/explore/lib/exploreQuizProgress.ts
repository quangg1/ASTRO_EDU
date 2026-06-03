/** Must match server `calendarDayKeyVi` (Asia/Ho_Chi_Minh). */
export const EXPLORE_CONTEXTUAL_QUIZ_DAY_TZ = 'Asia/Ho_Chi_Minh'

const PREFIX = 'galaxies.explore.contextualQuizDone'

function storageKey(entityId: string, userId: string | null | undefined): string {
  const uid = userId?.trim() || 'guest'
  return `${PREFIX}:${uid}:${entityId}`
}

/** YYYY-MM-DD in Vietnam — same boundary as API daily reset. */
export function exploreCalendarDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EXPLORE_CONTEXTUAL_QUIZ_DAY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function loadStoredDay(entityId: string, userId?: string | null): string | null {
  if (typeof window === 'undefined' || !entityId) return null
  try {
    const raw = window.localStorage.getItem(storageKey(entityId, userId))
    if (!raw || raw === '1') return null
    return raw
  } catch {
    return null
  }
}

/** True if contextual quiz was finished today for this entity (any score). */
export function loadExploreContextualQuizDoneToday(
  entityId: string,
  userId?: string | null,
): boolean {
  const stored = loadStoredDay(entityId, userId)
  return stored === exploreCalendarDayKey()
}

/** @deprecated Use loadExploreContextualQuizDoneToday */
export function loadExploreContextualQuizDone(
  entityId: string,
  userId?: string | null,
): boolean {
  return loadExploreContextualQuizDoneToday(entityId, userId)
}

export function saveExploreContextualQuizDoneToday(
  entityId: string,
  userId?: string | null,
): void {
  if (typeof window === 'undefined' || !entityId) return
  try {
    window.localStorage.setItem(storageKey(entityId, userId), exploreCalendarDayKey())
  } catch {
    /* ignore quota */
  }
}

/** @deprecated Use saveExploreContextualQuizDoneToday */
export function saveExploreContextualQuizDone(entityId: string, userId?: string | null): void {
  saveExploreContextualQuizDoneToday(entityId, userId)
}
