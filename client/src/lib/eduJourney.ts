export type EduJourneyContext = {
  entityId?: string
  entityLabel?: string
  lessonHref?: string
  lessonTitle?: string
  exploreHref?: string
  view?: 'showcase' | 'sky' | 'solar'
  updatedAt?: string
}

const EDU_JOURNEY_STORAGE_KEY = 'galaxies:edu-journey-context'

export function loadEduJourneyContext(): EduJourneyContext | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(EDU_JOURNEY_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as EduJourneyContext
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function saveEduJourneyContext(context: EduJourneyContext) {
  if (typeof window === 'undefined') return
  try {
    const next: EduJourneyContext = {
      ...context,
      updatedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(EDU_JOURNEY_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore storage failure
  }
}

export function clearEduJourneyContext() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(EDU_JOURNEY_STORAGE_KEY)
  } catch {
    // ignore storage failure
  }
}
