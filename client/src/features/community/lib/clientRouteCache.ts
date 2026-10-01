/** Cache nhẹ phía client — giữ nội dung khi quay lại route (tránh flash “Đang tải…”). */
const store = new Map<string, { value: unknown; at: number }>()

const DEFAULT_TTL_MS = 90_000

export function readRouteCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const hit = store.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > ttlMs) {
    store.delete(key)
    return null
  }
  return hit.value as T
}

export function writeRouteCache<T>(key: string, value: T): void {
  store.set(key, { value, at: Date.now() })
}

export function invalidateRouteCache(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
