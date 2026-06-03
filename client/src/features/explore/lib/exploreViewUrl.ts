import type { ExploreView } from './exploreTargets'
import {
  DEFAULT_WESTERN_SKY_TARGET_ID,
  resolveWesternConstellationTargetId,
} from './westernSkyCulture'

/** Tham số chỉ dùng cho view solar — xóa khi vào sky. */
export const EXPLORE_SOLAR_ONLY_PARAMS = [
  'entity',
  'history',
  'beat',
  'pin',
  'stage',
  'mode',
  'group',
  'dist',
  'az',
  'el',
] as const

/** Tham số chỉ dùng cho view sky — xóa khi vào solar. */
export const EXPLORE_SKY_ONLY_PARAMS = ['target', 'lat', 'lon', 'time'] as const

export function normalizeSkyTargetId(raw: string | null | undefined): string {
  const t = String(raw || '').trim()
  if (!t) return DEFAULT_WESTERN_SKY_TARGET_ID
  if (t === 'earth') return 'planet-earth'
  if (t.startsWith('constellation-')) {
    return resolveWesternConstellationTargetId(t) ?? DEFAULT_WESTERN_SKY_TARGET_ID
  }
  if (t.startsWith('planet-') || t.startsWith('star-hip-')) {
    return t
  }
  const planet = `planet-${t}`
  if (['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].includes(t)) {
    return planet
  }
  return t
}

export function buildExploreHref(input: {
  view?: ExploreView
  targetId?: string | null
  entityId?: string | null
  history?: boolean
  stage?: string | number | null
  extra?: Record<string, string | undefined>
}): string {
  const params = new URLSearchParams()
  const view = input.view ?? 'solar'

  if (view === 'sky') {
    params.set('view', 'sky')
    const target = normalizeSkyTargetId(input.targetId || input.entityId)
    params.set('target', target)
  } else {
    params.set('view', 'solar')
    const entity = String(input.entityId || input.targetId || '').trim()
    if (entity) params.set('entity', entity)
    if (input.history) params.set('history', '1')
    if (input.stage != null && input.stage !== '') params.set('stage', String(input.stage))
  }

  for (const [k, v] of Object.entries(input.extra || {})) {
    if (v == null || v === '') continue
    if (EXPLORE_SOLAR_ONLY_PARAMS.includes(k as (typeof EXPLORE_SOLAR_ONLY_PARAMS)[number])) continue
    if (EXPLORE_SKY_ONLY_PARAMS.includes(k as (typeof EXPLORE_SKY_ONLY_PARAMS)[number])) continue
    params.set(k, v)
  }

  const qs = params.toString()
  return qs ? `/explore?${qs}` : '/explore'
}

/** Gộp tour/onboarding params vào URL explore sạch. */
export function mergeExplorePreservedParams(
  baseHref: string,
  current: URLSearchParams,
): string {
  const [path, qs = ''] = baseHref.split('?')
  const out = new URLSearchParams(qs)
  for (const key of ['from', 'tour', 'topics', 'bridgeDebug', 'depth'] as const) {
    const v = current.get(key)
    if (v) out.set(key, v)
  }
  const merged = out.toString()
  return merged ? `${path}?${merged}` : path
}
