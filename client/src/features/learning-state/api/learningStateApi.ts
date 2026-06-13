import { getApiPathBase } from '@/lib/apiConfig'
import { apiClientHeaders, apiFetchInit } from '@/lib/apiClientHeaders'
import { hasClientSession } from '@/features/auth/public'

const base = () => {
  const root = getApiPathBase()
  return root ? `${root}/learning-state` : '/api/learning-state'
}

function authHeaders(): HeadersInit {
  return apiClientHeaders()
}

export type LearningStateEventInput = {
  eventId?: string
  type: string
  lessonId?: string
  conceptId?: string
  entityId?: string
  surface?: string
  payload?: Record<string, unknown>
  timestamp?: string
}

export async function postLearningStateEvents(
  events: LearningStateEventInput | LearningStateEventInput[],
): Promise<boolean> {
  if (!hasClientSession()) return false
  const list = Array.isArray(events) ? events : [events]
  const res = await fetch(`${base()}/events`, apiFetchInit({
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ events: list }),
  })).catch(() => null)
  const data = await res?.json().catch(() => ({}))
  return Boolean(res?.ok && data?.success)
}

/** Ghi state học tập từ Explore/3D (song song telemetry LP). */
export async function postExploreLearningStateEvent(
  type: 'explore_entity_focus' | 'explore_entity_discovered' | 'explore_quiz_submitted',
  payload: {
    entityId: string
    dwellSec?: number
    conceptIds?: string[]
    lessonIds?: string[]
    allCorrect?: boolean
    correctCount?: number
    totalCount?: number
    score?: number
    exploreView?: string
  },
  eventId?: string,
): Promise<boolean> {
  return postLearningStateEvents({
    eventId,
    type,
    entityId: payload.entityId,
    surface: 'explore',
    payload: {
      dwellSec: payload.dwellSec,
      conceptIds: payload.conceptIds,
      lessonIds: payload.lessonIds,
      allCorrect: payload.allCorrect,
      correctCount: payload.correctCount,
      totalCount: payload.totalCount,
      score: payload.score,
      exploreView: payload.exploreView,
    },
  })
}

export type ConceptLearningStateSummary = {
  conceptId: string
  mastery: number
  confidence: number
  nextBestAction: string
  attemptCount: number
  lastPassedAt: string | null
  misconceptionCount: number
}

export async function fetchConceptLearningStates(
  conceptIds: string[],
): Promise<ConceptLearningStateSummary[]> {
  if (!hasClientSession() || !conceptIds.length) return []
  const ids = conceptIds.slice(0, 12).join(',')
  const res = await fetch(`${base()}/concepts?ids=${encodeURIComponent(ids)}`, apiFetchInit({
    headers: authHeaders(),
  })).catch(() => null)
  if (!res?.ok) return []
  const data = await res.json().catch(() => ({}))
  return Array.isArray(data.concepts) ? data.concepts : []
}

export async function fetchLearningStateSnapshot(): Promise<Record<string, unknown> | null> {
  if (!hasClientSession()) return null
  const res = await fetch(`${base()}/snapshot`, apiFetchInit({ headers: authHeaders() })).catch(() => null)
  if (!res?.ok) return null
  const data = await res.json().catch(() => ({}))
  return data.snapshot ?? null
}
