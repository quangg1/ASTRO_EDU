import { getApiPathBase } from '@/lib/apiConfig'
import { getToken } from '@/lib/authApi'

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
    depth: 'beginner' | 'explorer' | 'researcher' | null
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
    return { success: true, data: data as AdminAnalyticsOverview }
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
    return { success: true, data: data as AdminLearningPathAnalytics }
  } catch {
    return { success: false, error: 'Không kết nối được API learning path analytics' }
  }
}
