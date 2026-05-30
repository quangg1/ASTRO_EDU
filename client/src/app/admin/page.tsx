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
import { canAccessAdmin, canAccessAdminPath } from '@/lib/roles'
import { labelAccountStatusVi, labelUserRoleVi } from '@/features/admin/lib/adminLabelsVi'
import {
  fetchAdminUsers,
  deleteUserPermanently,
  updateUserRole,
  updateUserStatus,
  fetchAdminTeacherApplications,
  reviewTeacherApplication,
  markTeacherApplicationCvReviewed,
  fetchAdminAnalyticsCohort,
  fetchAdminAnalyticsFunnel,
  fetchAdminLearningPathAnalytics,
  fetchAdminAgentAnalytics,
  fetchAdminAnalyticsOverview,
  fetchAdminAnalyticsRetention,
  type AdminUser,
  type UserRole,
  type TeacherApplicationWithUser,
  type AdminAnalyticsCohort,
  type AdminAnalyticsFunnelItem,
  type AdminLearningPathAnalytics,
  type AdminAgentAnalytics,
  type AdminAnalyticsOverview,
  type AdminAnalyticsRetention,
  type AnalyticsRange,
} from '@/features/admin/public'
import { fetchCourses } from '@/features/courses/public'
import { fetchAdminOrderStats, type AdminOrder, type AdminOrderStats } from '@/features/payment/public'
import { formatOrderAmount } from '@/lib/money'
import {
  formatOrderDateVi,
  orderKindLabelVi,
  orderStatusLabelVi,
  orderStatusTone,
} from '@/features/payment/lib/orderLabels'
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
  const [users, setUsers] = useState<AdminUser[]>([])
  const [courseCount, setCourseCount] = useState<number | null>(null)
  const [orderStats, setOrderStats] = useState<AdminOrderStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([])
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('30d')
  const [analyticsTab, setAnalyticsTab] = useState<
    'overview' | 'funnel' | 'retention' | 'cohort' | 'learning-path' | 'agent'
  >('overview')
  const [analytics, setAnalytics] = useState<AdminAnalyticsOverview | null>(null)
  const [analyticsFunnel, setAnalyticsFunnel] = useState<AdminAnalyticsFunnelItem[]>([])
  const [analyticsRetention, setAnalyticsRetention] = useState<AdminAnalyticsRetention | null>(null)
  const [analyticsCohort, setAnalyticsCohort] = useState<AdminAnalyticsCohort[]>([])
  const [learningPathAnalytics, setLearningPathAnalytics] = useState<AdminLearningPathAnalytics | null>(null)
  const [agentAnalytics, setAgentAnalytics] = useState<AdminAgentAnalytics | null>(null)
  const [agentAnalyticsLoading, setAgentAnalyticsLoading] = useState(false)
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
    agent: 'Agent học tập',
  }

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/admin')
    if (checked && user && !canAccessAdmin(user)) router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user) return
    if (!canAccessAdminPath(user, '/admin')) return
    setLoading(true)
    void Promise.allSettled([
      fetchAdminUsers(),
      fetchCourses(),
      fetchAdminOrderStats(),
      fetchAdminAnalyticsOverview(analyticsRange),
      fetchAdminAnalyticsFunnel(analyticsRange),
      fetchAdminAnalyticsRetention(analyticsRange),
      fetchAdminAnalyticsCohort(analyticsRange),
      fetchAdminLearningPathAnalytics(analyticsRange, learningPathFilter),
    ])
      .then((results) => {
        const val = <T,>(i: number, fallback: T): T =>
          results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<T>).value : fallback

        const uRes = val(0, { success: false, error: 'Không tải danh sách người dùng' } as Awaited<ReturnType<typeof fetchAdminUsers>>)
        const courses = val(1, [] as Awaited<ReturnType<typeof fetchCourses>>)
        const orderOverview = val(2, { stats: null, orders: [] as AdminOrder[] })
        const analyticsOverview = val(3, { success: false, error: 'Không tải analytics' } as Awaited<ReturnType<typeof fetchAdminAnalyticsOverview>>)
        const funnelOverview = val(4, { success: false, error: 'Không tải funnel' } as Awaited<ReturnType<typeof fetchAdminAnalyticsFunnel>>)
        const retentionOverview = val(5, { success: false, error: 'Không tải retention' } as Awaited<ReturnType<typeof fetchAdminAnalyticsRetention>>)
        const cohortOverview = val(6, { success: false, error: 'Không tải cohort' } as Awaited<ReturnType<typeof fetchAdminAnalyticsCohort>>)
        const lpOverview = val(7, { success: false, error: 'Không tải learning path' } as Awaited<ReturnType<typeof fetchAdminLearningPathAnalytics>>)

        if (uRes.success && uRes.data) setUsers(uRes.data)
        else setError(uRes.error || '')
        setMessage(null)
        setCourseCount(Array.isArray(courses) ? courses.length : 0)
        setOrderStats(orderOverview.stats)
        setRecentOrders(orderOverview.orders ?? [])
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

        const failed = results.filter((r) => r.status === 'rejected')
        if (failed.length > 0 && process.env.NODE_ENV === 'development') {
          console.warn('[admin] Một số API dashboard lỗi:', failed)
        }
      })
      .finally(() => setLoading(false))
  }, [user, analyticsRange, learningPathFilter])

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
    if (analyticsTab !== 'agent') return
    setAgentAnalyticsLoading(true)
    void fetchAdminAgentAnalytics(analyticsRange)
      .then((res) => {
        if (res.success && res.data) setAgentAnalytics(res.data)
        else setAgentAnalytics(null)
      })
      .finally(() => setAgentAnalyticsLoading(false))
  }, [user, analyticsTab, analyticsRange])

  useEffect(() => {
    if (!user || !canAccessAdminPath(user, '/admin')) return
    trackEvent('admin_dashboard_viewed', { range: analyticsRange })
  }, [user, analyticsRange])

  if (!checked || !user) {
    return <div className="min-h-screen bg-black pt-20 px-4 text-gray-400">Đang kiểm tra phiên đăng nhập...</div>
  }

  if (!canAccessAdminPath(user, '/admin')) {
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
      const [uRes, appsRes] = await Promise.all([fetchAdminUsers(), fetchAdminTeacherApplications(teacherAppFilter)])
      if (uRes.success && uRes.data) setUsers(uRes.data)
      if (appsRes.success && appsRes.data) setTeacherApps(appsRes.data)
    } else {
      setError(res.error || '')
      setMessage('error')
    }
  }

  const handleDeleteUser = async (u: AdminUser) => {
    if (u.id === user?.id) return
    if (!u.email) {
      setError('Tài khoản không có email — không thể xóa (cần gửi thông báo trước).')
      setMessage('error')
      return
    }
    const reason =
      window.prompt(
        'Lý do xóa vĩnh viễn (gửi cho người dùng qua email, tối thiểu 10 ký tự):',
        u.deactivationReason || '',
      ) || ''
    if (!reason.trim() || reason.trim().length < 10) {
      setError('Cần nhập lý do ít nhất 10 ký tự.')
      setMessage('error')
      return
    }
    const ok = window.confirm(
      `XÓA VĨNH VIỄN «${u.email}»?\n\nEmail thông báo (kèm lý do) sẽ gửi trước. Không thể hoàn tác.`,
    )
    if (!ok) return
    const confirmEmail = window.prompt(
      `Nhập lại email để xác nhận:\n${u.email}`,
      '',
    )
    if (!confirmEmail?.trim()) return
    setUpdatingId(u.id)
    setMessage(null)
    setError('')
    const res = await deleteUserPermanently(u.id, confirmEmail.trim(), reason.trim())
    setUpdatingId(null)
    if (res.success) {
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
      setMessage('success')
      trackEvent('admin_user_deleted', { target_role: u.role })
    } else {
      const code = 'code' in res ? String(res.code) : ''
      const msg =
        code === 'SMTP_NOT_CONFIGURED' || code === 'DELETE_EMAIL_FAILED'
          ? `${res.error || ''} Lưu services/api/.env (SMTP_*, MAIL_FROM), restart npm run dev:api.`
          : res.error || ''
      setError(msg)
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
              Hàng đợi báo cáo, cảnh báo, ẩn/xóa — chỉ diễn đàn. Gán vai trò {labelUserRoleVi('moderator')} trong bảng người dùng bên dưới.
            </p>
            <p className="mt-3 text-xs text-slate-500">Admin không có /dashboard/moderate — dùng override trên bài viết.</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 my-8">
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
            <p className="text-xs text-gray-500 uppercase tracking-wider">Chờ thanh toán</p>
            <p className="text-2xl font-bold text-amber-300 mt-1">
              {orderStats?.pendingOrders ?? '...'}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{viText.admin.revenue} (VND)</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {orderStats ? orderStats.totalRevenue.toLocaleString('vi-VN') : '...'}
              {orderStats ? ' ₫' : ''}
            </p>
            {orderStats?.usdToVndRate != null && (
              <p className="text-[10px] text-gray-500 mt-1">
                Đã quy đổi USD × {orderStats.usdToVndRate.toLocaleString('vi-VN')} — đơn vẫn hiển thị USD/VND gốc.
              </p>
            )}
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

        <section className="rounded-2xl border border-white/10 bg-[#0a0f17] overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h2 className="font-semibold text-white mr-2 shrink-0">Phân tích dữ liệu</h2>
              {/* Analytics sections — keyboard nav (← →) and a11y come from Tabs primitive */}
              <Tabs value={analyticsTab} onValueChange={(v) => setAnalyticsTab(v as typeof analyticsTab)}>
                <TabList aria-label="Phân tích dữ liệu" className="border-b-0">
                  {(['overview', 'funnel', 'retention', 'cohort', 'learning-path', 'agent'] as const).map((tab) => (
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
                    <Select
                      value={learningPathFilter.moduleId}
                      onChange={(e) => setLearningPathFilter((prev) => ({ ...prev, moduleId: e.target.value }))}
                    >
                      <option value="">Tất cả module</option>
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
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] text-gray-500 uppercase">Mastery (quiz)</p>
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
                    <p className="text-sm text-white font-medium mb-2">Concept được mở nhiều (heatmap)</p>
                    <p className="text-xs text-gray-500 mb-3">Từ sự kiện mở panel concept trong bài học.</p>
                    {!(learningPathAnalytics?.topConcepts?.length) ? (
                      <p className="text-sm text-gray-500">Chưa có dữ liệu concept trong khoảng thời gian này.</p>
                    ) : (
                      <div className="space-y-2">
                        {learningPathAnalytics.topConcepts.slice(0, 12).map((row) => (
                          <div key={row.conceptId} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                            <div className="min-w-0">
                              <p className="text-gray-200 truncate">{row.conceptTitle}</p>
                              <p className="text-[11px] text-gray-500 font-mono truncate">{row.conceptId}</p>
                            </div>
                            <div className="shrink-0 text-right text-xs text-gray-400">
                              <p>
                                Mở: <span className="text-cyan-300">{row.opens}</span>
                              </p>
                              <p>
                                User: <span className="text-emerald-300">{row.uniqueUsers}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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

              {analyticsTab === 'agent' && (
                <div className="space-y-4">
                  {agentAnalyticsLoading ? (
                    <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-3">
                      <Spinner />
                      <span>Đang tải agent analytics...</span>
                    </div>
                  ) : !agentAnalytics ? (
                    <EmptyState
                      title="Chưa có dữ liệu agent"
                      description="Dữ liệu xuất hiện khi người học dùng Agent trên bài học hoặc Explore."
                      className="m-4"
                    />
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <p className="text-[11px] text-gray-500 uppercase">Phiên agent</p>
                          <p className="text-xl font-semibold text-white mt-1">{agentAnalytics.summary.agentSessions}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <p className="text-[11px] text-gray-500 uppercase">Người dùng agent</p>
                          <p className="text-xl font-semibold text-cyan-200 mt-1">{agentAnalytics.summary.agentUsers}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <p className="text-[11px] text-gray-500 uppercase">Tin nhắn</p>
                          <p className="text-xl font-semibold text-violet-300 mt-1">{agentAnalytics.summary.agentMessages}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <p className="text-[11px] text-gray-500 uppercase">Hồ sơ học agent</p>
                          <p className="text-xl font-semibold text-emerald-300 mt-1">{agentAnalytics.summary.learnerProfiles}</p>
                        </div>
                      </div>
                      <div className="h-[280px] rounded-xl border border-white/10 bg-black/20 p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={agentAnalytics.daily.map((row) => ({
                              date: row.date.slice(5),
                              sessions: row.sessions,
                              messages: row.messages,
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis dataKey="date" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="sessions" stroke="#22d3ee" fill="#22d3ee33" name="Phiên" />
                            <Area type="monotone" dataKey="messages" stroke="#a78bfa" fill="#a78bfa22" name="Tin nhắn" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-sm text-white font-medium mb-2">Heatmap khó khăn (bài + tín hiệu)</p>
                        {!(agentAnalytics.struggleHeatmap?.length) ? (
                          <p className="text-sm text-gray-500">Chưa có tín hiệu struggle trong khoảng thời gian này.</p>
                        ) : (
                          <div className="space-y-2">
                            {agentAnalytics.struggleHeatmap.slice(0, 12).map((row) => (
                              <div
                                key={`${row.lessonId}:${row.signal}`}
                                className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                              >
                                <div className="min-w-0">
                                  <p className="text-gray-200 truncate">{row.lessonTitle || row.lessonId}</p>
                                  <p className="text-[11px] text-gray-500">{row.signal}</p>
                                </div>
                                <div className="shrink-0 text-right text-xs text-gray-400">
                                  <p>
                                    User: <span className="text-cyan-300">{row.uniqueUsers}</span>
                                  </p>
                                  <p>
                                    Quiz fail: <span className="text-rose-300">{row.quizFailProfiles}</span>
                                  </p>
                                  <p>
                                    Dwell: <span className="text-emerald-300">{row.totalDwellSec}s</span>
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

        <section className="rounded-2xl border border-white/10 bg-[#0a0f17] overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="font-semibold text-white">{viText.admin.users}</h2>
            <Link href="/admin/users" className="text-xs text-cyan-400 hover:underline">Trang quản lý đầy đủ →</Link>
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
                          {labelAccountStatusVi(u.accountStatus)}
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
                          {labelUserRoleVi(u.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                          disabled={updatingId === u.id || u.id === user?.id}
                          className="text-xs w-auto"
                        >
                          <option value="student">{labelUserRoleVi('student')}</option>
                          <option value="teacher">{labelUserRoleVi('teacher')}</option>
                          <option value="moderator">{labelUserRoleVi('moderator')}</option>
                          <option value="admin">{labelUserRoleVi('admin')}</option>
                        </Select>
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
                          <button
                            type="button"
                            onClick={() => void handleDeleteUser(u)}
                            disabled={updatingId === u.id || u.id === user?.id}
                            className="block text-xs rounded-lg px-2 py-1.5 border border-red-600/50 bg-red-950/40 text-red-300 hover:bg-red-900/50 disabled:opacity-50"
                          >
                            Xóa vĩnh viễn
                          </button>
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
          <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="font-semibold text-white">Đơn hàng gần đây</h2>
            <Link href="/admin/orders" className="text-xs text-cyan-400 hover:underline">Quản lý đơn hàng →</Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">{viText.common.loading}</div>
          ) : recentOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{viText.admin.noOrders}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[960px]">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-500 uppercase">
                    <th className="px-4 py-3">Người mua</th>
                    <th className="px-4 py-3">Khóa học</th>
                    <th className="px-4 py-3">Loại</th>
                    <th className="px-4 py-3">Mã đơn</th>
                    <th className="px-4 py-3">Số tiền</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Tạo lúc</th>
                    <th className="px-4 py-3">Hết hạn</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => {
                    const tone = orderStatusTone(o.status)
                    const statusCls =
                      tone === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : tone === 'warning'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-red-500/20 text-red-300'
                    const buyer =
                      o.buyerName || o.buyerEmail
                        ? [o.buyerName, o.buyerEmail].filter(Boolean).join(' · ')
                        : o.userId || '—'
                    const kind = o.orderKind || (o.cohortId ? 'cohort' : 'catalog')

                    return (
                      <tr key={o._id} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-3 text-gray-200 max-w-[180px]">
                          <span className="block truncate" title={buyer}>
                            {buyer}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-cyan-300">{o.courseSlug}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{orderKindLabelVi(kind)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{o.txnRef}</td>
                        <td className="px-4 py-3 text-gray-200">
                          {formatOrderAmount(o.amount, o.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${statusCls}`}>
                            {orderStatusLabelVi(o.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                          {formatOrderDateVi(o.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                          {o.status === 'pending' && o.expiresAt
                            ? formatOrderDateVi(o.expiresAt)
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
    </div>
  )
}
