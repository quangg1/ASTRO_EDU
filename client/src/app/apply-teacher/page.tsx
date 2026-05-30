'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { ApplyTeacherForm } from '@/components/auth/ApplyTeacherForm'
import { fetchMyTeacherApplicationStatus, type TeacherApplication } from '@/features/auth/public'
import { useLiveClock } from '@/hooks/useLiveClock'

const chamfer = (cut = 14) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function Brackets({ c = '#7ee7ff', s = 12, o = 6 }: { c?: string; s?: number; o?: number }) {
  const b = (ex: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', width: s, height: s, opacity: 0.65, pointerEvents: 'none', ...ex,
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

export default function ApplyTeacherPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<TeacherApplication | null>(null)
  const [last, setLast] = useState<TeacherApplication | null>(null)
  const [message, setMessage] = useState<'ok' | 'err' | null>(null)
  const { time: localTime, zoneLabel } = useLiveClock()

  useEffect(() => {
    if (!checked) return
    if (!user) {
      router.replace('/login?redirect=/apply-teacher')
      return
    }
    if (user.role === 'teacher' || user.role === 'admin') {
      router.replace('/studio')
      return
    }
    if (user.role !== 'student') {
      router.replace('/dashboard')
      return
    }
    let cancelled = false
    setLoading(true)
    fetchMyTeacherApplicationStatus().then((res) => {
      if (cancelled) return
      setLoading(false)
      if (res.success) {
        setPending(res.pending ?? null)
        setLast(res.last ?? null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [checked, user, router])

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

  if (!checked || !user || loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#03060f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: '0.18em',
          color: '#5c6886',
          textTransform: 'uppercase',
        }}
      >
        <span style={{ color: '#7ee7ff' }}>●</span>&nbsp;&nbsp;Đang tải hệ thống…
      </div>
    )
  }

  if (user.role !== 'student') {
    return null
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#03060f',
        paddingTop: 80,
        paddingBottom: 64,
        paddingLeft: 16,
        paddingRight: 16,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <main style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* HUD header strip */}
        <div
          className="relative flex items-center justify-between px-4 py-2.5 mb-6"
          style={{
            background: 'rgba(10,16,36,0.6)',
            border: '1px solid rgba(126,231,255,0.14)',
            borderBottom: '1px solid rgba(126,231,255,0.25)',
            ...chamfer(10),
          }}
        >
          <span style={{ ...mono, fontSize: 10, letterSpacing: '0.18em', color: '#7ee7ff', textTransform: 'uppercase' }}>
            // 01 · application · teacher-access
          </span>
          <span style={{ ...mono, fontSize: 10, letterSpacing: '0.12em', color: '#5c6886' }}>
            {zoneLabel} · <span style={{ color: '#9aa8c4' }}>{localTime}</span>
          </span>
        </div>

        {/* Back link */}
        <Link
          href="/dashboard"
          style={{
            ...mono,
            fontSize: 10,
            letterSpacing: '0.16em',
            color: '#5c6886',
            textDecoration: 'none',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 24,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Bảng điều khiển
        </Link>

        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: '0.20em', color: '#5c6886', marginBottom: 10, textTransform: 'uppercase' }}>
            // 02 · request · instructor-role
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#eaf6ff', marginBottom: 10 }}>
            Xin quyền{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#f5a524' }}>giảng viên</em>
          </h1>
          <p style={{ fontSize: 14, color: '#9aa8c4', lineHeight: 1.65, maxWidth: 500 }}>
            Sau khi được duyệt, bạn có thể tạo và quản lý nội dung trong Studio. Quản trị viên xem đơn và có thể gán quyền trực tiếp trong bảng quản trị nếu cần.
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(126,231,255,0.3) 0%, rgba(126,231,255,0.03) 80%)', marginBottom: 20 }} />

        {/* Pending state */}
        {pending && (
          <div
            className="relative p-5 mb-4"
            style={{
              background: 'rgba(245,165,36,0.06)',
              border: '1px solid rgba(245,165,36,0.28)',
              ...chamfer(14),
            }}
          >
            <Brackets c="#f5a524" s={11} o={7} />
            <div style={{ ...mono, fontSize: 9.5, letterSpacing: '0.18em', color: '#f5a524', marginBottom: 8, textTransform: 'uppercase' }}>
              ● Trạng thái · Đang chờ duyệt
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#eaf6ff', marginBottom: 4 }}>
              Đơn của bạn đang trong hàng đợi
            </p>
            <p style={{ fontSize: 13, color: '#9aa8c4', lineHeight: 1.6 }}>
              Gửi lúc {new Date(pending.createdAt).toLocaleString('vi-VN')}. Sau khi được duyệt, mở lại tab hoặc tải trang — hệ thống sẽ cập nhật vai trò giảng viên tự động.
            </p>
          </div>
        )}

        {/* Rejected state */}
        {!pending && last?.status === 'rejected' && (
          <div
            className="relative p-5 mb-5"
            style={{
              background: 'rgba(255,92,212,0.05)',
              border: '1px solid rgba(255,92,212,0.22)',
              ...chamfer(14),
            }}
          >
            <Brackets c="#ff5cd4" s={11} o={7} />
            <div style={{ ...mono, fontSize: 9.5, letterSpacing: '0.18em', color: '#ff5cd4', marginBottom: 8, textTransform: 'uppercase' }}>
              ✕ Trạng thái · Đã bị từ chối
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#eaf6ff', marginBottom: 4 }}>
              Đơn trước đã bị từ chối
            </p>
            {last.reviewNote && (
              <p style={{ fontSize: 13, color: '#9aa8c4', lineHeight: 1.6, marginBottom: 8 }}>{last.reviewNote}</p>
            )}
            <p style={{ ...mono, fontSize: 10, color: '#5c6886', letterSpacing: '0.1em' }}>
              → Bạn có thể gửi đơn mới bên dưới.
            </p>
          </div>
        )}

        {!pending && (
          <div
            className="relative p-6"
            style={{
              background: 'rgba(6,9,26,0.72)',
              border: '1px solid rgba(126,231,255,0.13)',
              ...chamfer(18),
            }}
          >
            <Brackets c="#7ee7ff" s={13} o={8} />
            {message === 'ok' ? (
              <p className="text-sm text-emerald-300 mb-4 font-mono text-[11px] tracking-wide">
                Đã gửi đơn — bạn sẽ nhận email khi có kết quả.
              </p>
            ) : null}
            <ApplyTeacherForm
              defaultName={user.displayName}
              defaultEmail={user.email}
              onSubmitted={() => {
                setMessage('ok')
                void fetchMyTeacherApplicationStatus().then((res) => {
                  if (res.success && res.pending) setPending(res.pending)
                })
              }}
            />
          </div>
        )}

        {/* Footer note */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 14,
            borderTop: '1px dashed rgba(126,231,255,0.1)',
            ...mono,
            fontSize: 9.5,
            color: '#3d4f6e',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Access Level · Student</span>
          <span>Role · Pending Review</span>
        </div>
      </main>
    </div>
  )
}
