import type { LearningConcept, LearningModule } from '@/data/learningPathCurriculum'
import type { RecallQuestion } from '@/lib/lessonRecallQuiz'
import { normalizeStudioRecallQuiz } from '@/lib/lessonRecallQuiz'
import type { LessonItem } from '@/data/learningPathCurriculum'
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

