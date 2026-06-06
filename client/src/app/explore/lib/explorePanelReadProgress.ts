const PREFIX = 'galaxies.explore.panelReadDone'

function storageKey(entityId: string, userId: string | null | undefined): string {
  const uid = userId?.trim() || 'guest'
  return `${PREFIX}:${uid}:${entityId}`
}

/** User explicitly marked the explore panel as read for this entity. */
export function loadExplorePanelReadComplete(
  entityId: string,
  userId?: string | null,
): boolean {
  if (typeof window === 'undefined' || !entityId) return false
  try {
    return window.localStorage.getItem(storageKey(entityId, userId)) === '1'
  } catch {
    return false
  }
}

export function saveExplorePanelReadComplete(
  entityId: string,
  userId?: string | null,
): void {
  if (typeof window === 'undefined' || !entityId) return
  try {
    window.localStorage.setItem(storageKey(entityId, userId), '1')
  } catch {
    /* ignore quota */
  }
}
