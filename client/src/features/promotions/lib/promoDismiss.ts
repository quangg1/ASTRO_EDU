const STORAGE_KEY = 'cosmo-dismissed-promos'

function readSet(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.map(String))
  } catch {
    return new Set()
  }
}

function writeSet(set: Set<string>) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

export function isPromoDismissed(code: string): boolean {
  return readSet().has(code)
}

export function dismissPromo(code: string) {
  const set = readSet()
  set.add(code)
  writeSet(set)
  window.dispatchEvent(new CustomEvent('promo-dismiss-changed'))
}

export function undismissedPromos<T extends { code: string }>(promos: T[]): T[] {
  return promos.filter((p) => !isPromoDismissed(p.code))
}
