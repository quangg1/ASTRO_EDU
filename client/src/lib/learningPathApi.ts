import { getApiPathBase } from './apiConfig'
import type { LearningConcept, LearningModule, LessonItem, LessonRecallQuizItem } from '@/data/learningPathCurriculum'

const API = `${getApiPathBase()}/learning-path`

export type BridgeRuleEvent =
  | 'entity_focus_stable'
  | 'entity_clicked'
  | 'entity_discovered_first_time'
  | 'entity_focus_duration'
export type BridgeRuleAction =
  | 'show_concept_overlay'
  | 'mark_lessons_visited3d'
  | 'trigger_contextual_quiz'
  | 'unlock_discovery_badge'
export type LearningPathBridgeRule = {
  id: string
  entityId: string
  event: BridgeRuleEvent
  action: BridgeRuleAction
  conceptId?: string
  thresholdSec?: number | null
  active?: boolean
}

/** Đảm bảo mỗi node có topicWeights[] (API/Mongo đôi khi không trả field) */
function normalizeEditorModules(modules: LearningModule[]): LearningModule[] {
  return modules.map((m) => ({
    ...m,
    nodes: (m.nodes || []).map((n) => ({
      ...n,
      topicWeights: Array.isArray(n.topicWeights)
        ? n.topicWeights.map((tw) => ({
            topicId: String((tw as { topicId?: string }).topicId || ''),
            weight: Math.max(0, Math.min(1, Number((tw as { weight?: number }).weight) || 0)),
          }))
        : [],
    })),
  }))
}

export async function fetchPublicLearningPath(): Promise<LearningModule[] | null> {
  try {
    const res = await fetch(API, { cache: 'no-store' })
    const data = await res.json()
    if (data.success && Array.isArray(data.data?.modules)) return data.data.modules as LearningModule[]
    return null
  } catch {
    return null
  }
}

export async function fetchPublicLearningPathData(): Promise<{
  modules: LearningModule[]
  concepts: LearningConcept[]
  bridgeRules: LearningPathBridgeRule[]
} | null> {
  try {
    const res = await fetch(API, { cache: 'no-store' })
    const data = await res.json()
    if (data.success && Array.isArray(data.data?.modules)) {
      return {
        modules: data.data.modules as LearningModule[],
        concepts: Array.isArray(data.data?.concepts) ? (data.data.concepts as LearningConcept[]) : [],
        bridgeRules: Array.isArray(data.data?.bridgeRules) ? (data.data.bridgeRules as LearningPathBridgeRule[]) : [],
      }
    }
    return null
  } catch {
    return null
  }
}

export async function fetchEditorLearningPath(token: string): Promise<{
  modules: LearningModule[]
  concepts: LearningConcept[]
  bridgeRules: LearningPathBridgeRule[]
  published: boolean
} | null> {
  try {
    const res = await fetch(`${API}/editor`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.success && Array.isArray(data.data?.modules)) {
      return {
        modules: normalizeEditorModules(data.data.modules as LearningModule[]),
        concepts: Array.isArray(data.data?.concepts) ? (data.data.concepts as LearningConcept[]) : [],
        bridgeRules: Array.isArray(data.data?.bridgeRules) ? (data.data.bridgeRules as LearningPathBridgeRule[]) : [],
        published: !!data.data.published,
      }
    }
    return null
  } catch {
    return null
  }
}

export async function saveEditorLearningPath(
  token: string,
  modules: LearningModule[],
  bridgeRules?: LearningPathBridgeRule[],
  published?: boolean,
): Promise<{
  ok: boolean
  modules?: LearningModule[]
  concepts?: LearningConcept[]
  bridgeRules?: LearningPathBridgeRule[]
  published?: boolean
  invalidConceptIds?: string[]
  error?: string
}> {
  try {
    const res = await fetch(`${API}/editor`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ modules, bridgeRules, published }),
    })
    const data = await res.json()
    if (data.success && Array.isArray(data.data?.modules)) {
      return {
        ok: true,
        modules: normalizeEditorModules(data.data.modules as LearningModule[]),
        concepts: Array.isArray(data.data?.concepts) ? (data.data.concepts as LearningConcept[]) : [],
        bridgeRules: Array.isArray(data.data?.bridgeRules) ? (data.data.bridgeRules as LearningPathBridgeRule[]) : [],
        published: !!data.data?.published,
        invalidConceptIds: Array.isArray(data.data?.invalidConceptIds) ? data.data.invalidConceptIds : [],
      }
    }
    if (data.success) return { ok: true }
    return { ok: false, error: data.error || 'Save failed' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function generateRecallQuizForLesson(
  token: string,
  lesson: LessonItem,
): Promise<{ ok: boolean; recallQuiz?: LessonRecallQuizItem[]; error?: string }> {
  try {
    const res = await fetch(`${API}/editor/generate-quiz`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lesson }),
    })
    const data = await res.json()
    if (data.success && Array.isArray(data.data?.recallQuiz)) {
      return { ok: true, recallQuiz: data.data.recallQuiz as LessonRecallQuizItem[] }
    }
    return { ok: false, error: data.error || 'Generate quiz failed' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}
