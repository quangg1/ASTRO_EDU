'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { ApplyTeacherForm } from '@/features/auth/public'
import { fetchMyTeacherApplicationStatus, type TeacherApplication } from '@/features/auth/public'
import { useLiveClock } from '@/hooks/useLiveClock'
import { useT } from '@/i18n/public'

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

export default function ApplyTeacherPage() {
  const { t } = useT()
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
          background: 'var(--color-bg-base)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: '0.18em',
          color: 'var(--color-text-subtle)',
          textTransform: 'uppercase',
        }}
      >
        <span style={{ color: 'var(--color-accent)' }}>●</span>&nbsp;&nbsp;{t('applyTeacher.loadingSystem')}
      </div>
    )
  }

  if (user.role !== 'student') {
    return null
  }

  return (
    <div className="relative z-10 px-4 pb-16 pt-2 font-sans" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <main className="mx-auto max-w-[560px]">

        <div className="cosmo-dark-panel relative mb-6 flex items-center justify-between rounded-xl px-4 py-2.5">
          <span style={{ ...mono, fontSize: 10, letterSpacing: '0.18em', color: 'var(--color-accent)', textTransform: 'uppercase' }}>
            {t('applyTeacher.eyebrowAccess')}
          </span>
          <span style={{ ...mono, fontSize: 10, letterSpacing: '0.12em', color: 'var(--color-text-subtle)' }}>
            {zoneLabel} · <span style={{ color: 'var(--color-text-muted)' }}>{localTime}</span>
          </span>
        </div>

        {/* Back link */}
        <Link
          href="/dashboard"
          style={{
            ...mono,
            fontSize: 10,
            letterSpacing: '0.16em',
            color: 'var(--color-text-subtle)',
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
          {t('dashboard.overview')}
        </Link>

        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: '0.20em', color: 'var(--color-text-subtle)', marginBottom: 10, textTransform: 'uppercase' }}>
            {t('applyTeacher.eyebrowRequest')}
          </div>
          <h1
            style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.03em', color: 'var(--color-text-primary)', marginBottom: 10 }}
            dangerouslySetInnerHTML={{ __html: t('applyTeacher.titleHtml') }}
          />
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.65, maxWidth: 500 }}>
            {t('applyTeacher.lede')}
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
            <Brackets c="var(--color-brand-amber)" s={11} o={7} />
            <div style={{ ...mono, fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--color-brand-amber)', marginBottom: 8, textTransform: 'uppercase' }}>
              {t('applyTeacher.statusPending')}
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>
              {t('applyTeacher.pendingTitle')}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              {t('applyTeacher.pendingDesc', { date: new Date(pending.createdAt).toLocaleString('vi-VN') })}
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
              {t('applyTeacher.statusRejected')}
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>
              {t('applyTeacher.rejectedTitle')}
            </p>
            {last.reviewNote && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 8 }}>{last.reviewNote}</p>
            )}
            <p style={{ ...mono, fontSize: 10, color: 'var(--color-text-subtle)', letterSpacing: '0.1em' }}>
              {t('applyTeacher.rejectedResubmit')}
            </p>
          </div>
        )}

        {!pending && (
          <div
            className="relative p-6"
            style={{
              background: 'var(--color-panel-muted)',
              border: '1px solid rgba(126,231,255,0.13)',
              ...chamfer(18),
            }}
          >
            <Brackets c="var(--color-accent)" s={13} o={8} />
            {message === 'ok' ? (
              <p className="text-sm text-emerald-300 mb-4 font-mono text-[11px] tracking-wide">
                {t('applyTeacher.submitOk')}
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
          <span>{t('applyTeacher.footerAccess')}</span>
          <span>{t('applyTeacher.footerRole')}</span>
        </div>
      </main>
    </div>
  )
}
