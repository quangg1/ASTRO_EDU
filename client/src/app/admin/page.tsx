'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuthStore } from '@/store/useAuthStore'
import {
  fetchAdminUsers,
  updateUserRole,
  updateUserStatus,
  fetchAdminTeacherApplications,
  reviewTeacherApplication,
  type AdminUser,
  type UserRole,
  type TeacherApplicationWithUser,
} from '@/lib/authApi'
import { fetchCourses } from '@/lib/coursesApi'
import { fetchAdminOrderStats, type AdminOrderStats, type Order } from '@/lib/paymentsApi'
import {
  fetchAdminAnalyticsCohort,
  fetchAdminAnalyticsFunnel,
  fetchAdminLearningPathAnalytics,
  fetchAdminAnalyticsOverview,
  fetchAdminAnalyticsRetention,
  type AdminAnalyticsCohort,
  type AdminAnalyticsFunnelItem,
  type AdminLearningPathAnalytics,
  type AdminAnalyticsOverview,
  type AdminAnalyticsRetention,
  type AnalyticsRange,
} from '@/lib/analytics/reporting/admin'
import { trackEvent } from '@/lib/analytics/tracking'
import { viText } from '@/messages/vi'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'

export default function AdminPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [courseCount, setCourseCount] = useState<number | null>(null)
  const [orderStats, setOrderStats] = useState<AdminOrderStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('30d')
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'funnel' | 'retention' | 'cohort' | 'learning-path'>('overview')
  const [analytics, setAnalytics] = useState<AdminAnalyticsOverview | null>(null)
  const [analyticsFunnel, setAnalyticsFunnel] = useState<AdminAnalyticsFunnelItem[]>([])
  const [analyticsRetention, setAnalyticsRetention] = useState<AdminAnalyticsRetention | null>(null)
  const [analyticsCohort, setAnalyticsCohort] = useState<AdminAnalyticsCohort[]>([])
  const [learningPathAnalytics, setLearningPathAnalytics] = useState<AdminLearningPathAnalytics | null>(null)
  const [learningPathFilter, setLearningPathFilter] = useState<{ moduleId: string; depth: '' | 'beginner' | 'explorer' | 'researcher' }>({
    moduleId: '',
    depth: '',
  })
  const [analyticsError, setAnalyticsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<'success' | 'error' | null>(null)
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all')
  const [teacherAppFilter, setTeacherAppFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [teacherApps, setTeacherApps] = useState<TeacherApplicationWithUser[]>([])
  const [teacherAppLoading, setTeacherAppLoading] = useState(true)
  const [reviewingAppId, setReviewingAppId] = useState<string | null>(null)
  const analyticsTabLabel: Record<typeof analyticsTab, string> = {
    overview: 'Tổng quan',
    funnel: 'Phễu',
    retention: 'Giữ chân',
    cohort: 'Nhóm người dùng',
    'learning-path': 'Lộ trình học',
  }

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/admin')
    if (checked && user && user.role !== 'admin') router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') return
    setLoading(true)
    Promise.all([
      fetchAdminUsers(),
      fetchCourses(),
      fetchAdminOrderStats(),
      fetchAdminAnalyticsOverview(analyticsRange),
      fetchAdminAnalyticsFunnel(analyticsRange),
      fetchAdminAnalyticsRetention(analyticsRange),
      fetchAdminAnalyticsCohort(analyticsRange),
      fetchAdminLearningPathAnalytics(analyticsRange, learningPathFilter),
    ])
      .then(([uRes, courses, orderOverview, analyticsOverview, funnelOverview, retentionOverview, cohortOverview, lpOverview]) => {
        if (uRes.success && uRes.data) setUsers(uRes.data)
        else setError(uRes.error || '')
        setMessage(null)
        setCourseCount(courses.length)
        setOrderStats(orderOverview.stats)
        setRecentOrders(orderOverview.orders)
        if (analyticsOverview.success && analyticsOverview.data) {
          setAnalytics(analyticsOverview.data)
          setAnalyticsError('')
        } else {
          setAnalytics(null)
          setAnalyticsError(analyticsOverview.error || 'Không tải được analytics')
        }
        if (funnelOverview.success && funnelOverview.data) {
          setAnalyticsFunnel(funnelOverview.data.funnel)
        } else {
          setAnalyticsFunnel([])
        }
        if (retentionOverview.success && retentionOverview.data) {
          setAnalyticsRetention(retentionOverview.data.retention)
        } else {
          setAnalyticsRetention(null)
        }
        if (cohortOverview.success && cohortOverview.data) {
          setAnalyticsCohort(cohortOverview.data.cohorts)
        } else {
          setAnalyticsCohort([])
        }
        if (lpOverview.success && lpOverview.data) {
          setLearningPathAnalytics(lpOverview.data)
        } else {
          setLearningPathAnalytics(null)
        }
      })
      .finally(() => setLoading(false))
  }, [user, analyticsRange, learningPathFilter])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    setTeacherAppLoading(true)
    fetchAdminTeacherApplications(teacherAppFilter)
      .then((res) => {
        if (res.success && res.data) setTeacherApps(res.data)
        else setTeacherApps([])
      })
      .finally(() => setTeacherAppLoading(false))
  }, [user, teacherAppFilter])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    trackEvent('admin_dashboard_viewed', { range: analyticsRange })
  }, [user, analyticsRange])

  if (!checked || !user) {
    return <div className="min-h-screen bg-black pt-20 px-4 text-gray-400">Đang kiểm tra phiên đăng nhập...</div>
  }

  if (user.role !== 'admin') {
    return null
  }

  const handleRoleChange = async (u: AdminUser, newRole: UserRole) => {
    if (u.role === newRole) return
    setUpdatingId(u.id)
    setMessage(null)
    setError('')
    const res = await updateUserRole(u.id, newRole)
    setUpdatingId(null)
    if (res.success && res.user) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: res.user!.role } : x)))
      trackEvent('admin_user_role_changed', {
        target_role: newRole,
      })
      setMessage('success')
    } else {
      setError(res.error || '')
      setMessage('error')
    }
  }

  const handleReviewTeacherApp = async (app: TeacherApplicationWithUser, action: 'approve' | 'reject') => {
    const note =
      action === 'reject' ? window.prompt('Ghi chú từ chối (tuỳ chọn, hiển thị cho người nộp đơn):', '') ?? '' : ''
    setReviewingAppId(app.id)
    setMessage(null)
    setError('')
    const res = await reviewTeacherApplication(app.id, action, note)
    setReviewingAppId(null)
    if (res.success) {
      setMessage('success')
      trackEvent('admin_teacher_application_reviewed', { action })
      const [uRes, appsRes] = await Promise.all([fetchAdminUsers(), fetchAdminTeacherApplications(teacherAppFilter)])
      if (uRes.success && uRes.data) setUsers(uRes.data)
      if (appsRes.success && appsRes.data) setTeacherApps(appsRes.data)
    } else {
      setError(res.error || '')
      setMessage('error')
    }
  }

  const handleStatusChange = async (u: AdminUser, nextStatus: 'active' | 'deactivated') => {
    if (u.accountStatus === nextStatus) return
    const reason =
      nextStatus === 'deactivated'
        ? window.prompt('Lý do ngừng hoạt động tài khoản này:', u.deactivationReason || 'Ngừng hoạt động từ admin') || ''
        : ''
    setUpdatingId(u.id)
    setMessage(null)
    setError('')
    const res = await updateUserStatus(u.id, nextStatus, reason)
    setUpdatingId(null)
    if (res.success && res.user) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? res.user! : x)))
      setMessage('success')
    } else {
      setError(res.error || '')
      setMessage('error')
    }
  }

  const visibleUsers = users.filter((u) => (userStatusFilter === 'all' ? true : u.accountStatus === userStatusFilter))

  return (
    <div className="min-h-screen bg-black pt-16 px-4 pb-12">
      <main className="max-w-5xl mx-auto">
        <PageHeader
          title={viText.admin.title}
          description="Theo dõi người dùng, doanh thu và hành vi học tập từ một bề mặt quản trị thống nhất."
          action={
            <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300">
              ← Trang chủ
            </Link>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 my-8">
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{viText.admin.users}</p>
            <p className="text-2xl font-bold text-white mt-1">{loading ? '...' : users.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{viText.admin.courses}</p>
            <p className="text-2xl font-bold text-white mt-1">{courseCount ?? '...'}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{viText.admin.orders}</p>
            <p className="text-2xl font-bold text-white mt-1">
              {orderStats ? orderStats.totalOrders : '...'}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{viText.admin.revenue} (VND)</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {orderStats ? orderStats.totalRevenue.toLocaleString('en-US') : '...'}
            </p>
          </Card>
          <Link href="/studio" className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 hover:bg-cyan-500/20 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-cyan-300 uppercase tracking-wider">Studio</p>
              <Badge>Giảng viên</Badge>
            </div>
            <p className="text-white font-medium mt-1">Mở Studio →</p>
          </Link>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#0a0f17] overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-white mr-2">Phân tích dữ liệu</h2>
              {(['overview', 'funnel', 'retention', 'cohort', 'learning-path'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setAnalyticsTab(tab)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    analyticsTab === tab
                      ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:border-cyan-500/40'
                  }`}
                >
                  {analyticsTabLabel[tab]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => {
                    setAnalyticsRange(range)
                    trackEvent('admin_range_changed', { range })
                  }}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    analyticsRange === range
                      ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:border-cyan-500/40'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-3">
              <Spinner />
              <span>Đang tải dữ liệu analytics...</span>
            </div>
          ) : analyticsError ? (
            <div className="p-8 text-center text-red-300">{analyticsError}</div>
          ) : !analytics && analyticsTab === 'overview' ? (
            <EmptyState title="Chưa có dữ liệu analytics" description="Hệ thống sẽ hiển thị biểu đồ khi có dữ liệu hành vi và giao dịch đủ để tổng hợp." className="m-4" />
          ) : (
            <div className="p-4 space-y-5">
              {analyticsTab === 'overview' && analytics && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] text-gray-500 uppercase">Người dùng mới</p>
                      <p className="text-xl font-semibold text-white mt-1">{analytics.kpis.newUsers}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] text-gray-500 uppercase">Người học hoạt động</p>
                      <p className="text-xl font-semibold text-white mt-1">{analytics.kpis.activeLearners}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] text-gray-500 uppercase">Bài học hoàn thành</p>
                      <p className="text-xl font-semibold text-white mt-1">{analytics.kpis.lessonCompletions}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] text-gray-500 uppercase">Tỷ lệ hoàn thành</p>
                      <p className="text-xl font-semibold text-emerald-300 mt-1">{analytics.kpis.completionRate}%</p>
                    </div>
                  </div>
                  <div className="h-[280px] rounded-xl border border-white/10 bg-black/20 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={analytics.trends.users.map((row, idx) => ({
                          date: row.date.slice(5),
                          users: row.value,
                          lessons: analytics.trends.lessonCompletions[idx]?.value || 0,
                          revenue: analytics.trends.revenue[idx]?.value || 0,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="date" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="users" stroke="#22d3ee" fill="#22d3ee33" name="Người dùng" />
                        <Area type="monotone" dataKey="lessons" stroke="#a78bfa" fill="#a78bfa22" name="Bài học" />
                        <Area type="monotone" dataKey="revenue" stroke="#34d399" fill="#34d39922" name="Doanh thu" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {analyticsTab === 'funnel' && (
                <div className="space-y-4">
                  <div className="h-[280px] rounded-xl border border-white/10 bg-black/20 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsFunnel}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="label" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#22d3ee" name="Số lượng" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analyticsFunnel.map((item) => (
                      <div key={item.step} className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-sm text-white">{item.label}</p>
                        <p className="text-lg text-cyan-200 font-semibold">{item.value}</p>
                        <p className="text-xs text-gray-400">
                          Từ đầu phễu: {item.conversionFromStart}% · So với bước trước: {item.conversionFromPrev}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analyticsTab === 'retention' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[11px] text-gray-500 uppercase">Kích thước cohort</p>
                    <p className="text-xl font-semibold text-white mt-1">{analyticsRetention?.cohortSize ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[11px] text-gray-500 uppercase">Giữ chân D1</p>
                    <p className="text-xl font-semibold text-cyan-200 mt-1">{analyticsRetention?.d1 ?? 0}%</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[11px] text-gray-500 uppercase">Giữ chân D7</p>
                    <p className="text-xl font-semibold text-cyan-200 mt-1">{analyticsRetention?.d7 ?? 0}%</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[11px] text-gray-500 uppercase">Giữ chân D30</p>
                    <p className="text-xl font-semibold text-cyan-200 mt-1">{analyticsRetention?.d30 ?? 0}%</p>
                  </div>
                </div>
              )}

              {analyticsTab === 'cohort' && (
                <div className="h-[320px] rounded-xl border border-white/10 bg-black/20 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsCohort.map((row) => ({
                        date: row.date.slice(5),
                        users: row.users,
                        enrollments: row.enrollments,
                        paidOrders: row.paidOrders,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="date" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="users" fill="#22d3ee" />
                      <Bar dataKey="enrollments" fill="#a78bfa" />
                      <Bar dataKey="paidOrders" fill="#34d399" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {analyticsTab === 'learning-path' && (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-3">
                    <select
                      value={learningPathFilter.moduleId}
                      onChange={(e) => setLearningPathFilter((prev) => ({ ...prev, moduleId: e.target.value }))}
                      className="rounded-lg bg-black/50 border border-white/15 text-white px-3 py-2 text-sm"
                    >
                      <option value="">Tất cả module</option>
                      {(learningPathAnalytics?.filterOptions.modules ?? []).map((module) => (
                        <option key={module.moduleId} value={module.moduleId}>
                          {(module.moduleOrder ? `M${module.moduleOrder}. ` : '') + module.moduleTitle}
                        </option>
                      ))}
                    </select>
                    <select
                      value={learningPathFilter.depth}
                      onChange={(e) =>
                        setLearningPathFilter((prev) => ({
                          ...prev,
                          depth: e.target.value as '' | 'beginner' | 'explorer' | 'researcher',
                        }))
                      }
                      className="rounded-lg bg-black/50 border border-white/15 text-white px-3 py-2 text-sm"
                    >
                      <option value="">Tất cả độ sâu</option>
                      {(learningPathAnalytics?.filterOptions.depths ?? []).map((depth) => (
                        <option key={depth.value} value={depth.value}>
                          {depth.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] text-gray-500 uppercase">Sự kiện</p>
                      <p className="text-xl font-semibold text-white mt-1">{learningPathAnalytics?.summary.totalEvents ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] text-gray-500 uppercase">Phiên học</p>
                      <p className="text-xl font-semibold text-cyan-200 mt-1">{learningPathAnalytics?.summary.uniqueSessions ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] text-gray-500 uppercase">Hoàn thành bài</p>
                      <p className="text-xl font-semibold text-emerald-300 mt-1">{learningPathAnalytics?.summary.lessonCompletions ?? 0}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm text-white font-medium mb-4">Phễu hành vi lộ trình học</p>
                    <div className="space-y-3">
                      {(learningPathAnalytics?.funnel ?? []).map((row) => {
                        const maxValue = Math.max(1, ...(learningPathAnalytics?.funnel ?? []).map((item) => item.value))
                        const width = `${Math.max(6, (row.value / maxValue) * 100)}%`
                        return (
                          <div key={row.step} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-300">{row.label}</span>
                              <span className="text-cyan-300 font-medium">{row.value}</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500" style={{ width }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-sm text-white font-medium mb-2">Phân phối chuyển depth</p>
                      <div className="space-y-2">
                        {(learningPathAnalytics?.depthDistribution ?? []).map((row) => (
                          <div key={row.depth} className="flex justify-between text-sm">
                            <span className="text-gray-300">
                              {row.depth === 'beginner' ? 'Cơ bản' : row.depth === 'explorer' ? 'Cơ chế' : 'Chuyên sâu'}
                            </span>
                            <span className="text-cyan-300">{row.switches}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-sm text-white font-medium mb-2">Top module theo lượt mở bài</p>
                      <div className="space-y-2">
                        {(learningPathAnalytics?.moduleEngagement ?? []).slice(0, 6).map((row) => (
                          <div key={row.moduleId} className="flex justify-between text-sm">
                            <span className="text-gray-300">{row.moduleTitle}</span>
                            <span className="text-cyan-300">{row.opens} mở · {row.avgDwellSec}s</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-sm text-white font-medium mb-3">Drop-off theo bài học</p>
                    {!(learningPathAnalytics?.topLessons?.length) ? (
                      <p className="text-sm text-gray-500">Chưa có dữ liệu đủ để tính drop-off.</p>
                    ) : (
                      <div className="space-y-3">
                        {learningPathAnalytics.topLessons.slice(0, 8).map((row) => (
                          <div key={row.lessonId} className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                              <div>
                                <p className="text-sm text-white">{row.lessonTitle}</p>
                                <p className="text-xs text-gray-400">
                                  {row.moduleTitle} / {row.nodeTitle}{' '}
                                  {row.depth
                                    ? `· ${row.depth === 'beginner' ? 'Cơ bản' : row.depth === 'explorer' ? 'Cơ chế' : 'Chuyên sâu'}`
                                    : ''}
                                </p>
                              </div>
                              <div className="text-right text-xs text-gray-300">
                                <p>Mở: <span className="text-cyan-300">{row.opens}</span></p>
                                <p>Hoàn thành: <span className="text-emerald-300">{row.completions}</span></p>
                                <p>Rơi: <span className="text-rose-300">{row.dropOffCount} ({row.dropOffRate}%)</span></p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {analyticsTab === 'overview' && analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-sm text-white font-medium mb-2">Top khóa học theo lượt ghi danh</p>
                    {analytics.topCourses.length === 0 ? (
                      <p className="text-sm text-gray-500">Không có dữ liệu ghi danh trong khoảng thời gian đã chọn.</p>
                    ) : (
                      <ul className="space-y-2">
                        {analytics.topCourses.map((course) => (
                          <li key={course.courseId} className="flex items-center justify-between text-sm">
                            <span className="text-gray-200">{course.title}</span>
                            <span className="text-cyan-300 font-medium">{course.enrollments}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                    <p className="text-sm text-white font-medium">Chỉ số vận hành</p>
                    <p className="text-sm text-gray-300">
                      Đơn hoàn tất: <span className="text-emerald-300">{analytics.kpis.completedOrders}</span>
                    </p>
                    <p className="text-sm text-gray-300">
                      Doanh thu: <span className="text-emerald-300">{analytics.kpis.revenue.toLocaleString('en-US')} VND</span>
                    </p>
                    <p className="text-sm text-gray-300">
                      Bài viết cộng đồng: <span className="text-cyan-300">{analytics.kpis.communityPosts}</span>
                    </p>
                    <p className="text-sm text-gray-300">
                      Tổng người dùng: <span className="text-cyan-300">{analytics.kpis.totalUsers}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0a0f17] overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="font-semibold text-white">Đơn xin quyền giảng viên</h2>
            <select
              value={teacherAppFilter}
              onChange={(e) => setTeacherAppFilter(e.target.value as typeof teacherAppFilter)}
              className="text-xs rounded-lg bg-black/50 border border-white/15 text-white px-2 py-1.5 focus:border-cyan-500/50 focus:outline-none"
            >
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Đã từ chối</option>
              <option value="all">Tất cả</option>
            </select>
          </div>
          {teacherAppLoading ? (
            <div className="p-8 text-center text-gray-500">
              <Spinner />
            </div>
          ) : teacherApps.length === 0 ? (
            <div className="p-8">
              <EmptyState title="Không có đơn" description="Thay đổi bộ lọc hoặc quay lại sau." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Người nộp</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Giới thiệu</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ngày gửi</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherApps.map((app) => (
                    <tr key={app.id} className="border-b border-white/5 hover:bg-white/5 align-top">
                      <td className="px-4 py-3 text-sm text-white">{app.user?.displayName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{app.user?.email || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            app.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300'
                              : app.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[280px]">
                        <p className="line-clamp-4 whitespace-pre-wrap">{app.bio}</p>
                        {app.organization ? <p className="text-gray-500 mt-1">Đơn vị: {app.organization}</p> : null}
                        {app.status === 'rejected' && app.reviewNote ? (
                          <p className="text-red-300/90 mt-1">Ghi chú: {app.reviewNote}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {app.createdAt ? new Date(app.createdAt).toLocaleString('vi-VN') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {app.status === 'pending' ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={reviewingAppId === app.id}
                              onClick={() => handleReviewTeacherApp(app, 'approve')}
                              className="text-xs rounded-lg px-2 py-1.5 border border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                            >
                              Duyệt
                            </button>
                            <button
                              type="button"
                              disabled={reviewingAppId === app.id}
                              onClick={() => handleReviewTeacherApp(app, 'reject')}
                              className="text-xs rounded-lg px-2 py-1.5 border border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/25 disabled:opacity-50"
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0a0f17] overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="font-semibold text-white">{viText.admin.users}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value as 'all' | 'active' | 'deactivated')}
                className="text-xs rounded-lg bg-black/50 border border-white/15 text-white px-2 py-1.5 focus:border-cyan-500/50 focus:outline-none"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="deactivated">Ngừng hoạt động</option>
              </select>
              {message === 'success' && <span className="text-sm text-green-400">{viText.admin.roleUpdated}</span>}
              {message === 'error' && error && <span className="text-sm text-red-400">{error}</span>}
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">{viText.common.loading}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tên</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vai trò</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Đổi vai trò</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Quản lý tài khoản</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ngày tham gia</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-sm text-gray-300">{u.email || '-'}</td>
                      <td className="px-4 py-3 text-sm text-white">{u.displayName || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.accountStatus === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                          {u.accountStatus === 'active' ? 'active' : 'deactivated'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            u.role === 'admin'
                              ? 'bg-amber-500/20 text-amber-300'
                              : u.role === 'teacher'
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : u.role === 'moderator'
                                  ? 'bg-violet-500/20 text-violet-300'
                                  : 'bg-white/10 text-gray-400'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                          disabled={updatingId === u.id || u.id === user?.id}
                          className="text-xs rounded-lg bg-black/50 border border-white/15 text-white px-2 py-1.5 focus:border-cyan-500/50 focus:outline-none disabled:opacity-50"
                        >
                          <option value="student">student</option>
                          <option value="teacher">teacher</option>
                          <option value="moderator">moderator</option>
                          <option value="admin">admin</option>
                        </select>
                        {u.id === user?.id && <span className="ml-1 text-xs text-gray-500">(bạn)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(u, u.accountStatus === 'active' ? 'deactivated' : 'active')}
                            disabled={updatingId === u.id || u.id === user?.id}
                            className={`text-xs rounded-lg px-2 py-1.5 border disabled:opacity-50 ${
                              u.accountStatus === 'active'
                                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                            }`}
                          >
                            {u.accountStatus === 'active' ? 'Ngừng hoạt động' : 'Khôi phục'}
                          </button>
                          {u.deactivationReason ? <p className="text-[11px] text-gray-500 max-w-[220px]">{u.deactivationReason}</p> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0a0f17] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-white">Đơn hàng gần đây</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">{viText.common.loading}</div>
          ) : recentOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{viText.admin.noOrders}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-500 uppercase">
                    <th className="px-4 py-3">Khóa học</th>
                    <th className="px-4 py-3">Số tiền</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Thời gian tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o._id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 text-cyan-300">{o.courseSlug}</td>
                      <td className="px-4 py-3 text-gray-200">
                        {o.currency === 'USD'
                          ? `$${o.amount.toFixed(2)}`
                          : `${o.amount.toLocaleString('en-US')} ₫`}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            o.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : o.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(o.createdAt).toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
