/**
 * Admin analytics API — overview, funnel, retention, cohort, learning-path.
 *
 * Canonical home of the implementation (PR9 SSOT consolidation). Previously
 * lived under `lib/analytics/reporting/admin.ts` as a re-export shim; the
 * underlying file has moved here so admin-only code lives inside the admin
 * feature folder. Consumers reach this via `features/admin/public`.
 *
 * Session helpers (`getToken`) come deep from auth — same DOMAIN_MAP §3
 * exception used in `adminUsersApi.ts`.
 */
import { getApiPathBase } from '@/lib/apiConfig'
import { apiClientHeaders } from '@/lib/apiClientHeaders'
import { getToken } from '@/features/auth/api/authApi'

const API_BASE = getApiPathBase()

type TrendPoint = {
  date: string
  value: number
}

export type AnalyticsRange = '7d' | '30d' | '90d'

export type AdminAnalyticsOverview = {
  range: AnalyticsRange
  kpis: {
    totalUsers: number
    newUsers: number
    activeLearners: number
    lessonCompletions: number
    completionRate: number
    completedOrders: number
    revenue: number
    communityPosts: number
  }
  trends: {
    users: TrendPoint[]
    lessonCompletions: TrendPoint[]
    revenue: TrendPoint[]
  }
  topCourses: Array<{
    courseId: string
    title: string
    slug: string
    enrollments: number
  }>
}

export type AdminAnalyticsFunnelItem = {
  step: string
  label: string
  value: number
  conversionFromStart: number
  conversionFromPrev: number
}

export type AdminAnalyticsRetention = {
  cohortSize: number
  d1: number
  d7: number
  d30: number
}

export type AdminAnalyticsCohort = {
  date: string
  users: number
  enrollments: number
  paidOrders: number
  enrollmentRate: number
  paidRate: number
}

export type AdminLearningPathFunnelItem = {
  step: string
  label: string
  value: number
  conversionFromStart: number
  conversionFromPrev: number
}

export type AdminLearningPathAnalytics = {
  range: AnalyticsRange
  filters: {
    moduleId: string | null
    depth: 'beginner' | 'explorer' | 'researcher' | null
  }
  filterOptions: {
    modules: Array<{ moduleId: string; moduleTitle: string; moduleOrder: number | null }>
    depths: Array<{ value: 'beginner' | 'explorer' | 'researcher'; label: string }>
  }
  summary: {
    totalEvents: number
    uniqueUsers: number
    uniqueSessions: number
    lessonOpens: number
    lessonCompletions: number
    lessonMastered: number
    depthSwitches: number
  }
  funnel: AdminLearningPathFunnelItem[]
  depthDistribution: Array<{ depth: 'beginner' | 'explorer' | 'researcher'; switches: number }>
  moduleEngagement: Array<{
    moduleId: string
    moduleTitle: string
    moduleOrder: number | null
    opens: number
    uniqueSessions: number
    uniqueUsers: number
    avgDwellSec: number
  }>
  topLessons: Array<{
    lessonId: string
    moduleId: string | null
    nodeId: string | null
    moduleTitle: string
    nodeTitle: string
    lessonTitle: string
    locationLabel: string
    depth: 'beginner' | 'explorer' | 'researcher' | null
    depthLabel: string | null
    opens: number
    uniqueSessions: number
    completions: number
    uniqueCompletionSessions: number
    dropOffCount: number
    dropOffRate: number
  }>
  topConcepts: Array<{
    conceptId: string
    conceptTitle: string
    opens: number
    uniqueUsers: number
  }>
}

function authHeaders(): HeadersInit {
  const token = getToken()
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`
  return h
}

/** API admin trả phẳng `{ success, kpis, ... }` — không bọc trong `data`. */
function unwrapAnalyticsPayload<T>(json: Record<string, unknown>): T | null {
  if (json.kpis != null || json.summary != null || Array.isArray(json.funnel)) {
    const { success: _s, ...rest } = json
    return rest as T
  }
  const nested = json.data
  if (nested && typeof nested === 'object') {
    const inner = nested as Record<string, unknown>
    if (inner.kpis != null || inner.summary != null || Array.isArray(inner.funnel)) {
      return inner as T
    }
  }
  return null
}

export async function fetchAdminAnalyticsOverview(
  range: AnalyticsRange
): Promise<{ success: boolean; data?: AdminAnalyticsOverview; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/analytics/overview?range=${encodeURIComponent(range)}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok || !data.success) return { success: false, error: data.error || 'Không tải được analytics' }
    const payload = unwrapAnalyticsPayload<AdminAnalyticsOverview>(data)
    if (!payload) return { success: false, error: 'Dữ liệu analytics không đúng định dạng' }
    return { success: true, data: payload }
  } catch {
    return { success: false, error: 'Không kết nối được API analytics' }
  }
}

export async function fetchAdminAnalyticsFunnel(
  range: AnalyticsRange
): Promise<{ success: boolean; data?: { range: AnalyticsRange; funnel: AdminAnalyticsFunnelItem[] }; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/analytics/funnel?range=${encodeURIComponent(range)}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok || !data.success) return { success: false, error: data.error || 'Không tải được funnel analytics' }
    return { success: true, data: { range: data.range as AnalyticsRange, funnel: data.funnel as AdminAnalyticsFunnelItem[] } }
  } catch {
    return { success: false, error: 'Không kết nối được API funnel analytics' }
  }
}

export async function fetchAdminAnalyticsRetention(
  range: AnalyticsRange
): Promise<{ success: boolean; data?: { range: AnalyticsRange; retention: AdminAnalyticsRetention }; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/analytics/retention?range=${encodeURIComponent(range)}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok || !data.success) return { success: false, error: data.error || 'Không tải được retention analytics' }
    return { success: true, data: { range: data.range as AnalyticsRange, retention: data.retention as AdminAnalyticsRetention } }
  } catch {
    return { success: false, error: 'Không kết nối được API retention analytics' }
  }
}

export async function fetchAdminAnalyticsCohort(
  range: AnalyticsRange
): Promise<{ success: boolean; data?: { range: AnalyticsRange; cohorts: AdminAnalyticsCohort[] }; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/analytics/cohort?range=${encodeURIComponent(range)}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok || !data.success) return { success: false, error: data.error || 'Không tải được cohort analytics' }
    return { success: true, data: { range: data.range as AnalyticsRange, cohorts: data.cohorts as AdminAnalyticsCohort[] } }
  } catch {
    return { success: false, error: 'Không kết nối được API cohort analytics' }
  }
}

export async function fetchAdminLearningPathAnalytics(
  range: AnalyticsRange,
  filters?: { moduleId?: string; depth?: 'beginner' | 'explorer' | 'researcher' | '' }
): Promise<{ success: boolean; data?: AdminLearningPathAnalytics; error?: string }> {
  try {
    const query = new URLSearchParams({ range })
    if (filters?.moduleId) query.set('moduleId', filters.moduleId)
    if (filters?.depth) query.set('depth', filters.depth)
    const res = await fetch(`${API_BASE}/admin/analytics/learning-path?${query.toString()}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok || !data.success) return { success: false, error: data.error || 'Không tải được learning path analytics' }
    const payload = unwrapAnalyticsPayload<AdminLearningPathAnalytics>(data)
    if (!payload) return { success: false, error: 'Dữ liệu learning path không đúng định dạng' }
    return { success: true, data: payload }
  } catch {
    return { success: false, error: 'Không kết nối được API learning path analytics' }
  }
}

export type AdminAgentAnalytics = {
  range: string
  summary: {
    agentSessions: number
    agentUsers: number
    agentMessages: number
    learnerProfiles: number
  }
  daily: Array<{ date: string; sessions: number; messages: number }>
  struggleHeatmap: Array<{
    lessonId: string
    lessonTitle: string
    signal: string
    uniqueUsers: number
    totalDwellSec: number
    quizFailProfiles: number
  }>
}

export async function fetchAdminAgentAnalytics(
  range: AnalyticsRange = '30d',
): Promise<{ success: boolean; data?: AdminAgentAnalytics; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/analytics/agent?range=${encodeURIComponent(range)}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Không tải được agent analytics' }
    }
    return {
      success: true,
      data: {
        range: data.range,
        summary: data.summary,
        daily: data.daily,
        struggleHeatmap: data.struggleHeatmap,
      },
    }
  } catch {
    return { success: false, error: 'Không kết nối được API agent analytics' }
  }
}

export type AdminExploreFunnelItem = {
  step: string
  label: string
  events: number
  uniqueUsers: number
  uniqueSessions: number
  conversionFromStart: number
  conversionFromPrev: number
}

export type AdminExploreAnalytics = {
  range: AnalyticsRange
  funnel: AdminExploreFunnelItem[]
  summary: {
    discoveries: number
    discoveryUsers: number
    quizPrompts: number
    quizPasses: number
  }
  topEntities: Array<{
    entityId: string
    discoveries: number
    quizPasses: number
  }>
}

export type AdminUnifiedLearnerAnalytics = {
  range: AnalyticsRange
  learningPath: {
    totalEvents: number
    uniqueUsers: number
    uniqueSessions: number
  }
  course: {
    totalEvents: number
    uniqueUsers: number
    uniqueSessions: number
  }
  crossModule: {
    uniqueUsersAny: number
    usersBothLpAndCourse: number
    pctBoth: number
  }
  daily: {
    learningPath: Array<{ date: string; events: number }>
    course: Array<{ date: string; events: number }>
  }
}

export async function fetchAdminExploreAnalytics(
  range: AnalyticsRange = '30d',
): Promise<{ success: boolean; data?: AdminExploreAnalytics; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/analytics/explore?range=${encodeURIComponent(range)}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Không tải được Explore analytics' }
    }
    const payload = unwrapAnalyticsPayload<AdminExploreAnalytics>(data)
    if (!payload) return { success: false, error: 'Dữ liệu Explore không đúng định dạng' }
    return { success: true, data: payload }
  } catch {
    return { success: false, error: 'Không kết nối được API Explore analytics' }
  }
}

export async function fetchAdminUnifiedLearnerAnalytics(
  range: AnalyticsRange = '30d',
): Promise<{ success: boolean; data?: AdminUnifiedLearnerAnalytics; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/analytics/unified-learner?range=${encodeURIComponent(range)}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Không tải được unified learner analytics' }
    }
    const payload = unwrapAnalyticsPayload<AdminUnifiedLearnerAnalytics>(data)
    if (!payload) return { success: false, error: 'Dữ liệu unified learner không đúng định dạng' }
    return { success: true, data: payload }
  } catch {
    return { success: false, error: 'Không kết nối được API unified learner analytics' }
  }
}
