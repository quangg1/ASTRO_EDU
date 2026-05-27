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
import { Spinner } from '@/components/ui/Spinner'

/* ─── Design helpers ─── */
const chamfer = (cut = 18) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function Brackets({ c = '#7ee7ff', s = 14, o = 6 }: { c?: string; s?: number; o?: number }) {
  const b = (ex: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', width: s, height: s, opacity: 0.8, pointerEvents: 'none', ...ex,
  })
  return (
    <>
      <span style={b({ top: o, left: o, borderTop: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` })} />
      <span style={b({ top: o, right: o, borderTop: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` })} />
      <span style={b({ bottom: o, left: o, borderBottom: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` })} />
      <span style={b({ bottom: o, right: o, borderBottom: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` })} />
    </>
  )
}

function HudPanel({ children, amber, style: extra, className }: {
  children: React.ReactNode; amber?: boolean; style?: React.CSSProperties; className?: string
}) {
  const accent = amber ? '#f5a524' : '#7ee7ff'
  const border = amber ? 'rgba(245,165,36,0.28)' : 'rgba(126,231,255,0.18)'
  const bg = amber
    ? 'linear-gradient(135deg,rgba(18,10,2,0.97) 0%,rgba(24,14,3,0.95) 100%)'
    : 'rgba(6,9,26,0.92)'
  return (
    <div className={`relative${className ? ' ' + className : ''}`}
      style={{ background: bg, border: `1px solid ${border}`, boxShadow: `inset 0 0 24px ${amber ? 'rgba(245,165,36,0.05)' : 'rgba(126,231,255,0.04)'}, 0 4px 32px rgba(0,0,0,0.4)`, ...chamfer(18), ...extra }}>
      <Brackets c={accent} />
      {children}
    </div>
  )
}

/* ─── Mono label ─── */
function MonoLabel({ children, color = '#8a9bb8' }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color }}>
      {children}
    </span>
  )
}

/* ─── Status pill ─── */
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; dot: string }> = {
    active:      { bg: 'rgba(109,255,176,0.12)', color: '#6dffb0', dot: '#6dffb0' },
    deactivated: { bg: 'rgba(255,80,80,0.12)',   color: '#ff9090', dot: '#ff6060' },
    completed:   { bg: 'rgba(109,255,176,0.12)', color: '#6dffb0', dot: '#6dffb0' },
    pending:     { bg: 'rgba(245,165,36,0.15)',  color: '#f5a524', dot: '#f5a524' },
    approved:    { bg: 'rgba(109,255,176,0.12)', color: '#6dffb0', dot: '#6dffb0' },
    rejected:    { bg: 'rgba(255,80,80,0.12)',   color: '#ff9090', dot: '#ff6060' },
  }
  const s = map[status] ?? { bg: 'rgba(255,255,255,0.08)', color: '#9aa8c4', dot: '#5c6886' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: s.bg, border: `1px solid ${s.color}44`, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: s.color, ...chamfer(6) }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, boxShadow: `0 0 5px ${s.dot}`, flexShrink: 0 }} />
      {status}
    </span>
  )
}

/* ─── Role tag ─── */
function RoleTag({ role }: { role: string }) {
  const map: Record<string, { color: string; border: string }> = {
    admin:     { color: '#f5a524', border: 'rgba(245,165,36,0.4)' },
    teacher:   { color: '#7ee7ff', border: 'rgba(126,231,255,0.4)' },
    moderator: { color: '#c4b5fd', border: 'rgba(196,181,253,0.4)' },
    student:   { color: '#5c6886', border: 'rgba(92,104,134,0.35)' },
  }
  const s = map[role] ?? { color: '#9aa8c4', border: 'rgba(154,168,196,0.3)' }
  return (
    <span style={{ padding: '3px 8px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: s.color, border: `1px solid ${s.border}`, background: `${s.color}0d`, ...chamfer(5) }}>
      {role}
    </span>
  )
}

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
    return <div className="min-h-screen pt-20 px-4" style={{ background: '#03060f', color: '#9aa8c4', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>Đang kiểm tra phiên đăng nhập...</div>
  }

  if (user.role !== 'admin') return null

  const handleRoleChange = async (u: AdminUser, newRole: UserRole) => {
    if (u.role === newRole) return
    setUpdatingId(u.id)
    setMessage(null)
    setError('')
    const res = await updateUserRole(u.id, newRole)
    setUpdatingId(null)
    if (res.success && res.user) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: res.user!.role } : x)))
      trackEvent('admin_user_role_changed', { target_role: newRole })
      setMessage('success')
    } else {
      setError(res.error || '')
      setMessage('error')
    }
  }

  const handleReviewTeacherApp = async (app: TeacherApplicationWithUser, action: 'approve' | 'reject') => {
    const note = action === 'reject' ? window.prompt('Ghi chú từ chối (tuỳ chọn):', '') ?? '' : ''
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
    const reason = nextStatus === 'deactivated'
      ? window.prompt('Lý do ngừng hoạt động:', u.deactivationReason || 'Ngừng hoạt động từ admin') || ''
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

  /* ── Shared select style ── */
  const selectStyle: React.CSSProperties = {
    background: 'rgba(6,9,26,0.9)',
    border: '1px solid rgba(126,231,255,0.25)',
    color: '#eaf6ff',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 12,
    letterSpacing: '0.08em',
    padding: '6px 12px',
    outline: 'none',
    cursor: 'pointer',
    ...chamfer(8),
  }

  return (
    <div style={{ minHeight: '100vh', background: '#03060f', color: '#eaf6ff', fontFamily: 'Space Grotesk, sans-serif', position: 'relative' }}>

      {/* ── Starfield + atmosphere ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
          {Array.from({ length: 120 }).map((_, i) => {
            const cx = ((i * 137.5) % 100).toFixed(2)
            const cy = ((i * 97.3 + 13) % 100).toFixed(2)
            const r = (0.4 + (i % 5) * 0.22).toFixed(2)
            const op = (0.2 + (i % 7) * 0.1).toFixed(2)
            const fill = i % 10 === 0 ? '#7ee7ff' : i % 8 === 0 ? '#f5a524' : '#eaf6ff'
            return <circle key={i} cx={`${cx}%`} cy={`${cy}%`} r={r} fill={fill} opacity={op} />
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(126,231,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(126,231,255,0.022) 1px,transparent 1px)', backgroundSize: '80px 80px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '40vw', height: '40vh', background: 'radial-gradient(ellipse,rgba(245,165,36,0.025) 0%,transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40vw', height: '40vh', background: 'radial-gradient(ellipse,rgba(126,231,255,0.025) 0%,transparent 70%)' }} />
        <div style={{ position: 'absolute', left: 6, top: '50%', transform: 'rotate(-90deg) translateX(-50%)', transformOrigin: 'left center', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#1a2235', userSelect: 'none' }}>
          CosmoLearn · v2.6 · Hanoi observatory link
        </div>
        <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'rotate(90deg) translateX(50%)', transformOrigin: 'right center', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#1a2235', userSelect: 'none' }}>
          Lat 21.0285° N — Lon 105.8542° E — Alt 12m
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '92px 32px 64px' }}>

        {/* ── ADM-HEAD ── */}
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 40 }}>
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.22em', color: '#8a9bb8', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 20, height: 1, background: 'rgba(126,231,255,0.3)', display: 'inline-block' }} />
              // admin · console · all systems nominal
            </p>
            <h1 style={{ fontSize: 'clamp(37px,4vw,57px)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1, color: '#eaf6ff', margin: 0 }}>
              Bảng{' '}
              <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#f5a524' }}>quản trị</em>
            </h1>
            <p style={{ marginTop: 10, fontSize: 15, color: '#9aa8c4', maxWidth: 480 }}>
              Theo dõi người dùng, doanh thu và hành vi học tập từ một bề mặt quản trị thống nhất.
            </p>
          </div>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', border: '1px solid rgba(126,231,255,0.3)', background: 'rgba(126,231,255,0.06)', color: '#7ee7ff', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', transition: 'border-color 0.2s', ...chamfer(10), alignSelf: 'flex-start', marginTop: 4 }}>
            ← Trang chủ
          </Link>
        </header>

        {/* ── KPI Strip (01–04) ── */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
          {[
            { label: 'Người dùng', value: loading ? '…' : users.length, sub: 'tổng tài khoản', color: '#f5a524', idx: '01' },
            { label: 'Khóa học', value: courseCount ?? '…', sub: 'đang xuất bản', color: '#f5a524', idx: '02' },
            { label: 'Đơn hàng', value: orderStats ? orderStats.totalOrders : '…', sub: 'trong 30 ngày', color: '#f5a524', idx: '03' },
            { label: 'Doanh thu (VND)', value: orderStats ? orderStats.totalRevenue.toLocaleString('en-US') : '…', sub: 'đã ghi nhận', color: '#6dffb0', idx: '04' },
          ].map((k) => (
            <div key={k.idx} className="relative" style={{ background: 'rgba(6,9,26,0.92)', border: '1px solid rgba(126,231,255,0.18)', boxShadow: 'inset 0 0 20px rgba(126,231,255,0.04), 0 4px 24px rgba(0,0,0,0.4)', padding: '22px 20px 18px', minHeight: 148, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', ...chamfer(14) }}>
              <Brackets c="#7ee7ff" s={12} o={5} />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <MonoLabel color="#5c6886">KPI · {k.idx}</MonoLabel>
              </div>
              <div>
                <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 57, fontWeight: 400, lineHeight: 1, margin: 0, background: `linear-gradient(180deg,${k.color === '#6dffb0' ? '#a3ffda' : '#ffd27a'} 0%,${k.color} 60%,${k.color}55 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {k.value}
                </p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9aa8c4', marginTop: 4 }}>
                  {k.label}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 10, borderTop: '1px dashed rgba(126,231,255,0.12)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: k.color, boxShadow: `0 0 5px ${k.color}`, flexShrink: 0 }} />
                <MonoLabel color="#5c6886">{k.sub}</MonoLabel>
              </div>
            </div>
          ))}
        </section>

        {/* ── Studio CTA ── */}
        <section style={{ marginBottom: 32 }}>
          <Link href="/studio" style={{ textDecoration: 'none', display: 'block', maxWidth: 320 }}>
            <div className="relative" style={{ background: 'rgba(6,9,26,0.92)', border: '1px solid rgba(126,231,255,0.22)', padding: '18px 20px', ...chamfer(14) }}>
              <Brackets c="#7ee7ff" s={11} o={5} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <MonoLabel color="#9aa8c4">Studio</MonoLabel>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: 'rgba(109,255,176,0.12)', border: '1px solid rgba(109,255,176,0.4)', color: '#6dffb0', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', ...chamfer(5) }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6dffb0', boxShadow: '0 0 6px #6dffb0', animation: 'pulse 2s infinite' }} />
                  Giảng viên
                </span>
              </div>
              <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 500, color: '#f5a524', margin: 0 }}>
                Mở Studio →
              </p>
            </div>
          </Link>
        </section>

        {/* ── Panel 05 · Phân tích dữ liệu ── */}
        <HudPanel style={{ marginBottom: 24, padding: 0 }}>
          {/* Header */}
          <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(126,231,255,0.1)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', color: '#7ee7ff', margin: 0 }}>// 05</p>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 19, fontWeight: 600, color: '#eaf6ff', margin: 0 }}>Phân tích dữ liệu</h2>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['overview', 'funnel', 'retention', 'cohort', 'learning-path'] as const).map((tab) => (
                  <button key={tab} type="button" onClick={() => setAnalyticsTab(tab)}
                    style={{ padding: '5px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s', border: analyticsTab === tab ? '1px solid rgba(126,231,255,0.6)' : '1px solid rgba(126,231,255,0.18)', background: analyticsTab === tab ? 'rgba(126,231,255,0.12)' : 'transparent', color: analyticsTab === tab ? '#7ee7ff' : '#5c6886', ...chamfer(6) }}>
                    {analyticsTabLabel[tab]}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button key={range} type="button"
                  onClick={() => { setAnalyticsRange(range); trackEvent('admin_range_changed', { range }) }}
                  style={{ padding: '5px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s', border: analyticsRange === range ? '1px solid rgba(245,165,36,0.7)' : '1px solid rgba(126,231,255,0.18)', background: analyticsRange === range ? 'rgba(245,165,36,0.15)' : 'transparent', color: analyticsRange === range ? '#f5a524' : '#5c6886', ...chamfer(6) }}>
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '20px 24px' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#5c6886', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <Spinner /><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>Đang tải analytics...</span>
              </div>
            ) : analyticsError ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#ff9090', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>{analyticsError}</div>
            ) : analyticsTab === 'overview' && !analytics ? (
              <div style={{ padding: 32, textAlign: 'center', border: '1px dashed rgba(126,231,255,0.15)', ...chamfer(10) }}>
                <p style={{ color: '#5c6886', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>Chưa có dữ liệu analytics</p>
                <p style={{ color: '#3a4460', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, marginTop: 6 }}>// hệ thống sẽ hiển thị biểu đồ khi có đủ dữ liệu</p>
              </div>
            ) : (
              <>
                {analyticsTab === 'overview' && analytics && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Sub-KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                      {[
                        { label: 'Người dùng mới', value: analytics.kpis.newUsers, color: '#f5a524' },
                        { label: 'Người học hoạt động', value: analytics.kpis.activeLearners, color: '#7ee7ff' },
                        { label: 'Bài học hoàn thành', value: analytics.kpis.lessonCompletions, color: '#eaf6ff' },
                        { label: 'Tỷ lệ hoàn thành', value: `${analytics.kpis.completionRate}%`, color: '#6dffb0' },
                      ].map((kpi) => (
                        <div key={kpi.label} style={{ padding: '12px 14px', border: '1px solid rgba(126,231,255,0.12)', background: 'rgba(0,0,0,0.2)', ...chamfer(10) }}>
                          <MonoLabel color="#5c6886">{kpi.label}</MonoLabel>
                          <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 29, fontWeight: 400, color: kpi.color, margin: '6px 0 0', lineHeight: 1 }}>{kpi.value}</p>
                        </div>
                      ))}
                    </div>
                    {/* Chart */}
                    <div style={{ border: '1px solid rgba(126,231,255,0.1)', background: 'rgba(0,0,0,0.2)', padding: '14px 10px 8px', ...chamfer(12) }}>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', color: '#5c6886', marginBottom: 10, paddingLeft: 8 }}>
                        // telemetry · {analyticsRange} window · {analytics.trends.users.length} samples
                      </p>
                      <div style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics.trends.users.map((row, idx) => ({
                            date: row.date.slice(5),
                            users: row.value,
                            lessons: analytics.trends.lessonCompletions[idx]?.value || 0,
                            revenue: analytics.trends.revenue[idx]?.value || 0,
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(126,231,255,0.06)" />
                            <XAxis dataKey="date" stroke="#3a4460" tick={{ fill: '#5c6886', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
                            <YAxis stroke="#3a4460" tick={{ fill: '#5c6886', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: '#06091a', border: '1px solid rgba(126,231,255,0.2)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#eaf6ff', borderRadius: 0 }} />
                            <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9aa8c4' }} />
                            <Area type="monotone" dataKey="lessons" stroke="#ff5cd4" fill="rgba(255,92,212,0.12)" name="Bài học" dot={{ fill: '#ff5cd4', r: 2 }} />
                            <Area type="monotone" dataKey="revenue" stroke="#6dffb0" fill="rgba(109,255,176,0.08)" name="Doanh thu" dot={{ fill: '#6dffb0', r: 2 }} />
                            <Area type="monotone" dataKey="users" stroke="#7ee7ff" fill="rgba(126,231,255,0.08)" name="Người dùng" dot={{ fill: '#7ee7ff', r: 2 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    {/* Info cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                      <div style={{ border: '1px solid rgba(126,231,255,0.12)', background: 'rgba(0,0,0,0.2)', padding: '14px 16px', ...chamfer(10) }}>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.15em', color: '#5c6886', textTransform: 'uppercase', marginBottom: 12 }}>
                          — top khóa học theo lượt ghi danh
                        </p>
                        {analytics.topCourses.length === 0 ? (
                          <p style={{ color: '#3a4460', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>Không có dữ liệu</p>
                        ) : (
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {analytics.topCourses.map((c) => (
                              <li key={c.courseId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 15, color: '#eaf6ff' }}>{c.title}</span>
                                <span style={{ padding: '2px 8px', background: 'rgba(245,165,36,0.15)', border: '1px solid rgba(245,165,36,0.4)', color: '#f5a524', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, ...chamfer(5) }}>{c.enrollments}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div style={{ border: '1px solid rgba(126,231,255,0.12)', background: 'rgba(0,0,0,0.2)', padding: '14px 16px', ...chamfer(10) }}>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.15em', color: '#5c6886', textTransform: 'uppercase', marginBottom: 12 }}>
                          — chỉ số vận hành
                        </p>
                        {[
                          { label: 'Đơn hoàn tất', value: analytics.kpis.completedOrders, color: '#6dffb0' },
                          { label: 'Doanh thu', value: `${analytics.kpis.revenue.toLocaleString('en-US')} VND`, color: '#6dffb0' },
                          { label: 'Bài viết cộng đồng', value: analytics.kpis.communityPosts, color: '#7ee7ff' },
                          { label: 'Tổng người dùng', value: analytics.kpis.totalUsers, color: '#7ee7ff' },
                        ].map((r) => (
                          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <MonoLabel color="#9aa8c4">{r.label}</MonoLabel>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: r.color }}>{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {analyticsTab === 'funnel' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsFunnel}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(126,231,255,0.06)" />
                          <XAxis dataKey="label" stroke="#3a4460" tick={{ fill: '#5c6886', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
                          <YAxis stroke="#3a4460" tick={{ fill: '#5c6886', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: '#06091a', border: '1px solid rgba(126,231,255,0.2)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#eaf6ff', borderRadius: 0 }} />
                          <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9aa8c4' }} />
                          <Bar dataKey="value" fill="#7ee7ff" name="Số lượng" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                      {analyticsFunnel.map((item) => (
                        <div key={item.step} style={{ border: '1px solid rgba(126,231,255,0.12)', background: 'rgba(0,0,0,0.2)', padding: '12px 14px', ...chamfer(10) }}>
                          <p style={{ fontSize: 14, color: '#eaf6ff', marginBottom: 4 }}>{item.label}</p>
                          <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 25, color: '#7ee7ff', margin: '0 0 4px' }}>{item.value}</p>
                          <MonoLabel color="#5c6886">Từ đầu: {item.conversionFromStart}% · Từ trước: {item.conversionFromPrev}%</MonoLabel>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analyticsTab === 'retention' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                    {[
                      { label: 'Kích thước cohort', value: analyticsRetention?.cohortSize ?? 0, color: '#eaf6ff' },
                      { label: 'Giữ chân D1', value: `${analyticsRetention?.d1 ?? 0}%`, color: '#7ee7ff' },
                      { label: 'Giữ chân D7', value: `${analyticsRetention?.d7 ?? 0}%`, color: '#7ee7ff' },
                      { label: 'Giữ chân D30', value: `${analyticsRetention?.d30 ?? 0}%`, color: '#7ee7ff' },
                    ].map((kpi) => (
                      <div key={kpi.label} style={{ padding: '12px 14px', border: '1px solid rgba(126,231,255,0.12)', background: 'rgba(0,0,0,0.2)', ...chamfer(10) }}>
                        <MonoLabel color="#5c6886">{kpi.label}</MonoLabel>
                        <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 29, color: kpi.color, margin: '6px 0 0', lineHeight: 1 }}>{kpi.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {analyticsTab === 'cohort' && (
                  <div style={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsCohort.map((row) => ({ date: row.date.slice(5), users: row.users, enrollments: row.enrollments, paidOrders: row.paidOrders }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(126,231,255,0.06)" />
                        <XAxis dataKey="date" stroke="#3a4460" tick={{ fill: '#5c6886', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
                        <YAxis stroke="#3a4460" tick={{ fill: '#5c6886', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#06091a', border: '1px solid rgba(126,231,255,0.2)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#eaf6ff', borderRadius: 0 }} />
                        <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9aa8c4' }} />
                        <Bar dataKey="users" fill="#7ee7ff" />
                        <Bar dataKey="enrollments" fill="#ff5cd4" />
                        <Bar dataKey="paidOrders" fill="#6dffb0" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {analyticsTab === 'learning-path' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <select value={learningPathFilter.moduleId} onChange={(e) => setLearningPathFilter((prev) => ({ ...prev, moduleId: e.target.value }))} style={selectStyle}>
                        <option value="">Tất cả module</option>
                        {(learningPathAnalytics?.filterOptions.modules ?? []).map((m) => (
                          <option key={m.moduleId} value={m.moduleId}>{(m.moduleOrder ? `M${m.moduleOrder}. ` : '') + m.moduleTitle}</option>
                        ))}
                      </select>
                      <select value={learningPathFilter.depth} onChange={(e) => setLearningPathFilter((prev) => ({ ...prev, depth: e.target.value as '' | 'beginner' | 'explorer' | 'researcher' }))} style={selectStyle}>
                        <option value="">Tất cả độ sâu</option>
                        {(learningPathAnalytics?.filterOptions.depths ?? []).map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                      {[
                        { label: 'Sự kiện', value: learningPathAnalytics?.summary.totalEvents ?? 0, color: '#eaf6ff' },
                        { label: 'Phiên học', value: learningPathAnalytics?.summary.uniqueSessions ?? 0, color: '#7ee7ff' },
                        { label: 'Hoàn thành bài', value: learningPathAnalytics?.summary.lessonCompletions ?? 0, color: '#6dffb0' },
                      ].map((kpi) => (
                        <div key={kpi.label} style={{ padding: '12px 14px', border: '1px solid rgba(126,231,255,0.12)', background: 'rgba(0,0,0,0.2)', ...chamfer(10) }}>
                          <MonoLabel color="#5c6886">{kpi.label}</MonoLabel>
                          <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 29, color: kpi.color, margin: '6px 0 0', lineHeight: 1 }}>{kpi.value}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ border: '1px solid rgba(126,231,255,0.12)', background: 'rgba(0,0,0,0.2)', padding: '14px 16px', ...chamfer(10) }}>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#eaf6ff', marginBottom: 12 }}>Phễu hành vi lộ trình học</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(learningPathAnalytics?.funnel ?? []).map((row) => {
                          const maxValue = Math.max(1, ...(learningPathAnalytics?.funnel ?? []).map((item) => item.value))
                          const width = `${Math.max(6, (row.value / maxValue) * 100)}%`
                          return (
                            <div key={row.step}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 13, color: '#9aa8c4' }}>{row.label}</span>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#7ee7ff' }}>{row.value}</span>
                              </div>
                              <div style={{ height: 4, background: 'rgba(126,231,255,0.06)', border: '1px solid rgba(126,231,255,0.1)', ...chamfer(2) }}>
                                <div style={{ height: '100%', width, background: 'linear-gradient(90deg,#7ee7ff,#4dd2ff)', boxShadow: '0 0 6px rgba(126,231,255,0.5)', ...chamfer(2) }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                      <div style={{ border: '1px solid rgba(126,231,255,0.12)', background: 'rgba(0,0,0,0.2)', padding: '14px 16px', ...chamfer(10) }}>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#eaf6ff', marginBottom: 10 }}>Phân phối chuyển depth</p>
                        {(learningPathAnalytics?.depthDistribution ?? []).map((row) => (
                          <div key={row.depth} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, color: '#9aa8c4' }}>{row.depth === 'beginner' ? 'Cơ bản' : row.depth === 'explorer' ? 'Cơ chế' : 'Chuyên sâu'}</span>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#7ee7ff' }}>{row.switches}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ border: '1px solid rgba(126,231,255,0.12)', background: 'rgba(0,0,0,0.2)', padding: '14px 16px', ...chamfer(10) }}>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#eaf6ff', marginBottom: 10 }}>Top module theo lượt mở bài</p>
                        {(learningPathAnalytics?.moduleEngagement ?? []).slice(0, 6).map((row) => (
                          <div key={row.moduleId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, color: '#9aa8c4' }}>{row.moduleTitle}</span>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7ee7ff' }}>{row.opens} mở · {row.avgDwellSec}s</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </HudPanel>

        {/* ── Panel 06 · Đơn xin quyền giảng viên ── */}
        <HudPanel style={{ marginBottom: 24, padding: 0 }}>
          <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(126,231,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', color: '#7ee7ff', margin: 0 }}>// 06</p>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 19, fontWeight: 600, color: '#eaf6ff', margin: 0 }}>Đơn xin quyền giảng viên</h2>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6dffb0', boxShadow: '0 0 6px #6dffb0' }} />
                <MonoLabel color="#6dffb0">Realtime</MonoLabel>
              </span>
            </div>
            <select value={teacherAppFilter} onChange={(e) => setTeacherAppFilter(e.target.value as typeof teacherAppFilter)} style={selectStyle}>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Đã từ chối</option>
              <option value="all">Tất cả</option>
            </select>
          </div>
          <div style={{ padding: '16px 24px' }}>
            {teacherAppLoading ? (
              <div style={{ padding: 32, textAlign: 'center', display: 'flex', justifyContent: 'center' }}><Spinner /></div>
            ) : teacherApps.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', border: '1px dashed rgba(126,231,255,0.15)', ...chamfer(10) }}>
                <p style={{ color: '#5c6886', fontFamily: 'Space Grotesk, sans-serif', fontSize: 15 }}>Không có đơn</p>
                <p style={{ color: '#3a4460', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.15em', marginTop: 6 }}>// thay đổi bộ lọc hoặc quay lại sau</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(126,231,255,0.1)' }}>
                      {['Người nộp', 'Email', 'Trạng thái', 'Giới thiệu', 'Ngày gửi', 'Thao tác'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5c6886', fontWeight: 400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teacherApps.map((app) => (
                      <tr key={app.id} style={{ borderBottom: '1px solid rgba(126,231,255,0.06)', verticalAlign: 'top' }}>
                        <td style={{ padding: '10px 12px', fontSize: 14, color: '#eaf6ff' }}>{app.user?.displayName || '—'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#9aa8c4' }}>{app.user?.email || '—'}</td>
                        <td style={{ padding: '10px 12px' }}><StatusPill status={app.status} /></td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#9aa8c4', maxWidth: 280 }}>
                          <p style={{ WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', display: '-webkit-box', overflow: 'hidden', whiteSpace: 'pre-wrap', margin: 0 }}>{app.bio}</p>
                          {app.organization && <p style={{ color: '#5c6886', marginTop: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>Đơn vị: {app.organization}</p>}
                          {app.status === 'rejected' && app.reviewNote && <p style={{ color: '#ff9090', marginTop: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>Ghi chú: {app.reviewNote}</p>}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#5c6886', whiteSpace: 'nowrap' }}>
                          {app.createdAt ? new Date(app.createdAt).toLocaleString('vi-VN') : '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {app.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button type="button" disabled={reviewingAppId === app.id} onClick={() => handleReviewTeacherApp(app, 'approve')}
                                style={{ padding: '5px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer', border: '1px solid rgba(109,255,176,0.5)', background: 'rgba(109,255,176,0.1)', color: '#6dffb0', ...chamfer(6), opacity: reviewingAppId === app.id ? 0.5 : 1 }}>
                                Duyệt
                              </button>
                              <button type="button" disabled={reviewingAppId === app.id} onClick={() => handleReviewTeacherApp(app, 'reject')}
                                style={{ padding: '5px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer', border: '1px solid rgba(255,80,80,0.4)', background: 'rgba(255,80,80,0.08)', color: '#ff9090', ...chamfer(6), opacity: reviewingAppId === app.id ? 0.5 : 1 }}>
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#3a4460', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </HudPanel>

        {/* ── Panel 07 · Người dùng ── */}
        <HudPanel style={{ marginBottom: 24, padding: 0 }}>
          <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(126,231,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', color: '#7ee7ff', margin: 0 }}>// 07</p>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 19, fontWeight: 600, color: '#eaf6ff', margin: 0 }}>{viText.admin.users}</h2>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6dffb0', boxShadow: '0 0 5px #6dffb0' }} />
                <MonoLabel color="#6dffb0">{visibleUsers.length.toString().padStart(2, '0')} records</MonoLabel>
              </span>
              {message === 'success' && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6dffb0' }}>// cập nhật thành công</span>}
              {message === 'error' && error && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#ff9090' }}>{error}</span>}
            </div>
            <select value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value as 'all' | 'active' | 'deactivated')} style={selectStyle}>
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="deactivated">Ngừng hoạt động</option>
            </select>
          </div>
          <div style={{ padding: '12px 24px 20px' }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', display: 'flex', justifyContent: 'center' }}><Spinner /></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(126,231,255,0.1)' }}>
                      {['Email', 'Tên', 'Trạng thái', 'Vai trò', 'Đổi vai trò', 'Quản lý tài khoản', 'Ngày tham gia'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5c6886', fontWeight: 400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(126,231,255,0.06)', background: 'transparent', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(126,231,255,0.03)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '10px 12px' }}>
                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#9aa8c4', margin: 0 }}>{u.email || '-'}</p>
                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3a4460', margin: '2px 0 0' }}>user · {String(i + 1).padStart(3, '0')}</p>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 14, color: '#eaf6ff' }}>{u.displayName || '-'}</td>
                        <td style={{ padding: '10px 12px' }}><StatusPill status={u.accountStatus} /></td>
                        <td style={{ padding: '10px 12px' }}><RoleTag role={u.role} /></td>
                        <td style={{ padding: '10px 12px' }}>
                          <select value={u.role} onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                            disabled={updatingId === u.id || u.id === user?.id}
                            style={{ ...selectStyle, opacity: (updatingId === u.id || u.id === user?.id) ? 0.45 : 1, cursor: (updatingId === u.id || u.id === user?.id) ? 'not-allowed' : 'pointer' }}>
                            <option value="student">student</option>
                            <option value="teacher">teacher</option>
                            <option value="moderator">moderator</option>
                            <option value="admin">admin</option>
                          </select>
                          {u.id === user?.id && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3a4460', marginLeft: 6 }}>// (bạn)</span>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button type="button"
                            onClick={() => handleStatusChange(u, u.accountStatus === 'active' ? 'deactivated' : 'active')}
                            disabled={updatingId === u.id || u.id === user?.id}
                            style={{ padding: '5px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.08em', cursor: (updatingId === u.id || u.id === user?.id) ? 'not-allowed' : 'pointer', border: u.accountStatus === 'active' ? '1px solid rgba(255,80,80,0.45)' : '1px solid rgba(109,255,176,0.45)', background: u.accountStatus === 'active' ? 'rgba(255,80,80,0.08)' : 'rgba(109,255,176,0.08)', color: u.accountStatus === 'active' ? '#ff9090' : '#6dffb0', opacity: (updatingId === u.id || u.id === user?.id) ? 0.45 : 1, ...chamfer(6) }}>
                            {u.accountStatus === 'active' ? 'Ngừng hoạt động' : 'Khôi phục'}
                          </button>
                          {u.deactivationReason && (
                            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#5c6886', maxWidth: 200, marginTop: 4, lineHeight: 1.4 }}>{u.deactivationReason}</p>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#5c6886', whiteSpace: 'nowrap' }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </HudPanel>

        {/* ── Panel 08 · Đơn hàng gần đây ── */}
        <HudPanel style={{ padding: 0 }}>
          <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(126,231,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', color: '#7ee7ff', margin: 0 }}>// 08</p>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 19, fontWeight: 600, color: '#eaf6ff', margin: 0 }}>Đơn hàng gần đây</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6dffb0', boxShadow: '0 0 5px #6dffb0' }} />
              <MonoLabel color="#6dffb0">last 24h · {String(recentOrders.length).padStart(2, '0')} entries</MonoLabel>
            </div>
          </div>
          <div style={{ padding: '12px 24px 20px' }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', display: 'flex', justifyContent: 'center' }}><Spinner /></div>
            ) : recentOrders.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', border: '1px dashed rgba(126,231,255,0.15)', ...chamfer(10) }}>
                <p style={{ color: '#5c6886', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{viText.admin.noOrders}</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(126,231,255,0.1)' }}>
                      {['Khóa học', 'Số tiền', 'Trạng thái', 'Thời gian tạo'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5c6886', fontWeight: 400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o._id} style={{ borderBottom: '1px solid rgba(126,231,255,0.06)', background: 'transparent', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(126,231,255,0.03)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#7ee7ff' }}>{o.courseSlug}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: '#f5a524' }}>
                          {o.currency === 'USD' ? `$${o.amount.toFixed(2)}` : `${o.amount.toLocaleString('en-US')} ₫`}
                        </td>
                        <td style={{ padding: '10px 12px' }}><StatusPill status={o.status} /></td>
                        <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#5c6886' }}>
                          {new Date(o.createdAt).toLocaleString('en-US')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </HudPanel>

      </div>
    </div>
  )
}

