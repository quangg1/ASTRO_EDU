'use client'

import { getToken } from '@/features/auth/public'
import { getApiPathBase } from '@/lib/apiConfig'

const BASE = getApiPathBase()

export type CourseBehaviorEventName =
  | 'course_lesson_opened'
  | 'course_lesson_dwell'
  | 'course_lesson_completed'
  | 'course_quiz_entered'
  | 'course_assignment_viewed'

export type CourseBehaviorEvent = {
  eventName: CourseBehaviorEventName
  courseSlug: string
  lessonSlug: string
  cohortId?: string | null
  timestamp?: string
  durationSec?: number
  metadata?: Record<string, unknown>
}

const SESSION_KEY = 'course_behavior_session_id'
const SESSION_LAST_SEEN_KEY = 'course_behavior_session_last_seen'
const MAX_BATCH_SIZE = 20
const FLUSH_INTERVAL_MS = 12000
const SESSION_IDLE_MS = 30 * 60 * 1000
const DEDUPE_WINDOW_MS = 1500

let queue: Array<CourseBehaviorEvent & { sessionId: string; client: 'web'; timestamp: string }> = []
let flushTimer: number | null = null
let flushInFlight = false
let listenersBound = false
const recentEventKeys = new Map<string, number>()

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `cb-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

export function getCourseBehaviorSessionId() {
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

function makeEventKey(event: CourseBehaviorEvent) {
  return [event.eventName, event.courseSlug, event.lessonSlug, event.cohortId || ''].join('::')
}

function shouldDedupe(event: CourseBehaviorEvent) {
  if (!['course_lesson_opened', 'course_assignment_viewed', 'course_quiz_entered'].includes(event.eventName)) {
    return false
  }
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
    void flushCourseBehavior()
  }, FLUSH_INTERVAL_MS)
}

function bindLifecycleListeners() {
  if (typeof window === 'undefined' || listenersBound) return
  listenersBound = true
  const flushNow = () => void flushCourseBehavior()
  window.addEventListener('beforeunload', flushNow)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow()
  })
}

export function trackCourseBehavior(event: CourseBehaviorEvent) {
  if (typeof window === 'undefined') return
  bindLifecycleListeners()
  if (shouldDedupe(event)) return

  queue.push({
    ...event,
    sessionId: getCourseBehaviorSessionId(),
    client: 'web',
    timestamp: event.timestamp || new Date().toISOString(),
  })

  if (queue.length >= MAX_BATCH_SIZE) {
    void flushCourseBehavior()
    return
  }
  scheduleFlush()
}

export async function flushCourseBehavior() {
  if (flushInFlight || queue.length === 0) return
  const batch = queue.splice(0, MAX_BATCH_SIZE)
  const courseSlug = batch[0]?.courseSlug
  if (!courseSlug) return
  flushInFlight = true
  try {
    const token = getToken()
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) (headers as Record<string, string>).Authorization = `Bearer ${token}`
    await fetch(`${BASE}/courses/${encodeURIComponent(courseSlug)}/events/batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    })
  } catch {
    queue.unshift(...batch)
  } finally {
    flushInFlight = false
    if (queue.length > 0) scheduleFlush()
  }
}
