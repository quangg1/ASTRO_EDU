const STORAGE_KEY = 'galaxies.exploreTour.v2.completed'

export function isExploreTourCompleted(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(window.localStorage.getItem(STORAGE_KEY))
}

export function markExploreTourCompleted(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, String(Date.now()))
}

/** Auto-open once per browser unless user finished/skipped or `?tour=0`. */
export function shouldAutoOpenExploreTour(fromOnboarding: boolean, tourParamEnabled: boolean): boolean {
  if (!tourParamEnabled) return false
  if (fromOnboarding) return true
  return !isExploreTourCompleted()
}
