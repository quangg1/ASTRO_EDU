import { getApiPathBase } from '@/lib/apiConfig'
import { hasClientSession } from '@/features/auth/public'
import { apiFetch } from '@/lib/apiRequestInit'
import { syncGemWallet } from '@/features/rewards/public'

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
  | 'scene_entity_focus_duration'
  | 'scene_entity_clicked'
  | 'scene_concept_overlay_shown'
  | 'scene_contextual_quiz_prompted'
  | 'scene_contextual_quiz_passed'
  | 'scene_entity_discovered'
  | 'deep_history_beat_dwell'
  | 'deep_history_site_opened'
  | 'story_tour_completed'

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

type QueuedLearningPathEvent = LearningPathBehaviorEvent & {
  eventId: string
  schemaVersion: number
  sessionId: string
  anonSessionId: string
  client: 'web'
  timestamp: string
}

const SESSION_KEY = 'lp_behavior_session_id'
const SESSION_LAST_SEEN_KEY = 'lp_behavior_session_last_seen'
const ANON_SESSION_KEY = 'lp_anon_session_id'
const ANON_ATTRIBUTED_PREFIX = 'lp_anon_attributed_'
const SCHEMA_VERSION = 1
const MAX_BATCH_SIZE = 20
const FLUSH_INTERVAL_MS = 12000
const SESSION_IDLE_MS = 30 * 60 * 1000
const DEDUPE_WINDOW_MS = 1500

let queue: QueuedLearningPathEvent[] = []
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

/** Persistent guest id — gán userId sau login qua attribute-session. */
export function getAnonLearningSessionId() {
  if (typeof window === 'undefined') return null
  let existing = window.localStorage.getItem(ANON_SESSION_KEY)
  if (!existing) {
    existing = randomId()
    window.localStorage.setItem(ANON_SESSION_KEY, existing)
  }
  return existing
}

function makeEventKey(event: LearningPathBehaviorEvent) {
  return [
    event.eventName,
    event.moduleId || '',
    event.nodeId || '',
    event.lessonId || '',
    event.depth || '',
    String(event.metadata?.source || ''),
    String(event.metadata?.entityId || ''),
    String(event.metadata?.beatId ?? ''),
    String(event.metadata?.siteId || ''),
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

  const flushKeepalive = () => {
    void flushLearningPathBehavior({ keepalive: true })
  }

  window.addEventListener('beforeunload', flushKeepalive)
  window.addEventListener('pagehide', flushKeepalive)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushKeepalive()
  })
  window.addEventListener('galaxies-auth-signed-in', () => {
    void attributeGuestLearningSessionToUser()
  })
}

export async function attributeGuestLearningSessionToUser() {
  if (typeof window === 'undefined') return
  const anonSessionId = getAnonLearningSessionId()
  if (!hasClientSession() || !anonSessionId) return

  const flagKey = `${ANON_ATTRIBUTED_PREFIX}${anonSessionId}`
  if (window.localStorage.getItem(flagKey)) return

  try {
    const res = await apiFetch(`${getApiPathBase()}/learning-path/attribute-session`, {
      method: 'POST',
      body: JSON.stringify({ anonSessionId }),
    })
    if (res.ok) {
      window.localStorage.setItem(flagKey, '1')
    }
  } catch {
    // retry on next auth event or flush
  }
}

export function trackLearningPathBehavior(event: LearningPathBehaviorEvent) {
  if (typeof window === 'undefined') return
  bindLifecycleListeners()
  if (shouldDedupe(event)) return

  queue.push({
    ...event,
    eventId: randomId(),
    schemaVersion: SCHEMA_VERSION,
    sessionId: getLearningPathSessionId(),
    anonSessionId: getAnonLearningSessionId() || getLearningPathSessionId(),
    client: 'web',
    timestamp: event.timestamp || new Date().toISOString(),
  })

  if (queue.length >= MAX_BATCH_SIZE) {
    void flushLearningPathBehavior()
    return
  }
  scheduleFlush()
}

export async function flushLearningPathBehavior(opts?: { keepalive?: boolean }) {
  if (flushInFlight || queue.length === 0) return
  flushInFlight = true

  const batch = queue.slice(0, MAX_BATCH_SIZE)
  queue = queue.slice(MAX_BATCH_SIZE)

  try {
    const res = await apiFetch(`${getApiPathBase()}/learning-path/events/batch`, {
      method: 'POST',
      keepalive: Boolean(opts?.keepalive),
      body: JSON.stringify({ events: batch, schemaVersion: SCHEMA_VERSION }),
    })
    const data = (await res.json().catch(() => null)) as {
      data?: {
        rewards?: {
          gemsEarned?: number
          labels?: string[]
          levelUp?: boolean
          newAchievements?: Array<{ slug: string; titleVi: string }>
        }
      }
    } | null
    const rewards = data?.data?.rewards
    if (rewards?.gemsEarned && rewards.gemsEarned > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('learning-path-rewards', { detail: rewards }))
      void syncGemWallet()
      window.dispatchEvent(new CustomEvent('gem-wallet-changed'))
    }
    if (hasClientSession()) {
      void attributeGuestLearningSessionToUser()
    }
  } catch {
    queue = [...batch, ...queue].slice(0, 200)
  } finally {
    flushInFlight = false
    if (queue.length > 0) scheduleFlush()
  }
}
