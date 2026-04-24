import { getAuthBase } from '@/lib/apiConfig'
import { getToken } from '@/lib/authApi'

export type LearningPathBehaviorEventName =
  | 'lp_module_viewed'
  | 'lp_node_viewed'
  | 'lp_lesson_opened'
  | 'lp_lesson_completed_toggled'
  | 'lp_lesson_dwell'
  | 'lp_lesson_mastered'
  | 'lp_concept_opened'
  | 'lp_concept_anchor_clicked'
  | 'lp_depth_switched'
  | 'lp_path_exited'

export type LearningPathBehaviorEvent = {
  eventName: LearningPathBehaviorEventName
  moduleId?: string | null
  nodeId?: string | null
  lessonId?: string | null
  depth?: 'beginner' | 'explorer' | 'researcher' | null
  timestamp?: string
  durationSec?: number
  activeSec?: number
  idleSec?: number
  completed?: boolean
  metadata?: Record<string, unknown>
}

const SESSION_KEY = 'lp_behavior_session_id'
const SESSION_LAST_SEEN_KEY = 'lp_behavior_session_last_seen'
const MAX_BATCH_SIZE = 20
const FLUSH_INTERVAL_MS = 12000
const SESSION_IDLE_MS = 30 * 60 * 1000
const DEDUPE_WINDOW_MS = 1500

let queue: Array<LearningPathBehaviorEvent & { sessionId: string; client: 'web'; timestamp: string }> = []
let flushTimer: number | null = null
let flushInFlight = false
let listenersBound = false
const recentEventKeys = new Map<string, number>()

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `lp-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

export function getLearningPathSessionId() {
  if (typeof window === 'undefined') return 'server'
  const now = Date.now()
  const existing = window.sessionStorage.getItem(SESSION_KEY)
  const lastSeen = Number(window.sessionStorage.getItem(SESSION_LAST_SEEN_KEY) || '0')
  if (existing && now - lastSeen < SESSION_IDLE_MS) {
    window.sessionStorage.setItem(SESSION_LAST_SEEN_KEY, String(now))
    return existing
  }
  const next = randomId()
  window.sessionStorage.setItem(SESSION_KEY, next)
  window.sessionStorage.setItem(SESSION_LAST_SEEN_KEY, String(now))
  return next
}

function makeEventKey(event: LearningPathBehaviorEvent) {
  return [
    event.eventName,
    event.moduleId || '',
    event.nodeId || '',
    event.lessonId || '',
    event.depth || '',
    String(event.metadata?.source || ''),
  ].join('::')
}

function shouldDedupe(event: LearningPathBehaviorEvent) {
  if (!['lp_module_viewed', 'lp_node_viewed', 'lp_lesson_opened'].includes(event.eventName)) return false
  const key = makeEventKey(event)
  const now = Date.now()
  const lastSeen = recentEventKeys.get(key) || 0
  recentEventKeys.set(key, now)
  return now - lastSeen < DEDUPE_WINDOW_MS
}

function scheduleFlush() {
  if (typeof window === 'undefined') return
  if (flushTimer !== null) return
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    void flushLearningPathBehavior()
  }, FLUSH_INTERVAL_MS)
}

function bindLifecycleListeners() {
  if (typeof window === 'undefined' || listenersBound) return
  listenersBound = true

  const flushNow = () => {
    void flushLearningPathBehavior()
  }

  window.addEventListener('beforeunload', flushNow)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow()
  })
}

export function trackLearningPathBehavior(event: LearningPathBehaviorEvent) {
  if (typeof window === 'undefined') return
  bindLifecycleListeners()
  if (shouldDedupe(event)) return

  queue.push({
    ...event,
    sessionId: getLearningPathSessionId(),
    client: 'web',
    timestamp: event.timestamp || new Date().toISOString(),
  })

  if (queue.length >= MAX_BATCH_SIZE) {
    void flushLearningPathBehavior()
    return
  }
  scheduleFlush()
}

export async function flushLearningPathBehavior() {
  if (flushInFlight || queue.length === 0) return
  flushInFlight = true

  const batch = queue.slice(0, MAX_BATCH_SIZE)
  queue = queue.slice(MAX_BATCH_SIZE)

  try {
    const token = getToken()
    await fetch(`${getAuthBase()}/api/learning-path/events/batch`, {
      method: 'POST',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ events: batch }),
    })
  } catch {
    queue = [...batch, ...queue].slice(0, 200)
  } finally {
    flushInFlight = false
    if (queue.length > 0) scheduleFlush()
  }
}
