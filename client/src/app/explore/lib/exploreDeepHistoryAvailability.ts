import { getLegacyPresetBundle } from '@/features/content3d/narrative/lib/legacyPresets'
import { fetchPlanetNarrative } from '@/features/content3d/narrative/public'

const probeCache = new Map<string, boolean>()

/** Kiểm tra đồng bộ — preset Earth/Mars và seed legacy trong bundle. */
export function entityHasDeepHistorySync(entityId: string): boolean {
  const id = String(entityId || '').trim()
  if (!id) return false
  const legacy = getLegacyPresetBundle(id)
  return (legacy?.beats?.length ?? 0) > 0
}

/** Kiểm tra async (cache) — preset hoặc bản ghi DB có beats. */
export async function probeEntityHasDeepHistory(entityId: string): Promise<boolean> {
  const id = String(entityId || '').trim()
  if (!id) return false
  if (entityHasDeepHistorySync(id)) {
    probeCache.set(id, true)
    return true
  }
  if (probeCache.has(id)) return probeCache.get(id)!
  try {
    const { data } = await fetchPlanetNarrative(id)
    const has = (data?.beats?.length ?? 0) > 0
    probeCache.set(id, has)
    return has
  } catch {
    probeCache.set(id, false)
    return false
  }
}

export function clearDeepHistoryProbeCache(entityId?: string) {
  if (entityId) probeCache.delete(String(entityId).trim())
  else probeCache.clear()
}
