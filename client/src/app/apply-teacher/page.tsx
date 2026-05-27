'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import {
  fetchMyTeacherApplicationStatus,
  submitTeacherApplication,
  type TeacherApplication,
} from '@/lib/authApi'

const BIO_MIN = 30

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
  const [bio, setBio] = useState('')
  const [organization, setOrganization] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<'ok' | 'err' | null>(null)
  const [error, setError] = useState('')
  const [utcTime, setUtcTime] = useState('')

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

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      setUtcTime(`${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setError('')
    if (bio.trim().length < BIO_MIN) {
      setMessage('err')
      setError(`Nội dung giới thiệu cần ít nhất ${BIO_MIN} ký tự.`)
      return
    }
    setSubmitting(true)
    const res = await submitTeacherApplication({ bio: bio.trim(), organization: organization.trim() })
    setSubmitting(false)
    if (res.success && res.application) {
      setMessage('ok')
      setPending(res.application)
      setBio('')
      setOrganization('')
    } else {
      setMessage('err')
      setError(res.error || 'Không gửi được đơn')
    }
  }

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
            UTC · <span style={{ color: '#9aa8c4' }}>{utcTime}</span>
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

        {/* Application form */}
        {!pending && (
          <form onSubmit={handleSubmit}>
            <div
              className="relative p-6"
              style={{
                background: 'rgba(6,9,26,0.72)',
                border: '1px solid rgba(126,231,255,0.13)',
                ...chamfer(18),
              }}
            >
              <Brackets c="#7ee7ff" s={13} o={8} />

              <div style={{ ...mono, fontSize: 9.5, letterSpacing: '0.18em', color: '#5c6886', marginBottom: 20, textTransform: 'uppercase' }}>
                // 03 · form · instructor-application
              </div>

              {/* Bio field */}
              <div style={{ marginBottom: 18 }}>
                <label
                  style={{
                    display: 'block',
                    ...mono,
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: '#9aa8c4',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Giới thiệu &amp; lý do muốn giảng dạy
                  <span style={{ color: '#ff5cd4', marginLeft: 4 }}>*</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={8}
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(126,231,255,0.15)',
                    borderRadius: 2,
                    color: '#eaf6ff',
                    padding: '12px 14px',
                    fontSize: 14,
                    lineHeight: 1.65,
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: 160,
                    fontFamily: "'Space Grotesk', sans-serif",
                    boxSizing: 'border-box',
                  }}
                  placeholder={`Tối thiểu ${BIO_MIN} ký tự: kinh nghiệm, chủ đề bạn muốn dạy, liên kết công khai (nếu có)...`}
                  onFocus={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(126,231,255,0.45)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(126,231,255,0.06)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(126,231,255,0.15)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 6,
                  }}
                >
                  <span style={{ ...mono, fontSize: 9.5, color: '#5c6886', letterSpacing: '0.1em' }}>
                    Tối thiểu {BIO_MIN} ký tự
                  </span>
                  <span
                    style={{
                      ...mono,
                      fontSize: 9.5,
                      letterSpacing: '0.1em',
                      color: bio.trim().length >= BIO_MIN ? '#6dffb0' : '#5c6886',
                    }}
                  >
                    {bio.trim().length} ký tự
                  </span>
                </div>
              </div>

              {/* Organization field */}
              <div style={{ marginBottom: 22 }}>
                <label
                  style={{
                    display: 'block',
                    ...mono,
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: '#9aa8c4',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Cơ quan / trường
                  <span style={{ ...mono, fontSize: 9, color: '#3d4f6e', marginLeft: 8 }}>(tuỳ chọn)</span>
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(126,231,255,0.15)',
                    borderRadius: 2,
                    color: '#eaf6ff',
                    padding: '10px 14px',
                    fontSize: 14,
                    outline: 'none',
                    fontFamily: "'Space Grotesk', sans-serif",
                    boxSizing: 'border-box',
                  }}
                  placeholder="Ví dụ: Trường THPT…"
                  onFocus={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(126,231,255,0.45)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(126,231,255,0.06)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(126,231,255,0.15)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(126,231,255,0.08)', marginBottom: 18 }} />

              {/* Messages */}
              {message === 'ok' && (
                <div
                  style={{
                    ...mono,
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: '#6dffb0',
                    background: 'rgba(109,255,176,0.06)',
                    border: '1px solid rgba(109,255,176,0.22)',
                    padding: '10px 14px',
                    marginBottom: 14,
                    textTransform: 'uppercase',
                    ...chamfer(8),
                  }}
                >
                  ✓ Đã gửi đơn thành công. Cảm ơn bạn!
                </div>
              )}
              {message === 'err' && (
                <div
                  style={{
                    ...mono,
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: '#ff5cd4',
                    background: 'rgba(255,92,212,0.05)',
                    border: '1px solid rgba(255,92,212,0.22)',
                    padding: '10px 14px',
                    marginBottom: 14,
                    ...chamfer(8),
                  }}
                >
                  ✕ {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting || !!pending}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  background: submitting || !!pending
                    ? 'rgba(245,165,36,0.25)'
                    : 'linear-gradient(135deg, #f5a524 0%, #e8950f 100%)',
                  color: submitting || !!pending ? 'rgba(245,165,36,0.5)' : '#1a0e00',
                  border: 'none',
                  cursor: submitting || !!pending ? 'not-allowed' : 'pointer',
                  ...mono,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  boxShadow: submitting || !!pending ? 'none' : '0 0 28px rgba(245,165,36,0.35), 0 4px 20px rgba(245,165,36,0.2)',
                  transition: 'opacity 0.2s',
                  ...chamfer(12),
                }}
              >
                {submitting ? '● Đang gửi…' : 'Gửi đơn →'}
              </button>
            </div>
          </form>
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
