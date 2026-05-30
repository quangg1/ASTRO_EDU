/** Tránh refetch / remount hàng loạt mỗi lần quay lại tab trình duyệt. */

const lastRun = new Map<string, number>()

export function shouldRunVisibleRefresh(key: string, minIntervalMs = 120_000): boolean {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return false
  const now = Date.now()
  const prev = lastRun.get(key) ?? 0
  if (now - prev < minIntervalMs) return false
  lastRun.set(key, now)
  return true
}

export function markVisibleRefresh(key: string) {
  lastRun.set(key, Date.now())
}
