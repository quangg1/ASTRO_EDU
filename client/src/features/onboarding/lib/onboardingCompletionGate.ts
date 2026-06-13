const KEY = 'galaxies-onboarding-completed'

/** Sau POST /onboarding/complete — tránh OnboardingRedirect kéo về /onboarding trước khi /me kịp cập nhật. */
export function markOnboardingCompletedClient(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

export function hasOnboardingCompletedClient(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(KEY) != null
  } catch {
    return false
  }
}

export function clearOnboardingCompletedClient(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
