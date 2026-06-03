'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchCoursesForEditor, createCourse, type Course } from '@/features/courses/public'
import { useAuthStore } from '@/features/auth/public'
import { formatOrderAmount } from '@/lib/money'
import { useLiveClock } from '@/hooks/useLiveClock'
import {
  cohortsNavEnabledForStrategy,
  distributionStrategyBadge,
  resolveDistributionStrategy,
} from '@/features/courses/lib/distributionStrategy'

const chamfer = (cut = 14) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function Brackets({ c = 'var(--color-accent)', s = 12, o = 6 }: { c?: string; s?: number; o?: number }) {
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

export default function StudioHomePage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [showCreateCourse, setShowCreateCourse] = useState(false)
  const [newCourseTitle, setNewCourseTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const { time: localTime, zoneLabel } = useLiveClock()

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/studio')
    if (checked && user && user.role !== 'teacher' && user.role !== 'admin') router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user) return
    fetchCoursesForEditor().then(setCourses).finally(() => setLoadingCourses(false))
  }, [user])

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

  if (!checked || !user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-bg-base)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...mono,
          fontSize: 12,
          letterSpacing: '0.18em',
          color: 'var(--color-text-subtle)',
          textTransform: 'uppercase',
        }}
      >
        <span style={{ color: 'var(--color-accent)' }}>●</span>&nbsp;&nbsp;Checking auth…
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-base)',
        paddingTop: 72,
        paddingBottom: 64,
        paddingLeft: 16,
        paddingRight: 16,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <main style={{ maxWidth: 1120, margin: '0 auto' }}>

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
          <span style={{ ...mono, fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-accent)', textTransform: 'uppercase' }}>
            // 00 · cosmolearn · studio
          </span>
          <div className="flex items-center gap-5" style={{ ...mono, fontSize: 11, letterSpacing: '0.12em', color: 'var(--color-text-subtle)' }}>
            <span>Role · <span style={{ color: '#6dffb0' }}>{user.role}</span></span>
            <span className="hidden sm:inline">
              {zoneLabel} · <span style={{ color: 'var(--color-text-muted)' }}>{localTime}</span>
            </span>
          </div>
        </div>

        {/* ── Section 01: Studio hero ── */}
        <section
          className="relative p-8 mb-5"
          style={{
            background: 'rgba(6,9,26,0.72)',
            border: '1px solid rgba(126,231,255,0.13)',
            ...chamfer(22),
          }}
        >
          <Brackets c="var(--color-accent)" s={16} o={10} />

          <div style={{ ...mono, fontSize: 11, letterSpacing: '0.20em', color: 'var(--color-text-subtle)', marginBottom: 16, textTransform: 'uppercase' }}>
            // 01 · studio · content-authoring
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 style={{ fontSize: 'clamp(27px, 4vw, 53px)', fontWeight: 500, lineHeight: 1.0, letterSpacing: '-0.03em', color: 'var(--color-text-primary)', marginBottom: 10 }}>
                Cosmo Learn{' '}
                <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--color-brand-amber)' }}>Studio</em>
              </h1>
              <p style={{ fontSize: 15, color: 'var(--color-text-muted)', lineHeight: 1.65, maxWidth: 540 }}>
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>Learning Path</span> — Lộ trình 6 module, bài học theo block.{' '}
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>Course</span> — Khóa học có curriculum &amp; thanh toán tùy chọn.
              </p>
            </div>

            {/* Stats mini */}
            <div
              className="flex-shrink-0 flex flex-col items-center justify-center text-center px-8 py-4"
              style={{
                background: 'rgba(126,231,255,0.04)',
                border: '1px solid rgba(126,231,255,0.1)',
                ...chamfer(12),
              }}
            >
              <div style={{ ...mono, fontSize: 10, letterSpacing: '0.22em', color: 'var(--color-text-subtle)', marginBottom: 6, textTransform: 'uppercase' }}>
                — Tổng khóa học
              </div>
              <div style={{ fontSize: 49, fontWeight: 400, lineHeight: 1, color: 'var(--color-brand-amber)', textShadow: '0 0 30px rgba(245,165,36,0.4)', letterSpacing: '-0.04em' }}>
                {courses.length}
              </div>
              <div style={{ ...mono, fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Courses
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(126,231,255,0.25) 0%, rgba(126,231,255,0.03) 80%)', margin: '22px 0 20px' }} />

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/studio/learning-path"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, var(--color-brand-amber) 0%, #e8950f 100%)',
                color: '#1a0e00',
                padding: '11px 20px',
                ...mono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                boxShadow: '0 0 24px rgba(245,165,36,0.35), 0 4px 16px rgba(245,165,36,0.2)',
                ...chamfer(10),
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
              </svg>
              Learning Path Studio
            </Link>

            <Link
              href="/studio/concepts"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(126,231,255,0.06)',
                color: 'var(--color-accent)',
                padding: '11px 20px',
                ...mono,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                border: '1px solid rgba(126,231,255,0.22)',
                boxShadow: '0 0 16px rgba(126,231,255,0.06)',
                ...chamfer(10),
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
              Concept Studio
            </Link>

            <Link
              href="/studio/showcase-entities"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(245,165,36,0.08)',
                color: 'var(--color-brand-amber)',
                padding: '11px 20px',
                ...mono,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                border: '1px solid rgba(245,165,36,0.28)',
                boxShadow: '0 0 16px rgba(245,165,36,0.08)',
                ...chamfer(10),
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7l9-4 9 4-9 4-9-4z" />
                <path d="M3 17l9 4 9-4" />
                <path d="M3 12l9 4 9-4" />
              </svg>
              3D Showcase Studio
            </Link>

            <Link
              href="/tutorial"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...mono,
                fontSize: 11,
                letterSpacing: '0.14em',
                color: 'var(--color-text-subtle)',
                textDecoration: 'none',
                textTransform: 'uppercase',
                alignSelf: 'center',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
            >
              Xem lộ trình (học viên) →
            </Link>
          </div>
        </section>

        {/* ── Section 02: Courses ── */}
        <section
          className="relative p-6"
          style={{
            background: 'rgba(6,9,26,0.72)',
            border: '1px solid rgba(126,231,255,0.13)',
            ...chamfer(18),
          }}
        >
          <Brackets c="var(--color-accent)" s={13} o={8} />

          {/* Section header */}
          <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
            <div>
              <div style={{ ...mono, fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-subtle)', marginBottom: 6, textTransform: 'uppercase' }}>
                // 02 · courses · curriculum &amp; payments
              </div>
              <h2 style={{ fontSize: 'clamp(19px, 2.5vw, 27px)', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
                Quản lý{' '}
                <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--color-brand-amber)' }}>khóa học</em>
              </h2>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {!showCreateCourse ? (
                <button
                  type="button"
                  onClick={() => setShowCreateCourse(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(109,255,176,0.08)',
                    color: '#6dffb0',
                    padding: '8px 16px',
                    ...mono,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    border: '1px solid rgba(109,255,176,0.22)',
                    cursor: 'pointer',
                    boxShadow: '0 0 14px rgba(109,255,176,0.06)',
                    ...chamfer(8),
                  }}
                >
                  + Create course
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="Course title"
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(126,231,255,0.2)',
                      borderRadius: 2,
                      color: 'var(--color-text-primary)',
                      padding: '8px 12px',
                      fontSize: 14,
                      outline: 'none',
                      width: 200,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(126,231,255,0.45)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(126,231,255,0.06)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(126,231,255,0.2)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newCourseTitle.trim()) return
                      setCreating(true)
                      setCreateError('')
                      const res = await createCourse(newCourseTitle.trim())
                      setCreating(false)
                      if (res.success && res.slug) {
                        setShowCreateCourse(false)
                        setNewCourseTitle('')
                        const title = newCourseTitle.trim()
                        setCourses((prev) => [
                          ...prev,
                          {
                            id: '',
                            title,
                            slug: res.slug!,
                            description: '',
                            thumbnail: null,
                            level: 'beginner',
                            published: false,
                          },
                        ])
                        router.push(`/studio/${res.slug}`)
                      } else {
                        setCreateError(res.error || 'Error')
                      }
                    }}
                    disabled={creating || !newCourseTitle.trim()}
                    style={{
                      background: creating || !newCourseTitle.trim() ? 'rgba(126,231,255,0.1)' : 'rgba(126,231,255,0.12)',
                      color: creating || !newCourseTitle.trim() ? '#3d4f6e' : 'var(--color-accent)',
                      padding: '8px 14px',
                      ...mono,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      border: '1px solid rgba(126,231,255,0.2)',
                      cursor: creating || !newCourseTitle.trim() ? 'not-allowed' : 'pointer',
                      ...chamfer(6),
                    }}
                  >
                    {creating ? '…' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCourse(false)
                      setNewCourseTitle('')
                      setCreateError('')
                    }}
                    style={{
                      background: 'transparent',
                      color: 'var(--color-text-subtle)',
                      padding: '8px 10px',
                      ...mono,
                      fontSize: 11,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              <Link
                href="/courses"
                style={{
                  ...mono,
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  color: 'var(--color-text-subtle)',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
              >
                Student view →
              </Link>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(126,231,255,0.2) 0%, rgba(126,231,255,0.02) 80%)', marginBottom: 18 }} />

          {/* Create error */}
          {createError && (
            <div
              style={{
                ...mono,
                fontSize: 11,
                letterSpacing: '0.12em',
                color: '#ff5cd4',
                background: 'rgba(255,92,212,0.05)',
                border: '1px solid rgba(255,92,212,0.2)',
                padding: '8px 14px',
                marginBottom: 14,
                ...chamfer(6),
              }}
            >
              ✕ {createError}
            </div>
          )}

          {/* Course list */}
          {loadingCourses ? (
            <div style={{ ...mono, fontSize: 12, letterSpacing: '0.16em', color: 'var(--color-text-subtle)', textTransform: 'uppercase', padding: '12px 0' }}>
              <span style={{ color: 'var(--color-accent)' }}>●</span>&nbsp;&nbsp;Loading courses…
            </div>
          ) : courses.length === 0 && !showCreateCourse ? (
            <div style={{ ...mono, fontSize: 12, letterSpacing: '0.14em', color: 'var(--color-text-subtle)', textTransform: 'uppercase', padding: '12px 0' }}>
              // No courses yet — click "Create course" to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {courses.map((c, i) => {
                const strategy = resolveDistributionStrategy(c)
                const cohortsNav = cohortsNavEnabledForStrategy(strategy)
                const strategyColors =
                  strategy === 'self_paced'
                    ? { border: 'rgba(126,231,255,0.35)', color: 'var(--color-accent)', bg: 'rgba(126,231,255,0.08)' }
                    : strategy === 'instructor_led'
                      ? { border: 'rgba(167,139,250,0.35)', color: '#c4b5fd', bg: 'rgba(139,92,246,0.1)' }
                      : { border: 'rgba(245,165,36,0.35)', color: 'var(--color-brand-amber)', bg: 'rgba(245,165,36,0.08)' }
                return (
                <div
                  key={c.id}
                  className="relative p-5"
                  style={{
                    background: 'rgba(10,16,36,0.5)',
                    border: '1px solid rgba(126,231,255,0.1)',
                    ...chamfer(12),
                  }}
                >
                  {/* Corner dot */}
                  <span
                    style={{
                      position: 'absolute', top: 10, left: 10,
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--color-accent)',
                      boxShadow: '0 0 6px var(--color-accent)',
                      opacity: 0.45,
                    }}
                  />
                  {/* Item index */}
                  <span
                    style={{
                      position: 'absolute', top: 10, right: 14,
                      ...mono, fontSize: 10, color: '#3d4f6e', letterSpacing: '0.1em',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div style={{ paddingLeft: 12 }}>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span
                          style={{
                            ...mono,
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            padding: '2px 8px',
                            borderRadius: 999,
                            border: `1px solid ${c.published ? 'rgba(109,255,176,0.35)' : 'rgba(245,165,36,0.35)'}`,
                            color: c.published ? '#6dffb0' : 'var(--color-brand-amber)',
                            background: c.published ? 'rgba(109,255,176,0.08)' : 'rgba(245,165,36,0.08)',
                          }}
                        >
                          {c.published ? 'Đã xuất bản' : 'Bản nháp'}
                        </span>
                        <span
                          style={{
                            ...mono,
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            padding: '2px 8px',
                            borderRadius: 999,
                            border: `1px solid ${strategyColors.border}`,
                            color: strategyColors.color,
                            background: strategyColors.bg,
                          }}
                        >
                          {distributionStrategyBadge(strategy)}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4, paddingRight: 20 }}>
                        {c.title}
                      </h3>
                      <div style={{ ...mono, fontSize: 10.5, color: 'var(--color-text-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {c.lessonCount ?? 0} lessons
                        <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
                        {c.level}
                        {c.isPaid && (c.price ?? 0) > 0 && (
                          <span>
                            <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
                            <span style={{ color: 'var(--color-brand-amber)' }}>
                              {formatOrderAmount(c.price ?? 0, c.currency || 'VND')}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`/studio/${c.slug}`}
                        style={{
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          background: 'rgba(126,231,255,0.08)',
                          color: 'var(--color-accent)',
                          padding: '6px 12px',
                          ...mono,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.13em',
                          textTransform: 'uppercase',
                          textDecoration: 'none',
                          border: '1px solid rgba(126,231,255,0.2)',
                          ...chamfer(6),
                        }}
                        title="Mở course studio editor"
                      >
                        Open →
                      </Link>
                      {cohortsNav ? (
                        <Link
                          href={`/studio/${c.slug}/cohorts`}
                          style={{
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: 'rgba(245,165,36,0.08)',
                            color: 'var(--color-brand-amber)',
                            padding: '6px 12px',
                            ...mono,
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: '0.13em',
                            textTransform: 'uppercase',
                            textDecoration: 'none',
                            border: '1px solid rgba(245,165,36,0.22)',
                            ...chamfer(6),
                          }}
                          title="Quản lý cohort/lớp học của khóa"
                        >
                          Cohorts
                        </Link>
                      ) : (
                        <span
                          style={{
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: 'rgba(60,70,90,0.2)',
                            color: '#4a5568',
                            padding: '6px 12px',
                            ...mono,
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: '0.13em',
                            textTransform: 'uppercase',
                            border: '1px solid rgba(60,70,90,0.35)',
                            ...chamfer(6),
                            cursor: 'not-allowed',
                          }}
                          title="Chế độ Tự học — không dùng lớp theo kỳ"
                        >
                          Cohorts
                        </span>
                      )}
                      <Link
                        href={`/courses/${c.slug}?preview=1`}
                        className="px-3 py-1.5 rounded-md text-[11px] border border-ds-border text-ds-muted hover:text-ds-accent"
                        title="Xem trang khóa (student view)"
                      >
                        Preview
                      </Link>
                    </div>
                  </div>

                  {c.description && (
                    <p
                      style={{
                        fontSize: 14,
                        color: 'var(--color-text-subtle)',
                        lineHeight: 1.55,
                        paddingLeft: 12,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {c.description}
                    </p>
                  )}
                </div>
              )})}
            </div>
          )}

          {/* Footer meta */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 12,
              borderTop: '1px dashed rgba(126,231,255,0.08)',
              ...mono,
              fontSize: 10.5,
              color: '#3d4f6e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            <span>{String(courses.length).padStart(2, '0')} Courses · Curriculum Mode</span>
            <span>● Studio Online</span>
          </div>
        </section>

      </main>
    </div>
  )
}
