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
import { useAuthStore } from '@/features/auth/public'
import { canAccessAdmin, canAccessAdminPath, hasAdminScope } from '@/lib/roles'
import { labelUserRoleVi } from '@/features/admin/public'
import {
  fetchAdminTeacherApplications,
  reviewTeacherApplication,
  markTeacherApplicationCvReviewed,
  fetchAdminAnalyticsFunnel,
  fetchAdminLearningPathAnalytics,
  fetchAdminExploreAnalytics,
  fetchAdminAnalyticsOverview,
  type TeacherApplicationWithUser,
  type AdminAnalyticsFunnelItem,
  type AdminLearningPathAnalytics,
  type AdminExploreAnalytics,
  type AdminAnalyticsOverview,
  type AnalyticsRange,
} from '@/features/admin/public'
import { fetchCourses } from '@/features/courses/public'
import { fetchAdminOrderStats, type AdminOrderStats } from '@/features/payment/public'
import { trackEvent } from '@/lib/analytics/tracking'
import { viText } from '@/messages/vi'
import { Badge, Card, Tabs, Tab, TabList, Select } from '@/design-system'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { AdminTeacherApplicationsPanel } from '@/components/admin/AdminTeacherApplicationsPanel'

export default function AdminPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [courseCount, setCourseCount] = useState<number | null>(null)
  const [orderStats, setOrderStats] = useState<AdminOrderStats | null>(null)
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('30d')
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'funnel' | 'learning-path' | 'explore'>('overview')
  const [analytics, setAnalytics] = useState<AdminAnalyticsOverview | null>(null)
  const [analyticsFunnel, setAnalyticsFunnel] = useState<AdminAnalyticsFunnelItem[]>([])
  const [learningPathAnalytics, setLearningPathAnalytics] = useState<AdminLearningPathAnalytics | null>(null)
  const [exploreAnalytics, setExploreAnalytics] = useState<AdminExploreAnalytics | null>(null)
  const [funnelLoading, setFunnelLoading] = useState(false)
  const [learningPathLoading, setLearningPathLoading] = useState(false)
  const [exploreAnalyticsLoading, setExploreAnalyticsLoading] = useState(false)
  const [learningPathFilter, setLearningPathFilter] = useState<{ moduleId: string; depth: '' | 'beginner' | 'explorer' | 'researcher' }>({
    moduleId: '',
    depth: '',
  })
  const [analyticsError, setAnalyticsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState<'success' | 'error' | null>(null)
  const [teacherAppFilter, setTeacherAppFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [teacherApps, setTeacherApps] = useState<TeacherApplicationWithUser[]>([])
  const [teacherAppLoading, setTeacherAppLoading] = useState(true)
  const [reviewingAppId, setReviewingAppId] = useState<string | null>(null)
  const analyticsTabLabel: Record<typeof analyticsTab, string> = {
    overview: 'Tổng quan',
    funnel: 'Phễu',
    'learning-path': 'Lộ trình học',
    explore: 'Explore 3D',
  }

  const analyticsRangeLabel: Record<AnalyticsRange, string> = {
    '7d': '7 ngày',
    '30d': '30 ngày',
    '90d': '90 ngày',
  }

  const canViewOrderOps = hasAdminScope(user, 'orders')

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/admin')
    if (checked && user && !canAccessAdmin(user)) router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user) return
    if (!canAccessAdminPath(user, '/admin')) return
    setLoading(true)
    void Promise.allSettled([
      fetchCourses(),
      canViewOrderOps ? fetchAdminOrderStats() : Promise.resolve({ stats: null, orders: [] }),
      fetchAdminAnalyticsOverview(analyticsRange),
    ])
      .then((results) => {
        const val = <T,>(i: number, fallback: T): T =>
          results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<T>).value : fallback

        const courses = val(0, [] as Awaited<ReturnType<typeof fetchCourses>>)
        const orderOverview = val(1, { stats: null, orders: [] })
        const analyticsOverview = val(2, { success: false, error: 'Không tải analytics' } as Awaited<ReturnType<typeof fetchAdminAnalyticsOverview>>)

        setCourseCount(Array.isArray(courses) ? courses.length : 0)
        setOrderStats(orderOverview.stats)
        if (analyticsOverview.success && analyticsOverview.data) {
          setAnalytics(analyticsOverview.data)
          setAnalyticsError('')
        } else {
          setAnalytics(null)
          setAnalyticsError(analyticsOverview.error || 'Không tải được analytics')
        }
      })
      .finally(() => setLoading(false))
  }, [user, analyticsRange, canViewOrderOps])

  useEffect(() => {
    if (!user || !canAccessAdminPath(user, '/admin')) return
    if (analyticsTab !== 'funnel') return
    setFunnelLoading(true)
    void fetchAdminAnalyticsFunnel(analyticsRange)
      .then((res) => {
        if (res.success && res.data) setAnalyticsFunnel(res.data.funnel)
        else setAnalyticsFunnel([])
      })
      .finally(() => setFunnelLoading(false))
  }, [user, analyticsTab, analyticsRange])

  useEffect(() => {
    if (!user || !canAccessAdminPath(user, '/admin')) return
    if (analyticsTab !== 'learning-path') return
    setLearningPathLoading(true)
    void fetchAdminLearningPathAnalytics(analyticsRange, learningPathFilter)
      .then((res) => {
        if (res.success && res.data) setLearningPathAnalytics(res.data)
        else setLearningPathAnalytics(null)
      })
      .finally(() => setLearningPathLoading(false))
  }, [user, analyticsTab, analyticsRange, learningPathFilter])

  useEffect(() => {
    if (!user || !canAccessAdminPath(user, '/admin')) return
    setTeacherAppLoading(true)
    fetchAdminTeacherApplications(teacherAppFilter)
      .then((res) => {
        if (res.success && res.data) setTeacherApps(res.data)
        else setTeacherApps([])
      })
      .finally(() => setTeacherAppLoading(false))
  }, [user, teacherAppFilter])

  useEffect(() => {
    if (!user || !canAccessAdminPath(user, '/admin')) return
    if (analyticsTab !== 'explore') return
    setExploreAnalyticsLoading(true)
    void fetchAdminExploreAnalytics(analyticsRange)
      .then((res) => {
        if (res.success && res.data) setExploreAnalytics(res.data)
        else setExploreAnalytics(null)
      })
      .finally(() => setExploreAnalyticsLoading(false))
  }, [user, analyticsTab, analyticsRange])

  useEffect(() => {
    if (!user || !canAccessAdminPath(user, '/admin')) return
    trackEvent('admin_dashboard_viewed', { range: analyticsRange })
  }, [user, analyticsRange])

  if (!checked || !user) {
    return <div className="min-h-screen bg-ds-base text-ds-text pt-20 px-4 text-gray-400">Đang kiểm tra phiên đăng nhập...</div>
  }

  if (!canAccessAdminPath(user, '/admin')) {
    return null
  }

  const kpiOrdersTotal = orderStats?.totalOrders ?? analytics?.kpis.completedOrders ?? null
  const kpiOrdersHint = orderStats ? null : analytics ? `Đơn hoàn tất · ${analyticsRangeLabel[analyticsRange]}` : null
  const kpiPending = orderStats?.pendingOrders ?? null
  const kpiRevenue = orderStats?.totalRevenue ?? analytics?.kpis.revenue ?? null
  const kpiRevenueHint = orderStats ? null : analytics ? `Trong ${analyticsRangeLabel[analyticsRange]} qua` : null

  const handleMarkCvReviewed = async (app: TeacherApplicationWithUser) => {
    setReviewingAppId(app.id)
    setMessage(null)
    setError('')
    const res = await markTeacherApplicationCvReviewed(app.id)
    setReviewingAppId(null)
    if (res.success && res.application) {
      setTeacherApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, ...res.application! } : a)))
      setMessage('success')
    } else {
      setError(res.error || 'Xác nhận CV thất bại')
      setMessage('error')
    }
  }

  const handleReviewTeacherApp = async (
    app: TeacherApplicationWithUser,
    action: 'approve' | 'reject',
    note = '',
  ) => {
    if (action === 'approve' && !app.cvReviewedAt) {
      setError('Cần xác nhận đã xem CV trước khi duyệt.')
      setMessage('error')
      return
    }
    setReviewingAppId(app.id)
    setMessage(null)
    setError('')
    const res = await reviewTeacherApplication(app.id, action, note)
    setReviewingAppId(null)
    if (res.success) {
      setMessage('success')
      trackEvent('admin_teacher_application_reviewed', { action })
      const appsRes = await fetchAdminTeacherApplications(teacherAppFilter)
      if (appsRes.success && appsRes.data) setTeacherApps(appsRes.data)
    } else {
      setError(res.error || '')
      setMessage('error')
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
        <PageHeader
          title={viText.admin.title}
          description="Analytics, duyệt GV và liên kết tới các module quản trị."
          action={
            <Link href="/admin/users" className="text-sm text-cyan-400 hover:text-cyan-300">
              Quản lý user →
            </Link>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Card className="p-4 border-amber-500/20 bg-amber-500/5">
            <p className="text-xs font-medium text-amber-200/90 uppercase tracking-wide">Admin</p>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Vai trò, đơn hàng, gem, promo, analytics. Can thiệp nội dung forum chỉ khi cần override trên từng bài.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/admin/gem-economy" className="text-xs text-cyan-400 hover:underline">
                Gem economy →
              </Link>
            </div>
          </Card>
          <Card className="p-4 border-white/10">
            <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">Studio (override)</p>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Sửa khóa học / showcase khi cần — không thay thế quy trình giáo viên sở hữu nội dung.
            </p>
            <Link href="/studio" className="inline-block mt-3 text-xs text-amber-300 hover:underline">
              Mở Studio →
            </Link>
          </Card>
          <Card className="p-4 border-violet-500/20 bg-violet-500/5">
            <p className="text-xs font-medium text-violet-200/90 uppercase tracking-wide">Moderator</p>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Hàng đợi báo cáo, cảnh báo, ẩn/xóa — chỉ diễn đàn. Gán vai trò {labelUserRoleVi('moderator')} tại{' '}
              <Link href="/admin/users" className="text-violet-300 hover:underline">
                Quản lý người dùng
              </Link>
              .
            </p>
            <p className="mt-3 text-xs text-slate-500">Admin không có /dashboard/moderate — dùng override trên bài viết.</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 my-8">
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{viText.admin.users}</p>
            <p className="text-2xl font-bold text-white mt-1">{loading ? '...' : (analytics?.kpis.totalUsers ?? '—')}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{viText.admin.courses}</p>
            <p className="text-2xl font-bold text-white mt-1">{courseCount ?? '...'}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{viText.admin.orders}</p>
            <p className="text-2xl font-bold text-white mt-1">
              {loading ? '...' : kpiOrdersTotal ?? '—'}
            </p>
            {kpiOrdersHint ? <p className="text-[10px] text-gray-500 mt-1">{kpiOrdersHint}</p> : null}
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Chờ thanh toán</p>
            <p className="text-2xl font-bold text-amber-300 mt-1">
              {loading ? '...' : kpiPending ?? '—'}
            </p>
            {!loading && kpiPending == null && !canViewOrderOps ? (
              <p className="text-[10px] text-gray-500 mt-1">Cần quyền Đơn hàng để xem số liệu thời gian thực.</p>
            ) : null}
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{viText.admin.revenue} (VND)</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? '...' : kpiRevenue != null ? `${kpiRevenue.toLocaleString('vi-VN')} ₫` : '—'}
            </p>
            {kpiRevenueHint ? (
              <p className="text-[10px] text-gray-500 mt-1">{kpiRevenueHint}</p>
            ) : orderStats?.usdToVndRate != null ? (
              <p className="text-[10px] text-gray-500 mt-1">
                Tổng tích lũy · quy đổi USD × {orderStats.usdToVndRate.toLocaleString('vi-VN')}
              </p>
            ) : null}
          </Card>
          <Link href="/studio" className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 hover:bg-cyan-500/20 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-cyan-300 uppercase tracking-wider">Studio</p>
              <Badge>Giảng viên</Badge>
            </div>
            <p className="text-white font-medium mt-1">Mở Studio →</p>
          </Link>
          <Link href="/admin/gem-economy" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 hover:bg-emerald-500/20 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-emerald-300 uppercase tracking-wider">Kinh tế Gem</p>
              <Badge>Cấu hình</Badge>
            </div>
            <p className="text-white font-medium mt-1">Chỉ số và cửa hàng →</p>
          </Link>
          <Link href="/admin/promo-codes" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 hover:bg-amber-500/20 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-amber-200 uppercase tracking-wider">Coupon</p>
              <Badge>Giảm giá</Badge>
            </div>
            <p className="text-white font-medium mt-1">Mã & banner sự kiện →</p>
          </Link>
          <Link href="/admin/broadcast" className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 hover:bg-violet-500/20 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-violet-200 uppercase tracking-wider">Thông báo</p>
              <Badge>Broadcast</Badge>
            </div>
            <p className="text-white font-medium mt-1">Gửi tới user / vai trò →</p>
          </Link>
        </div>

        <section className="rounded-2xl border border-white/10 bg-ds-base overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h2 className="font-semibold text-white mr-2 shrink-0">Phân tích dữ liệu</h2>
              {/* Analytics sections — keyboard nav (← →) and a11y come from Tabs primitive */}
              <Tabs value={analyticsTab} onValueChange={(v) => setAnalyticsTab(v as typeof analyticsTab)}>
                <TabList aria-label="Phân tích dữ liệu" className="border-b-0">
                  {(['overview', 'funnel', 'learning-path', 'explore'] as const).map((tab) => (
                    <Tab key={tab} value={tab}>
                      {analyticsTabLabel[tab]}
                    </Tab>
                  ))}
                </TabList>
              </Tabs>
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
                  className={`px-3 py-1.5 text-xs rounded-ds-control border transition-colors ${
                    analyticsRange === range
                      ? 'border-ds-accent-strong bg-ds-accent-soft text-ds-accent'
                      : 'border-ds-border bg-ds-surface text-ds-muted hover:border-ds-accent-strong'
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
            <EmptyState
              title={analyticsError ? 'Không tải được analytics' : 'Chưa có dữ liệu analytics'}
              description={
                analyticsError ||
                (process.env.NODE_ENV === 'development'
                  ? 'Local: kiểm tra API đang chạy (port 3002), MongoDB có dữ liệu, và đăng nhập admin. Deploy có dữ liệu thật nên thường đầy hơn môi trường dev.'
                  : 'Hệ thống sẽ hiển thị biểu đồ khi có dữ liệu hành vi và giao dịch đủ để tổng hợp.')
              }
              className="m-4"
            />
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
                  {funnelLoading ? (
                    <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-3">
                      <Spinner />
                      <span>Đang tải phễu…</span>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              )}

              {analyticsTab === 'learning-path' && (
                <div className="space-y-4">
                  {learningPathLoading ? (
                    <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-3">
                      <Spinner />
                      <span>Đang tải lộ trình học…</span>
                    </div>
                  ) : (
                    <>
                  <div className="flex flex-col md:flex-row gap-3">
                    <Select
                      value={learningPathFilter.moduleId}
                      onChange={(e) => setLearningPathFilter((prev) => ({ ...prev, moduleId: e.target.value }))}
                    >
                      <option value="">Tất cả chương</option>
                      {(learningPathAnalytics?.filterOptions.modules ?? []).map((module) => (
                        <option key={module.moduleId} value={module.moduleId}>
                          {(module.moduleOrder ? `M${module.moduleOrder}. ` : '') + module.moduleTitle}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={learningPathFilter.depth}
                      onChange={(e) =>
                        setLearningPathFilter((prev) => ({
                          ...prev,
                          depth: e.target.value as '' | 'beginner' | 'explorer' | 'researcher',
                        }))
                      }
                    >
                      <option value="">Tất cả độ sâu</option>
                      {(learningPathAnalytics?.filterOptions.depths ?? []).map((depth) => (
                        <option key={depth.value} value={depth.value}>
                          {depth.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] text-gray-500 uppercase">Lượt tương tác</p>
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
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] text-gray-500 uppercase">Vượt quiz ôn tập</p>
                      <p className="text-xl font-semibold text-violet-300 mt-1">{learningPathAnalytics?.summary.lessonMastered ?? 0}</p>
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
                      <p className="text-sm text-white font-medium mb-2">Chuyển mức độ học</p>
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
                      <p className="text-sm text-white font-medium mb-2">Chương có nhiều lượt mở bài</p>
                      <div className="space-y-2">
                        {(learningPathAnalytics?.moduleEngagement ?? []).slice(0, 6).map((row) => (
                          <div key={row.moduleId} className="flex justify-between text-sm">
                            <span className="text-gray-300">{row.moduleTitle}</span>
                            <span className="text-cyan-300">{row.opens} lượt mở · {row.avgDwellSec}s trung bình</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-sm text-white font-medium mb-2">Khái niệm được xem nhiều</p>
                    <p className="text-xs text-gray-500 mb-3">Số lần mở panel khái niệm trong bài học.</p>
                    {!(learningPathAnalytics?.topConcepts?.length) ? (
                      <p className="text-sm text-gray-500">Chưa có dữ liệu trong khoảng thời gian này.</p>
                    ) : (
                      <div className="space-y-2">
                        {learningPathAnalytics.topConcepts.slice(0, 12).map((row) => (
                          <div key={row.conceptId} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                            <div className="min-w-0">
                              <p className="text-gray-100 font-medium truncate">{row.conceptTitle}</p>
                              {row.conceptTitle !== row.conceptId && (
                                <p className="text-[11px] text-gray-500 truncate">Mã: {row.conceptId}</p>
                              )}
                            </div>
                            <div className="shrink-0 text-right text-xs text-gray-400">
                              <p>
                                Lượt xem: <span className="text-cyan-300">{row.opens}</span>
                              </p>
                              <p>
                                Người học: <span className="text-emerald-300">{row.uniqueUsers}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-sm text-white font-medium mb-1">Bài học nhiều người bỏ dở</p>
                    <p className="text-xs text-gray-500 mb-3">So sánh lượt mở bài và lượt đánh dấu hoàn thành.</p>
                    {!(learningPathAnalytics?.topLessons?.length) ? (
                      <p className="text-sm text-gray-500">Chưa có dữ liệu đủ để phân tích.</p>
                    ) : (
                      <div className="space-y-3">
                        {learningPathAnalytics.topLessons.slice(0, 8).map((row) => (
                          <div key={row.lessonId} className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                              <div>
                                <p className="text-sm text-white font-medium">{row.lessonTitle}</p>
                                <p className="text-xs text-gray-400">
                                  {row.locationLabel || `${row.moduleTitle} · ${row.nodeTitle}`}
                                </p>
                              </div>
                              <div className="text-right text-xs text-gray-300">
                                <p>
                                  Mở bài: <span className="text-cyan-300">{row.opens}</span>
                                </p>
                                <p>
                                  Hoàn thành: <span className="text-emerald-300">{row.completions}</span>
                                </p>
                                <p>
                                  Bỏ dở:{' '}
                                  <span className="text-rose-300">
                                    {row.dropOffCount} ({row.dropOffRate}%)
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                    </>
                  )}
                </div>
              )}

              {analyticsTab === 'explore' && (
                <div className="space-y-4">
                  {exploreAnalyticsLoading ? (
                    <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-3">
                      <Spinner />
                      <span>Đang tải Explore analytics...</span>
                    </div>
                  ) : !exploreAnalytics ? (
                    <EmptyState
                      title="Chưa có dữ liệu Explore"
                      description="Dữ liệu xuất hiện khi người dùng tương tác với mô hình 3D và quiz ngữ cảnh."
                      className="m-4"
                    />
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <p className="text-[11px] text-gray-500 uppercase">Khám phá thiên thể</p>
                          <p className="text-xl font-semibold text-white mt-1">{exploreAnalytics.summary.discoveries}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <p className="text-[11px] text-gray-500 uppercase">Người khám phá</p>
                          <p className="text-xl font-semibold text-cyan-200 mt-1">{exploreAnalytics.summary.discoveryUsers}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <p className="text-[11px] text-gray-500 uppercase">Mở quiz</p>
                          <p className="text-xl font-semibold text-violet-300 mt-1">{exploreAnalytics.summary.quizPrompts}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <p className="text-[11px] text-gray-500 uppercase">Quiz đúng hết</p>
                          <p className="text-xl font-semibold text-emerald-300 mt-1">{exploreAnalytics.summary.quizPasses}</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <p className="text-sm text-white font-medium mb-4">Phễu Explore 3D</p>
                        <div className="space-y-3">
                          {exploreAnalytics.funnel.map((row) => {
                            const maxValue = Math.max(1, ...exploreAnalytics.funnel.map((item) => item.uniqueSessions))
                            const width = `${Math.max(6, (row.uniqueSessions / maxValue) * 100)}%`
                            return (
                              <div key={row.step} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-300">{row.label}</span>
                                  <span className="text-cyan-300 font-medium">{row.uniqueSessions} phiên</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                                  <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-500" style={{ width }} />
                                </div>
                                <p className="text-xs text-gray-500">
                                  Từ đầu phễu: {row.conversionFromStart}% · So với bước trước: {row.conversionFromPrev}%
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-sm text-white font-medium mb-2">Top thiên thể</p>
                        {!(exploreAnalytics.topEntities?.length) ? (
                          <p className="text-sm text-gray-500">Chưa có dữ liệu entity trong khoảng thời gian này.</p>
                        ) : (
                          <div className="space-y-2">
                            {exploreAnalytics.topEntities.map((row) => (
                              <div
                                key={row.entityId}
                                className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                              >
                                <p className="text-gray-200 font-mono truncate">{row.entityId}</p>
                                <div className="shrink-0 text-right text-xs text-gray-400">
                                  <p>
                                    Khám phá: <span className="text-cyan-300">{row.discoveries}</span>
                                  </p>
                                  <p>
                                    Quiz pass: <span className="text-emerald-300">{row.quizPasses}</span>
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
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
                      Doanh thu: <span className="text-emerald-300">{analytics.kpis.revenue.toLocaleString('vi-VN')} ₫</span>
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

        <AdminTeacherApplicationsPanel
          apps={teacherApps}
          filter={teacherAppFilter}
          onFilterChange={setTeacherAppFilter}
          loading={teacherAppLoading}
          reviewingAppId={reviewingAppId}
          onMarkCvReviewed={handleMarkCvReviewed}
          onReview={handleReviewTeacherApp}
        />

        <div className="flex flex-wrap gap-3 mb-8">
          <Link
            href="/admin/users"
            className="rounded-xl border border-white/10 bg-ds-base px-4 py-3 text-sm text-cyan-300 hover:border-cyan-500/40 transition-colors"
          >
            Quản lý người dùng →
          </Link>
          <Link
            href="/admin/orders"
            className="rounded-xl border border-white/10 bg-ds-base px-4 py-3 text-sm text-cyan-300 hover:border-cyan-500/40 transition-colors"
          >
            Quản lý đơn hàng →
          </Link>
        </div>
    </div>
  )
}
