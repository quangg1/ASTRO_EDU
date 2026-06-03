import type {
  LearningConcept,
  LearningModule,
  LessonHistoryFocus,
  LessonItem,
} from '@/data/learningPathCurriculum'
import {
  WESTERN_CONSTELLATION_BRIDGE_MAP,
  WESTERN_CONSTELLATION_MUSEUM_VI,
} from '@/features/explore/data/westernConstellationBridge.generated'
import {
  LEGACY_CONSTELLATION_TARGET_MAP,
  resolveWesternConstellationTargetId,
} from '@/features/explore/lib/westernSkyCulture'
import { buildExploreHref } from '@/features/explore/lib/exploreViewUrl'
import { NASA_SHOWCASE_ITEMS } from './showcaseCatalogRuntime'

export type ShowcaseBridgeMap = {
  entityId: string
  conceptHints: string[]
}

export const SHOWCASE_ENTITY_CONCEPT_MAP: ShowcaseBridgeMap[] = [
  { entityId: 'planet-saturn', conceptHints: ['saturn', 'rings', 'cassini', 'titan', 'gas giant'] },
  { entityId: 'moon-titan', conceptHints: ['titan', 'atmosphere', 'methane'] },
  { entityId: 'planet-jupiter', conceptHints: ['jupiter', 'gas giant', 'magnetosphere', 'europa'] },
  { entityId: 'planet-mars', conceptHints: ['mars', 'atmosphere', 'geology'] },
  { entityId: 'planet-venus', conceptHints: ['venus', 'greenhouse', 'co2', 'atmosphere'] },
  { entityId: 'planet-earth', conceptHints: ['earth', 'atmosphere', 'biosphere'] },
  { entityId: 'dwarf-pluto', conceptHints: ['pluto', 'kuiper', 'dwarf planet'] },
  { entityId: 'moon-europa', conceptHints: ['europa', 'ice', 'subsurface ocean'] },
  { entityId: 'sc-cassini', conceptHints: ['cassini', 'saturn', 'rings', 'titan'] },
]

const WESTERN_BRIDGE_BY_ID = new Map(
  WESTERN_CONSTELLATION_BRIDGE_MAP.map((r) => [r.entityId, r]),
)

const BRIDGE_VISITED_PREFIX = 'showcase-bridge-visited-v2'
const LEGACY_BRIDGE_VISITED_KEY = 'showcase-bridge-visited-v1'
const BRIDGE_DISCOVERY_PREFIX = 'showcase-discovery-v2'
const LEGACY_BRIDGE_DISCOVERY_KEY = 'showcase-discovery-v1'

function bridgeVisitedStorageKey(userId?: string | null): string {
  const id = userId != null && String(userId).trim() ? String(userId).trim() : 'guest'
  return `${BRIDGE_VISITED_PREFIX}:${id}`
}

function bridgeDiscoveryStorageKey(userId?: string | null): string {
  const id = userId != null && String(userId).trim() ? String(userId).trim() : 'guest'
  return `${BRIDGE_DISCOVERY_PREFIX}:${id}`
}

function parseBooleanEntityRecord(raw: string | null): Record<string, boolean> {
  try {
    const data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    const out: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(data || {})) {
      if (!k || !v) continue
      out[String(k).trim()] = true
    }
    return out
  } catch {
    return {}
  }
}

function migrateLegacyBridgeMap(scopedKey: string, legacyKey: string): void {
  if (typeof window === 'undefined') return
  try {
    const current = parseBooleanEntityRecord(localStorage.getItem(scopedKey))
    if (Object.keys(current).length > 0) return
    const legacy = parseBooleanEntityRecord(localStorage.getItem(legacyKey))
    if (Object.keys(legacy).length === 0) return
    localStorage.setItem(scopedKey, JSON.stringify(legacy))
    localStorage.removeItem(legacyKey)
  } catch {
    /* ignore */
  }
}

/** @param userId — khi có user đăng nhập, lưu tách khỏi khách và tài khoản khác. */
export function loadBridgeVisitedEntityMap(userId?: string | null): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  const key = bridgeVisitedStorageKey(userId)
  migrateLegacyBridgeMap(key, LEGACY_BRIDGE_VISITED_KEY)
  return parseBooleanEntityRecord(localStorage.getItem(key))
}

export function saveBridgeVisitedEntityMap(map: Record<string, boolean>, userId?: string | null) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(bridgeVisitedStorageKey(userId), JSON.stringify(map))
  } catch {
    // ignore
  }
}

export function loadDiscoveryMap(userId?: string | null): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  const key = bridgeDiscoveryStorageKey(userId)
  migrateLegacyBridgeMap(key, LEGACY_BRIDGE_DISCOVERY_KEY)
  return parseBooleanEntityRecord(localStorage.getItem(key))
}

export function saveDiscoveryMap(map: Record<string, boolean>, userId?: string | null) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(bridgeDiscoveryStorageKey(userId), JSON.stringify(map))
  } catch {
    // ignore
  }
}

function safeLower(v: unknown) {
  return typeof v === 'string' ? v.toLowerCase() : ''
}

export function getEntityConceptMap(entityId: string): ShowcaseBridgeMap | null {
  const direct = SHOWCASE_ENTITY_CONCEPT_MAP.find((r) => r.entityId === entityId)
  if (direct) return direct
  const western = WESTERN_BRIDGE_BY_ID.get(entityId)
  if (western) return western
  const legacy = LEGACY_CONSTELLATION_TARGET_MAP[entityId]
  if (legacy) return WESTERN_BRIDGE_BY_ID.get(legacy) ?? null
  return null
}

/** Gộp map tĩnh + hints từ target sky (western skyculture). */
export function resolveConceptHintsForEntity(
  entityId: string,
  extraHints?: string[] | null,
): string[] {
  const row = getEntityConceptMap(entityId)
  const merged = [...(row?.conceptHints ?? []), ...(extraHints ?? [])]
    .map((h) => String(h || '').trim())
    .filter(Boolean)
  return [...new Set(merged)]
}

export function resolveMappedConcepts(
  concepts: LearningConcept[],
  entityId: string,
  extraHints?: string[] | null,
): LearningConcept[] {
  const hints = resolveConceptHintsForEntity(entityId, extraHints).map((h) => h.toLowerCase())
  if (!hints.length) return []
  return concepts.filter((c) => {
    const hay = [
      c.id,
      c.title || '',
      c.short_description || '',
      c.explanation || '',
      ...(c.aliases || []),
    ]
      .join(' ')
      .toLowerCase()
    return hints.some((h) => hay.includes(h))
  })
}

export function resolveMappedLessons(modules: LearningModule[], conceptIds: string[]) {
  const set = new Set(conceptIds)
  const out: Array<{ lessonId: string; title: string; href: string }> = []
  for (const mod of modules) {
    for (const node of mod.nodes) {
      for (const depth of ['beginner', 'explorer', 'researcher'] as const) {
        for (const lesson of node.depths[depth] || []) {
          const direct = (lesson.conceptIds || []).some((id) => set.has(id))
          const anchored = (lesson.conceptAnchors || []).some((a) => set.has(String(a.conceptId || '').trim()))
          if (!direct && !anchored) continue
          out.push({
            lessonId: lesson.id,
            title: lesson.titleVi || lesson.title || lesson.id,
            href: `/tutorial/${mod.id}/${node.id}/${encodeURIComponent(lesson.id)}`,
          })
        }
      }
    }
  }
  return out
}

/** Museum-style copy (Layer 1) — ngắn, độc lập Learning Path. */
const ENTITY_MUSEUM_LABEL_VI: Partial<Record<string, string>> = {
  'planet-earth':
    'Trái Đất là hành tinh đá duy nhất (tính đến nay) có nước lỏng trên bề mặt và sinh quyển rõ rệt. Đây là “điểm neo” để so sánh khí hậu, đại dương và sự sống với các thế giới khác.',
  'planet-mars':
    'Mars là hành tinh đá gần Trái Đất nhất, có băng và dấu vết nước trong quá khứ — lý do nó là mục tiêu tìm dấu hiệu sinh học cổ.',
  'planet-jupiter':
    'Jupiter là hành tinh khí khổng lồ: khối lượng lớn, từ trường mạnh, và hệ vệ tinh phong phú (gồm các mục tiêu “đại dương băng” như Europa).',
  'planet-saturn':
    'Saturn nổi bật với vành đai băng–đá và nhiều mặt trăng lớn (như Titan có khí quyển dày). Vành đai là “phòng thí nghiệm” về va chạm và hình thành hệ hành tinh.',
  'moon-titan':
    'Titan là mặt trăng duy nhất có khí quyển dày và hồ chất lỏng trên bề mặt — một thế giới thứ hai để học hóa học khí quyển và chu trình carbon.',
  'moon-europa':
    'Europa là mặt trăng băng với dấu hiệu đại dương dưới bề mặt — nơi người ta thảo luận về năng lượng thủy triều và khả năng môi trường sống.',
  'sc-cassini':
    'Cassini là tàu thăm dò từng quan sát cận Saturn và hệ vành/vệ tinh trong nhiều năm — ví dụ điển hình về quan sát hệ hành tinh bằng nhiều dụng cụ khoa học.',
}

export function getShowcaseMuseumLabelVi(
  entityId: string,
  displayName: string,
  /** Nội dung từ ShowcaseEntityContent (DB) — ưu tiên cao nhất. */
  editorialBlurbVi?: string | null,
): string {
  const ed = String(editorialBlurbVi || '').trim()
  if (ed) return ed
  const key = String(entityId || '').trim()
  if (WESTERN_CONSTELLATION_MUSEUM_VI[key]) return WESTERN_CONSTELLATION_MUSEUM_VI[key]
  const legacyWest = LEGACY_CONSTELLATION_TARGET_MAP[key]
  if (legacyWest && WESTERN_CONSTELLATION_MUSEUM_VI[legacyWest]) {
    return WESTERN_CONSTELLATION_MUSEUM_VI[legacyWest]
  }
  if (ENTITY_MUSEUM_LABEL_VI[key]) return ENTITY_MUSEUM_LABEL_VI[key]!
  const name = String(displayName || key || 'thiên thể').trim()
  return `Đây là “${name}” trong bản đồ khám phá 3D. Bạn có thể xoay/zoom để quan sát hình dạng và vị trí tương đối; phần liên kết bài học sẽ hiện bên dưới nếu lộ trình của bạn có nội dung liên quan.`
}

export function lessonClaimsEntity(lesson: LessonItem, entityId: string): boolean {
  const sc = lesson.sceneContext
  if (!sc) return false
  const e = String(entityId || '').trim()
  if (!e) return false
  if (String(sc.primaryEntityId || '').trim() === e) return true
  const ids = sc.entityIds || []
  return ids.some((id) => String(id || '').trim() === e)
}

export function resolveSceneContextLessons(
  modules: LearningModule[],
  entityId: string,
): Array<{ lessonId: string; title: string; href: string; primary: boolean }> {
  const e = String(entityId || '').trim()
  if (!e) return []
  const rows: Array<{ lessonId: string; title: string; href: string; primary: boolean }> = []
  for (const mod of modules) {
    for (const node of mod.nodes) {
      for (const depth of ['beginner', 'explorer', 'researcher'] as const) {
        for (const lesson of node.depths[depth] ?? []) {
          if (!lessonClaimsEntity(lesson, e)) continue
          const primary = String(lesson.sceneContext?.primaryEntityId || '').trim() === e
          rows.push({
            lessonId: lesson.id,
            title: lesson.titleVi || lesson.title || lesson.id,
            href: `/tutorial/${mod.id}/${node.id}/${encodeURIComponent(lesson.id)}`,
            primary,
          })
        }
      }
    }
  }
  const byId = new Map<string, (typeof rows)[0]>()
  for (const r of rows) {
    const prev = byId.get(r.lessonId)
    if (!prev) {
      byId.set(r.lessonId, r)
      continue
    }
    if (r.primary && !prev.primary) byId.set(r.lessonId, r)
  }
  return [...byId.values()].sort((a, b) => {
    if (a.primary !== b.primary) return a.primary ? -1 : 1
    return a.title.localeCompare(b.title, 'vi')
  })
}

/** Layer 2 (concept map) + Layer 3 (sceneContext) — gộp và khử trùng lessonId. */
export function resolveAllLessonsForEntity(
  modules: LearningModule[],
  concepts: LearningConcept[],
  entityId: string,
  extraHints?: string[] | null,
): Array<{ lessonId: string; title: string; href: string; source: 'scene' | 'concept' }> {
  const sceneRows = resolveSceneContextLessons(modules, entityId)
  const conceptRows = resolveMappedLessons(
    modules,
    resolveMappedConcepts(concepts, entityId, extraHints).map((c) => c.id),
  )
  const byId = new Map<string, { lessonId: string; title: string; href: string; source: 'scene' | 'concept' }>()
  for (const r of sceneRows) {
    byId.set(r.lessonId, { lessonId: r.lessonId, title: r.title, href: r.href, source: 'scene' })
  }
  for (const r of conceptRows) {
    if (byId.has(r.lessonId)) continue
    byId.set(r.lessonId, { lessonId: r.lessonId, title: r.title, href: r.href, source: 'concept' })
  }
  const primaries = new Set(sceneRows.filter((x) => x.primary).map((x) => x.lessonId))
  return [...byId.values()].sort((a, b) => {
    const ap = primaries.has(a.lessonId) ? 1 : 0
    const bp = primaries.has(b.lessonId) ? 1 : 0
    if (ap !== bp) return bp - ap
    if (a.source !== b.source) return a.source === 'scene' ? -1 : 1
    return a.title.localeCompare(b.title, 'vi')
  })
}

export type ExploreHistoryFocus = LessonHistoryFocus

export type LessonExploreTarget = {
  entityId: string
  href: string
  beatId?: number
  pinId?: string
}

export type LessonExploreTargets = {
  showcase: LessonExploreTarget | null
  history: LessonExploreTarget | null
}

/** Deep History — entity + beat/pin (song song showcase orbit). */
export function exploreHrefForHistory(
  entityIdRaw: unknown,
  focus: ExploreHistoryFocus,
): LessonExploreTarget | null {
  const entityId = String(entityIdRaw || '').trim()
  const beatId = Number(focus.beatId)
  if (!entityId || !Number.isFinite(beatId)) return null
  const params = new URLSearchParams()
  params.set('mode', 'showcase')
  params.set('entity', entityId)
  params.set('history', '1')
  params.set('beat', String(Math.round(beatId)))
  const pinId = String(focus.pinId || '').trim()
  if (pinId) params.set('pin', pinId)
  return { entityId, href: `/explore?${params.toString()}`, beatId: Math.round(beatId), pinId: pinId || undefined }
}

function exploreHrefForShowcaseEntity(entityIdRaw: unknown): { entityId: string; href: string } | null {
  const entityId = String(entityIdRaw || '').trim()
  if (!entityId) return null
  if (entityId.startsWith('constellation-')) {
    const skyId = resolveWesternConstellationTargetId(entityId) ?? entityId
    return { entityId: skyId, href: buildExploreHref({ view: 'sky', targetId: skyId }) }
  }
  const item = NASA_SHOWCASE_ITEMS.find((i) => i.id === entityId)
  const target = item?.linkedPlanetName ? item.linkedPlanetName.toLowerCase() : undefined
  const params = new URLSearchParams()
  params.set('mode', 'showcase')
  params.set('entity', entityId)
  if (target) params.set('target', target)
  return { entityId, href: `/explore?${params.toString()}` }
}

export function guessEntityRarity(entityId: string): 'common' | 'rare' | 'epic' {
  const id = safeLower(entityId)
  if (id.startsWith('constellation-')) return 'rare'
  if (id.includes('eris') || id.includes('sedna') || id.includes('haumea') || id.includes('makemake')) return 'epic'
  if (id.includes('comet') || id.includes('dwarf') || id.includes('spacecraft') || id.includes('charon')) return 'rare'
  return 'common'
}

/** Showcase orbit + Deep History (nếu sceneContext có historyFocus). */
export function suggestExploreTargetsForLesson(lesson: LessonItem): LessonExploreTargets {
  const sc = lesson.sceneContext
  if (sc) {
    const ordered: string[] = []
    const primary = String(sc.primaryEntityId || '').trim()
    if (primary) ordered.push(primary)
    for (const id of sc.entityIds || []) {
      const x = String(id || '').trim()
      if (x && !ordered.includes(x)) ordered.push(x)
    }
    let showcase: LessonExploreTarget | null = null
    for (const entityId of ordered) {
      const link = exploreHrefForShowcaseEntity(entityId)
      if (link) {
        showcase = link
        break
      }
    }
    const hf = sc.historyFocus
    const history = primary && hf ? exploreHrefForHistory(primary, hf) : null
    if (showcase || history) return { showcase, history }
  }
  const guessed = suggestShowcaseTargetForLesson(lesson)
  return { showcase: guessed, history: null }
}

export function suggestShowcaseTargetForLesson(
  lesson: LessonItem,
): { entityId: string; href: string } | null {
  const sc = lesson.sceneContext
  if (sc) {
    const ordered: string[] = []
    const primary = String(sc.primaryEntityId || '').trim()
    if (primary) ordered.push(primary)
    for (const id of sc.entityIds || []) {
      const x = String(id || '').trim()
      if (x && !ordered.includes(x)) ordered.push(x)
    }
    for (const entityId of ordered) {
      const link = exploreHrefForShowcaseEntity(entityId)
      if (link) return link
    }
  }

  const text = [
    lesson.id,
    lesson.titleVi || '',
    lesson.title || '',
    ...(lesson.conceptIds || []),
    ...(lesson.conceptAnchors || []).map((a) => a.conceptId),
  ]
    .join(' ')
    .toLowerCase()
  const scored = SHOWCASE_ENTITY_CONCEPT_MAP.map((row) => ({
    row,
    score: row.conceptHints.reduce((acc, hint) => (text.includes(hint.toLowerCase()) ? acc + 1 : acc), 0),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  const best = scored[0]?.row
  if (!best) return null
  return exploreHrefForShowcaseEntity(best.entityId)
}

function lessonRowsByIds(
  modules: LearningModule[],
  lessonIds: string[],
): Array<{ lessonId: string; title: string; href: string; source: 'cms' | 'scene' }> {
  const want = new Set(lessonIds.map((id) => String(id || '').trim()).filter(Boolean))
  if (want.size === 0) return []
  const out: Array<{ lessonId: string; title: string; href: string; source: 'cms' | 'scene' }> = []
  for (const mod of modules) {
    for (const node of mod.nodes) {
      for (const depth of ['beginner', 'explorer', 'researcher'] as const) {
        for (const lesson of node.depths[depth] || []) {
          if (!want.has(lesson.id)) continue
          out.push({
            lessonId: lesson.id,
            title: lesson.titleVi || lesson.title || lesson.id,
            href: `/tutorial/${mod.id}/${node.id}/${encodeURIComponent(lesson.id)}`,
            source: 'cms',
          })
        }
      }
    }
  }
  return out
}

/** Bài LP gắn Deep History qua sceneContext.historyFocus. */
export function resolveLessonsWithHistoryFocus(
  modules: LearningModule[],
  entityId: string,
  beatId?: number,
): Array<{ lessonId: string; title: string; href: string; source: 'scene' }> {
  const e = String(entityId || '').trim()
  if (!e) return []
  const rows: Array<{ lessonId: string; title: string; href: string; source: 'scene' }> = []
  for (const mod of modules) {
    for (const node of mod.nodes) {
      for (const depth of ['beginner', 'explorer', 'researcher'] as const) {
        for (const lesson of node.depths[depth] ?? []) {
          const sc = lesson.sceneContext
          if (!sc || String(sc.primaryEntityId || '').trim() !== e) continue
          const hf = sc.historyFocus
          if (!hf) continue
          if (beatId != null && Number(hf.beatId) !== beatId) continue
          rows.push({
            lessonId: lesson.id,
            title: lesson.titleVi || lesson.title || lesson.id,
            href: `/tutorial/${mod.id}/${node.id}/${encodeURIComponent(lesson.id)}`,
            source: 'scene',
          })
        }
      }
    }
  }
  return rows
}

/**
 * Explore Deep History → bài LP: CMS linkedLessonIds + sceneContext + concept bridge.
 */
export function resolveLessonsForNarrativeEntity(
  modules: LearningModule[],
  concepts: LearningConcept[],
  entityId: string,
  opts?: { linkedLessonIds?: string[]; beatId?: number },
): Array<{ lessonId: string; title: string; href: string; source: 'cms' | 'scene' | 'concept' }> {
  const cms = lessonRowsByIds(modules, opts?.linkedLessonIds ?? []).map((r) => ({ ...r, source: 'cms' as const }))
  const scene = resolveLessonsWithHistoryFocus(modules, entityId, opts?.beatId)
  const concept = resolveMappedLessons(modules, resolveMappedConcepts(concepts, entityId).map((c) => c.id)).map(
    (r) => ({ ...r, source: 'concept' as const }),
  )
  const byId = new Map<string, { lessonId: string; title: string; href: string; source: 'cms' | 'scene' | 'concept' }>()
  for (const r of [...cms, ...scene, ...concept]) {
    if (!byId.has(r.lessonId)) byId.set(r.lessonId, r)
  }
  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title, 'vi'))
}
