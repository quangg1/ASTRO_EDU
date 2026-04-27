import { DEPTH_ORDER, type LearningConcept, type LearningModule } from '@/data/learningPathCurriculum'
import type { LessonCompletionMap } from '@/lib/learningPathProgress'

export type StarMapNode = {
  id: string
  name: string
  domain: string
  val: number
  degree: number
  difficultyLevel: 0 | 1 | 2
  encountered: boolean
  frontier: boolean
}

export type StarMapLink = { source: string; target: string }

/** Màu theo domain — tông “star map” tối. */
export const DOMAIN_NODE_COLORS: Record<string, { bright: string; dim: string }> = {
  astronomy: { bright: '#38bdf8', dim: 'rgba(56,189,248,0.56)' },
  geology: { bright: '#a78bfa', dim: 'rgba(167,139,250,0.56)' },
  biology: { bright: '#34d399', dim: 'rgba(52,211,153,0.56)' },
  physics: { bright: '#fbbf24', dim: 'rgba(251,191,36,0.56)' },
  chemistry: { bright: '#fb7185', dim: 'rgba(251,113,133,0.56)' },
  misc: { bright: '#94a3b8', dim: 'rgba(148,163,184,0.5)' },
}

export function domainColorPair(domain: string) {
  const d = String(domain || '').trim().toLowerCase() || 'misc'
  return DOMAIN_NODE_COLORS[d] ?? DOMAIN_NODE_COLORS.misc
}

/** Concept đã “gặp” qua bài đã complete (conceptIds + anchors). */
export function buildSeenConceptIds(modules: LearningModule[], completion: LessonCompletionMap): Set<string> {
  const seen = new Set<string>()
  for (const m of modules) {
    for (const n of m.nodes) {
      for (const depth of DEPTH_ORDER) {
        for (const lesson of n.depths[depth] ?? []) {
          if (!completion[lesson.id]) continue
          for (const cid of lesson.conceptIds ?? []) {
            const id = String(cid || '').trim()
            if (id) seen.add(id)
          }
          for (const a of lesson.conceptAnchors ?? []) {
            const id = String(a.conceptId || '').trim()
            if (id) seen.add(id)
          }
        }
      }
    }
  }
  return seen
}

export function buildStarMapGraph(
  concepts: LearningConcept[],
  seen: Set<string>,
): { nodes: StarMapNode[]; links: StarMapLink[] } {
  const idSet = new Set(concepts.map((c) => c.id))
  const dependents = buildDependentsMap(concepts)
  const nodes: StarMapNode[] = concepts.map((c) => {
    const nPr = (c.prerequisites ?? []).filter((p) => idSet.has(p)).length
    const nDep = dependents.get(c.id)?.size ?? 0
    const degree = nPr + nDep
    const prerequisiteIds = (c.prerequisites ?? []).filter((p) => idSet.has(p))
    const frontier = !seen.has(c.id) && prerequisiteIds.length > 0 && prerequisiteIds.every((pid) => seen.has(pid))
    const rawDifficulty = Number(c.difficulty_level)
    let difficultyLevel: 0 | 1 | 2 = 1
    // Support both 0/1/2 and 1/2/3 conventions from data pipelines.
    if (rawDifficulty === 0 || rawDifficulty === 1 || rawDifficulty === 2) {
      difficultyLevel = rawDifficulty as 0 | 1 | 2
    } else if (rawDifficulty === 3) {
      difficultyLevel = 2
    }
    return {
      id: c.id,
      name: (c.title || c.id).slice(0, 48),
      domain: (c.domain || 'misc').toLowerCase() || 'misc',
      val: Math.max(1, 1 + Math.min(12, Math.sqrt(degree + 1))),
      degree,
      difficultyLevel,
      encountered: seen.has(c.id),
      frontier,
    }
  })
  const links: StarMapLink[] = []
  for (const c of concepts) {
    for (const p of c.prerequisites ?? []) {
      const from = String(p || '').trim()
      if (!from || !idSet.has(from) || from === c.id) continue
      links.push({ source: from, target: c.id })
    }
  }
  return { nodes, links }
}

export function uniqDomains(concepts: LearningConcept[]): string[] {
  const s = new Set<string>()
  for (const c of concepts) {
    const d = (c.domain || 'misc').toLowerCase().trim() || 'misc'
    s.add(d)
  }
  return [...s].sort((a, b) => a.localeCompare(b))
}

/** conceptId → các concept có prerequisite trỏ về id này. */
export function buildDependentsMap(concepts: LearningConcept[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>()
  for (const c of concepts) {
    const id = c.id
    for (const p of c.prerequisites ?? []) {
      const pid = String(p || '').trim()
      if (!pid) continue
      if (!m.has(pid)) m.set(pid, new Set())
      m.get(pid)!.add(id)
    }
  }
  return m
}

/** BFS trên đồ thị vô hướng (prereq ↔ dependent) trong phạm vi `concepts`. */
export function collectEgoNodeIds(concepts: LearningConcept[], centerId: string, hops: number): Set<string> {
  const idSet = new Set(concepts.map((c) => c.id))
  if (!centerId || !idSet.has(centerId)) return new Set()
  const byId = new Map(concepts.map((c) => [c.id, c]))
  const dependents = buildDependentsMap(concepts)
  const out = new Set<string>()
  let frontier = new Set([centerId])
  for (let h = 0; h <= hops; h++) {
    for (const id of frontier) out.add(id)
    if (h === hops) break
    const next = new Set<string>()
    for (const id of frontier) {
      const c = byId.get(id)
      for (const p of c?.prerequisites ?? []) {
        const pid = String(p || '').trim()
        if (idSet.has(pid)) next.add(pid)
      }
      for (const d of dependents.get(id) ?? []) {
        if (idSet.has(d)) next.add(d)
      }
    }
    frontier = next
  }
  return out
}

export function filterGraphByNodeIds(
  full: { nodes: StarMapNode[]; links: StarMapLink[] },
  keep: Set<string>,
): { nodes: StarMapNode[]; links: StarMapLink[] } {
  if (keep.size === 0) return { nodes: [], links: [] }
  const nodes = full.nodes.filter((n) => keep.has(n.id))
  const links = full.links.filter((l) => keep.has(l.source) && keep.has(l.target))
  return { nodes, links }
}

export function searchConcepts(concepts: LearningConcept[], query: string, limit = 14): LearningConcept[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const out: LearningConcept[] = []
  for (const c of concepts) {
    const id = c.id.toLowerCase()
    const title = (c.title || '').toLowerCase()
    const short = (c.short_description || '').toLowerCase()
    if (id.includes(q) || title.includes(q) || short.includes(q)) {
      out.push(c)
      if (out.length >= limit) break
    }
  }
  return out
}
