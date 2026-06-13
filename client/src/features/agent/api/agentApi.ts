import { getApiPathBase } from '@/lib/apiConfig'
import { getToken, hasClientSession } from '@/features/auth/public'
import { apiRequestInit, usesCookieAuth } from '@/lib/apiRequestInit'
import type { RecallQuizDeliveryQuestion } from '@/features/learning-path/public'
import type {
  AgentMessageResponse,
  AgentSessionDetail,
  AgentSessionSummary,
  LearnerSnapshot,
  SessionContext,
} from '../types'

const GUEST_KEY = 'galaxies_agent_guest_session'

export function getAgentGuestSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(GUEST_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(GUEST_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

function agentHeaders(stream: boolean): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (stream) {
    h.Accept = 'text/event-stream'
  } else {
    h.Accept = 'application/json'
  }
  if (!usesCookieAuth()) {
    const token = getToken()
    if (token) h.Authorization = `Bearer ${token}`
    else {
      const guest = getAgentGuestSessionId()
      if (guest) h['X-Agent-Guest-Session'] = guest
    }
  } else {
    const guest = getAgentGuestSessionId()
    if (guest) h['X-Agent-Guest-Session'] = guest
  }
  return h
}

function agentFetchInit(init?: RequestInit, stream = false): RequestInit {
  const extra = (init?.headers || {}) as Record<string, string>
  return apiRequestInit(
    {
      ...init,
      headers: { ...agentHeaders(stream), ...extra },
    },
    true,
  )
}

export function getAgentApiBase(): string {
  const base = getApiPathBase()
  return base ? `${base}/agent` : '/api/agent'
}

export type AgentStreamEvent =
  | { event: 'session'; data: AgentMessageResponse['session'] }
  | { event: 'status'; data: { phase?: string } }
  | { event: 'token'; data: { content: string } }
  | { event: 'tool_calls'; data: { tool_calls: unknown } }
  | { event: 'tool_results'; data: { tool_results: AgentMessageResponse['tool_results'] } }
  | { event: 'fallback'; data: { chips?: Array<{ label: string; action: string }> } }
  | { event: 'cache_meta'; data: { source?: string; cacheEntryId?: string | null; kind?: string | null } }
  | { event: 'done'; data: { ok?: boolean; fallback?: boolean; fast_path?: string } }
  | { event: 'error'; data: { error?: string } }

/** Let the browser paint between SSE events (avoids one React commit for the whole reply). */
function yieldToRenderer(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
    } else {
      setTimeout(resolve, 0)
    }
  })
}

async function consumeSse(
  res: Response,
  onEvent: (ev: AgentStreamEvent) => void,
): Promise<void> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const parts = buf.split('\n\n')
    buf = parts.pop() || ''
    for (const block of parts) {
      const lines = block.split('\n')
      let event = 'message'
      let dataLine = ''
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        if (line.startsWith('data:')) dataLine = line.slice(5).trim()
      }
      if (!dataLine) continue
      try {
        const data = JSON.parse(dataLine) as AgentStreamEvent['data']
        onEvent({ event, data } as AgentStreamEvent)
        if (event === 'token') {
          await yieldToRenderer()
        }
      } catch {
        /* ignore malformed */
      }
    }
  }
}

export async function postAgentMessage(params: {
  messages: Array<{ role: string; content: string }>
  sessionContext: SessionContext
  learnerSnapshot?: LearnerSnapshot
  sessionId?: string
  image_base64?: string
  image_media_type?: string
  /** Default true — SSE per Phase 0.6 */
  stream?: boolean
  onStreamEvent?: (ev: AgentStreamEvent) => void
}): Promise<AgentMessageResponse> {
  const useStream = params.stream !== false
  const url = `${getAgentApiBase()}/message${useStream ? '?stream=1' : '?stream=0'}`
  const res = await fetch(url, agentFetchInit({
    method: 'POST',
    body: JSON.stringify({
      messages: params.messages,
      session_context: params.sessionContext,
      learner_snapshot: params.learnerSnapshot,
      sessionId: params.sessionId,
      image_base64: params.image_base64,
      image_media_type: params.image_media_type,
    }),
  }))

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
    return {
      success: false,
      error: typeof data.error === 'string' ? data.error : 'Agent request failed',
      code: data.code,
    }
  }

  if (useStream && params.onStreamEvent) {
    let content = ''
    let session: AgentMessageResponse['session']
    let tool_calls: unknown
    let tool_results: AgentMessageResponse['tool_results']
    let fallback = false
    let chips: AgentMessageResponse['chips']

    await consumeSse(res, (ev) => {
      params.onStreamEvent?.(ev)
      if (ev.event === 'session') session = ev.data
      if (ev.event === 'token') content += ev.data.content || ''
      if (ev.event === 'tool_calls') tool_calls = ev.data.tool_calls
      if (ev.event === 'tool_results') tool_results = ev.data.tool_results
      if (ev.event === 'fallback') {
        fallback = true
        chips = ev.data.chips
      }
      if (ev.event === 'done' && ev.data.fallback) fallback = true
    })

    if (session?.guestSessionId && typeof window !== 'undefined') {
      try {
        localStorage.setItem(GUEST_KEY, session.guestSessionId)
      } catch {
        /* ignore */
      }
    }

    return {
      success: true,
      session,
      message: { role: 'assistant', content },
      tool_calls: tool_calls as AgentMessageResponse['tool_calls'],
      tool_results,
      fallback,
      chips,
    }
  }

  const data = (await res.json().catch(() => ({}))) as AgentMessageResponse & {
    error?: string
    code?: string
  }
  if (data.session?.guestSessionId && typeof window !== 'undefined') {
    try {
      localStorage.setItem(GUEST_KEY, data.session.guestSessionId)
    } catch {
      /* ignore */
    }
  }
  return { ...data, success: true }
}

export async function prefetchAgentContext(
  sessionContext: SessionContext,
  learnerSnapshot?: LearnerSnapshot,
): Promise<void> {
  if (!hasClientSession()) return
  await fetch(`${getAgentApiBase()}/context/prefetch`, agentFetchInit({
    method: 'POST',
    body: JSON.stringify({
      session_context: sessionContext,
      learner_snapshot: learnerSnapshot,
    }),
  })).catch(() => {})
}

export async function fetchAgentSnapshot(): Promise<LearnerSnapshot | null> {
  if (!hasClientSession()) return null
  const res = await fetch(`${getAgentApiBase()}/snapshot`, agentFetchInit({}))
  if (!res.ok) return null
  const data = (await res.json()) as { snapshot?: LearnerSnapshot }
  return data.snapshot ?? null
}

export async function fetchAgentCoachNudge(params: {
  lessonId?: string
  sessionId?: string
}): Promise<{
  allowed: boolean
  message?: string
  chips?: Array<{ label: string; action: string; lessonId?: string }>
  reason?: string
} | null> {
  if (!hasClientSession()) return null
  const q = new URLSearchParams()
  if (params.lessonId) q.set('lessonId', params.lessonId)
  if (params.sessionId) q.set('sessionId', params.sessionId)
  const res = await fetch(`${getAgentApiBase()}/coach-nudge?${q}`, agentFetchInit({}))
  if (!res.ok) return null
  const data = (await res.json()) as {
    allowed?: boolean
    message?: string
    chips?: Array<{ label: string; action: string; lessonId?: string }>
    reason?: string
  }
  return {
    allowed: Boolean(data.allowed),
    message: data.message,
    chips: data.chips,
    reason: data.reason,
  }
}

export async function dismissAgentCoach(): Promise<void> {
  if (!hasClientSession()) return
  await fetch(`${getAgentApiBase()}/coach/dismiss`, agentFetchInit({ method: 'POST' })).catch(() => {})
}

export async function postAgentQuizOutcome(body: {
  lessonId: string
  passed: boolean
  misconceptionTag?: string
}): Promise<void> {
  if (!hasClientSession()) return
  await fetch(`${getAgentApiBase()}/quiz-outcome`, agentFetchInit({
    method: 'POST',
    body: JSON.stringify(body),
  })).catch(() => {})
}

export async function fetchSpacedReviewDue(limit = 5): Promise<{
  dueLessons: Array<{
    lessonId: string
    title: string
    moduleId?: string
    nodeId?: string
    dueReason?: string
  }>
  totalDue: number
} | null> {
  if (!hasClientSession()) return null
  const res = await fetch(`${getAgentApiBase()}/spaced-review?limit=${limit}`, agentFetchInit({}))
  if (!res.ok) return null
  const data = (await res.json()) as {
    dueLessons?: Array<{
      lessonId: string
      title: string
      moduleId?: string
      nodeId?: string
    }>
    totalDue?: number
  }
  return {
    dueLessons: data.dueLessons || [],
    totalDue: data.totalDue ?? 0,
  }
}

export async function postSpacedReviewComplete(lessonId: string): Promise<void> {
  if (!hasClientSession()) return
  await fetch(`${getAgentApiBase()}/spaced-review/complete`, agentFetchInit({
    method: 'POST',
    body: JSON.stringify({ lessonId }),
  })).catch(() => {})
}

export async function postDepthPreference(depth: string): Promise<void> {
  if (!hasClientSession()) return
  await fetch(`${getAgentApiBase()}/depth-preference`, agentFetchInit({
    method: 'POST',
    body: JSON.stringify({ depth }),
  })).catch(() => {})
}

export async function postAgentSessionSummary(body: {
  sessionId: string
  lessonId?: string
  lessonTitle?: string
  messageCount?: number
}): Promise<void> {
  if (!hasClientSession()) return
  await fetch(`${getAgentApiBase()}/session-summary`, agentFetchInit({
    method: 'POST',
    body: JSON.stringify(body),
  })).catch(() => {})
}

export async function fetchAgentSessions(limit = 20): Promise<AgentSessionSummary[]> {
  if (!hasClientSession()) return []
  const res = await fetch(`${getAgentApiBase()}/sessions?limit=${limit}`, agentFetchInit({})).catch(() => null)
  if (!res?.ok) return []
  const data = (await res.json().catch(() => ({}))) as { sessions?: AgentSessionSummary[] }
  return Array.isArray(data.sessions) ? data.sessions : []
}

export async function postAgentMessageFeedback(body: {
  sessionId?: string
  messageId?: string
  rating: 1 | -1
  comment?: string
  surface?: string
  lessonId?: string
  cacheEntryId?: string
  userQuery?: string
}): Promise<boolean> {
  if (!hasClientSession()) return false
  const res = await fetch(`${getAgentApiBase()}/feedback`, agentFetchInit({
    method: 'POST',
    body: JSON.stringify(body),
  })).catch(() => null)
  const data = await res?.json().catch(() => ({}))
  return Boolean(res?.ok && data?.success)
}

export type ConceptQuizSubmitResult = {
  passed: boolean
  score: number
  correctCount: number
  total: number
  perQuestion: Array<{
    questionId: string
    correct: boolean
    correctIndex: number
    explanation: string | null
  }>
  conceptId: string
  conceptTitle: string
  lessonId?: string | null
}

export type ConceptQuizStartPayload = {
  quizSessionId: string
  conceptId: string
  conceptTitle: string
  lessonId?: string | null
  questions: RecallQuizDeliveryQuestion[]
}

export async function startConceptQuiz(
  conceptId: string,
  lessonId?: string | null,
): Promise<{ ok: boolean; data?: ConceptQuizStartPayload; error?: string; code?: string }> {
  if (!hasClientSession()) {
    return { ok: false, error: 'Đăng nhập để làm quiz concept', code: 'AUTH_REQUIRED' }
  }
  try {
    const res = await fetch(`${getAgentApiBase()}/concept-quiz/start`, agentFetchInit({
      method: 'POST',
      body: JSON.stringify({ conceptId, lessonId: lessonId || undefined }),
    }))
    const data = await res.json().catch(() => ({}))
    if (data.success && data.data?.quizSessionId && data.data?.questions?.length >= 3) {
      return { ok: true, data: data.data as ConceptQuizStartPayload }
    }
    return {
      ok: false,
      error: data.error || 'Không tạo được quiz',
      code: data.code,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function submitConceptQuiz(
  quizSessionId: string,
  answers: Record<string, number>,
): Promise<{ ok: boolean; data?: ConceptQuizSubmitResult; error?: string; code?: string }> {
  if (!hasClientSession()) {
    return { ok: false, error: 'Đăng nhập để nộp quiz', code: 'AUTH_REQUIRED' }
  }
  try {
    const res = await fetch(`${getAgentApiBase()}/concept-quiz/submit`, agentFetchInit({
      method: 'POST',
      body: JSON.stringify({ quizSessionId, answers }),
    }))
    const data = await res.json().catch(() => ({}))
    if (data.success && data.data) {
      return { ok: true, data: data.data as ConceptQuizSubmitResult }
    }
    return {
      ok: false,
      error: data.error || 'Nộp bài thất bại',
      code: data.code,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function fetchAgentSessionDetail(
  sessionId: string,
): Promise<AgentSessionDetail | null> {
  if (!hasClientSession() || !sessionId) return null
  const res = await fetch(
    `${getAgentApiBase()}/sessions/${encodeURIComponent(sessionId)}`,
    agentFetchInit({}),
  ).catch(() => null)
  if (!res?.ok) return null
  const data = (await res.json().catch(() => ({}))) as { session?: AgentSessionDetail }
  return data.session ?? null
}
