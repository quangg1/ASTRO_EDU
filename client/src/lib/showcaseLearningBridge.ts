import type { LearningConcept, LearningModule, LessonItem } from '@/data/learningPathCurriculum'
import type { RecallQuestion } from '@/lib/lessonRecallQuiz'
import { normalizeStudioRecallQuiz } from '@/lib/lessonRecallQuiz'
import { NASA_SHOWCASE_ITEMS } from '@/lib/showcaseEntities'

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

const BRIDGE_VISITED_KEY = 'showcase-bridge-visited-v1'
const BRIDGE_DISCOVERY_KEY = 'showcase-discovery-v1'

function safeLower(v: unknown) {
  return typeof v === 'string' ? v.toLowerCase() : ''
}

export function getEntityConceptMap(entityId: string): ShowcaseBridgeMap | null {
  return SHOWCASE_ENTITY_CONCEPT_MAP.find((r) => r.entityId === entityId) ?? null
}

export function resolveMappedConcepts(
  concepts: LearningConcept[],
  entityId: string,
): LearningConcept[] {
  const row = getEntityConceptMap(entityId)
  if (!row) return []
  const hints = row.conceptHints.map((h) => h.toLowerCase())
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
): Array<{ lessonId: string; title: string; href: string; source: 'scene' | 'concept' }> {
  const sceneRows = resolveSceneContextLessons(modules, entityId)
  const conceptRows = resolveMappedLessons(
    modules,
    resolveMappedConcepts(concepts, entityId).map((c) => c.id),
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

export function buildContextualQuizFromLessons(modules: LearningModule[], lessonIds: string[], limit = 2): RecallQuestion[] {
  const set = new Set(lessonIds)
  const picked: RecallQuestion[] = []
  for (const mod of modules) {
    for (const node of mod.nodes) {
      for (const depth of ['beginner', 'explorer', 'researcher'] as const) {
        for (const lesson of node.depths[depth] || []) {
          if (!set.has(lesson.id)) continue
          const qs = normalizeStudioRecallQuiz(lesson)
          for (const q of qs) {
            picked.push(q)
            if (picked.length >= limit) return picked
          }
        }
      }
    }
  }
  return picked
}

export function loadBridgeVisitedEntityMap(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(BRIDGE_VISITED_KEY)
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

export function saveBridgeVisitedEntityMap(map: Record<string, boolean>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(BRIDGE_VISITED_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

export function loadDiscoveryMap(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(BRIDGE_DISCOVERY_KEY)
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

export function saveDiscoveryMap(map: Record<string, boolean>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(BRIDGE_DISCOVERY_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

export function guessEntityRarity(entityId: string): 'common' | 'rare' | 'epic' {
  const id = safeLower(entityId)
  if (id.includes('eris') || id.includes('sedna') || id.includes('haumea') || id.includes('makemake')) return 'epic'
  if (id.includes('comet') || id.includes('dwarf') || id.includes('spacecraft') || id.includes('charon')) return 'rare'
  return 'common'
}

export function suggestShowcaseTargetForLesson(
  lesson: LessonItem,
): { entityId: string; href: string } | null {
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
  const item = NASA_SHOWCASE_ITEMS.find((i) => i.id === best.entityId)
  const target = item?.linkedPlanetName ? item.linkedPlanetName.toLowerCase() : undefined
  const params = new URLSearchParams()
  params.set('mode', 'showcase')
  params.set('entity', best.entityId)
  if (target) params.set('target', target)
  return { entityId: best.entityId, href: `/explore?${params.toString()}` }
}

