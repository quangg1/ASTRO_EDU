'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { changePassword, deactivateMyAccount, updateProfile, useAuthStore } from '@/features/auth/public'
import { canModerate } from '@/lib/roles'
import {
  TeacherProfileEditor,
  LearnerProfileEditor,
  AvatarDecorationPicker,
  AvatarWithDecoration,
} from '@/features/users/public'
import { useEquippedDecoration } from '@/features/rewards/public'
import { useLiveClock } from '@/hooks/useLiveClock'

// ── Design primitives ──────────────────────────────────────────────────────────

const chamfer = (cut = 14) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function Brackets({ c = 'var(--color-accent)', s = 14, o = 8 }: { c?: string; s?: number; o?: number }) {
  const b = (ex: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', width: s, height: s, opacity: 0.85, pointerEvents: 'none', ...ex,
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

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const strength =
    password.length === 0 ? 0 :
    password.length < 6 ? 1 :
    password.length < 10 ? 2 :
    /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 4 : 3

  const colors = ['', '#ff5cd4', 'var(--color-brand-amber)', 'var(--color-accent)', '#6dffb0']
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3,
            background: i <= strength ? colors[strength] : 'rgba(255,255,255,0.08)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      {strength > 0 && (
        <span style={{ display: 'block', marginTop: 4, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: colors[strength], letterSpacing: '0.1em' }}>
          {labels[strength]}
        </span>
      )}
    </div>
  )
}

function isStudentRole(role: string | undefined) {
  return role === 'student'
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const equippedOverlay = useEquippedDecoration()

  // form state — all logic unchanged
  const [displayName, setDisplayName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState<'success' | 'error' | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<'success' | 'error' | null>(null)
  const [profileError, setProfileError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [loadingDeactivate, setLoadingDeactivate] = useState(false)
  const [deactivateError, setDeactivateError] = useState('')

  // UI-only state
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { time: localTime, zoneLabel } = useLiveClock()

  const isDirty = user
    ? displayName !== (user.displayName || '') || avatar !== (user.avatar || '')
    : false

  useEffect(() => {
    if (checked && !user) {
      router.replace('/login?redirect=/profile')
      return
    }
    if (user) {
      setDisplayName(user.displayName || '')
      setAvatar(user.avatar || '')
    }
  }, [checked, user, router])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMessage(null)
    setProfileError('')
    setLoadingProfile(true)
    const res = await updateProfile({ displayName: displayName.trim() || undefined, avatar: avatar.trim() || undefined })
    setLoadingProfile(false)
    if (res.success && res.user) {
      useAuthStore.getState().setUser(res.user)
      setProfileMessage('success')
    } else {
      setProfileMessage('error')
      setProfileError(res.error || 'Update failed')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)
    setPasswordError('')
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match')
      setPasswordMessage('error')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      setPasswordMessage('error')
      return
    }
    setLoadingPassword(true)
    const res = await changePassword(currentPassword, newPassword)
    setLoadingPassword(false)
    if (res.success) {
      setPasswordMessage('success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setPasswordMessage('error')
      setPasswordError(res.error || 'Password change failed')
    }
  }

  const handleDeactivateAccount = async () => {
    const confirmed = window.confirm('Tài khoản sẽ được đánh dấu ngừng hoạt động thay vì xóa hẳn. Bạn có chắc chắn muốn tiếp tục?')
    if (!confirmed) return
    setDeactivateError('')
    setLoadingDeactivate(true)
    const res = await deactivateMyAccount('Người dùng tự ngừng hoạt động tài khoản từ trang hồ sơ')
    setLoadingDeactivate(false)
    if (res.success) {
      useAuthStore.getState().setUser(null)
      router.replace('/login')
      return
    }
    setDeactivateError(res.error || 'Không thể ngừng hoạt động tài khoản')
  }

  // ── Loading ──
  if (!checked || !user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-accent)', fontSize: 12, letterSpacing: '0.18em' }}>
          LOADING...
        </span>
      </div>
    )
  }

  // ── Derived values ──
  const roleColorMap: Record<string, string> = {
    admin: 'var(--color-brand-amber)', teacher: 'var(--color-accent)', moderator: '#ff5cd4', student: '#6dffb0',
  }
  const accentColor = (user.role ? roleColorMap[user.role] : undefined) || 'var(--color-accent)'

  // shared style helpers
  const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' }
  const grotesk: React.CSSProperties = { fontFamily: 'Space Grotesk, sans-serif' }

  const labelStyle: React.CSSProperties = {
    ...mono, display: 'block', marginBottom: 6,
    fontSize: 10, letterSpacing: '0.15em', color: 'var(--color-text-muted)', textTransform: 'uppercase',
  }

  const inputBase: React.CSSProperties = {
    ...grotesk, width: '100%', padding: '10px 14px', boxSizing: 'border-box',
    background: 'rgba(126,231,255,0.04)', border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)', fontSize: 14, outline: 'none',
    ...chamfer(8),
  }

  const card: React.CSSProperties = {
    position: 'relative',
    background: 'linear-gradient(168deg, var(--color-bg-elevated) 0%, var(--color-bg-surface) 100%)',
    border: '1px solid var(--color-border)',
    borderRadius: 16,
    padding: '28px',
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
  }

  const sectionNum = (n: string, col = 'rgba(126,231,255,0.3)'): React.CSSProperties => ({
    ...mono, fontSize: 28, fontWeight: 300, fontStyle: 'italic',
    color: col, lineHeight: 1, marginRight: 10,
  })

  return (
    <div className="relative z-10 mx-auto max-w-[1080px] px-4 sm:px-7 pb-16 pt-2">
        <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.18em] text-ds-subtle">
          Hồ sơ · {(user.provider || 'local').toUpperCase()} · {zoneLabel} {localTime}
        </p>

        {/* ── User banner ── */}
        <div style={{
          ...card,
          padding: '32px 40px', marginBottom: 20,
          background: 'linear-gradient(135deg, var(--color-bg-elevated) 0%, var(--color-panel-glass) 55%, rgba(28,14,4,0.65) 100%)',
          border: '1px solid var(--color-border)',
          ...chamfer(22),
        }}>
          <Brackets s={16} o={12} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <AvatarWithDecoration
              avatarUrl={avatar || user.avatar}
              displayName={user.displayName || user.email || 'User'}
              email={user.email}
              overlayUrl={equippedOverlay}
              size="lg"
            />

            <div>
              {/* eyebrow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, ...mono, fontSize: 10, letterSpacing: '0.2em', color: 'var(--color-accent)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block', boxShadow: '0 0 6px var(--color-accent)' }} />
                // USER MANIFEST · LIVE
              </div>

              {/* Name */}
              <div style={{ fontSize: 40, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.1, letterSpacing: '-0.025em', ...grotesk }}>
                {user.displayName || 'User'}<span style={{ color: accentColor }}>.</span>
              </div>

              {/* Meta row */}
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '6px 18px', alignItems: 'center', ...mono, fontSize: 11, letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}>
                <span>ROLE <span style={{ color: accentColor }}>{(user.role || 'student').toUpperCase()}</span></span>
                <span style={{ opacity: 0.3 }}>·</span>
                <span>EMAIL <span style={{ color: 'var(--color-text-primary)' }}>{user.email || '—'}</span></span>
                <span style={{ opacity: 0.3 }}>·</span>
                <span style={{ color: '#6dffb0', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6dffb0', display: 'inline-block' }} />
                  ONLINE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Role tabs ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* My Learning — always shown, active style */}
          <Link href="/my-courses" style={{
            ...mono, padding: '10px 20px', textDecoration: 'none',
            background: 'rgba(126,231,255,0.1)', border: '1px solid rgba(126,231,255,0.45)',
            color: 'var(--color-accent)', fontSize: 11, letterSpacing: '0.12em',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: 'inset 0 0 8px var(--color-accent-soft)',
            ...chamfer(8),
          }}>
            MY LEARNING
          </Link>

          <Link href="/my-orders" style={{
            ...mono, padding: '10px 20px', textDecoration: 'none',
            background: 'rgba(245,165,36,0.08)', border: '1px solid rgba(245,165,36,0.35)',
            color: 'var(--color-brand-amber)', fontSize: 11, letterSpacing: '0.12em',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            ...chamfer(8),
          }}>
            THANH TOÁN
          </Link>

          {(user.role === 'teacher' || user.role === 'admin') && (
            <Link href="/studio" style={{
              ...mono, padding: '10px 20px', textDecoration: 'none',
              background: 'rgba(126,231,255,0.03)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)', fontSize: 11, letterSpacing: '0.12em',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              ...chamfer(8),
            }}>
              STUDIO
            </Link>
          )}

          {canModerate(user) && (
            <Link href="/dashboard/moderate" style={{
              ...mono, padding: '10px 20px', textDecoration: 'none',
              background: 'rgba(126,231,255,0.03)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)', fontSize: 11, letterSpacing: '0.12em',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              ...chamfer(8),
            }}>
              KIỂM DUYỆT
            </Link>
          )}

          {user.role === 'admin' && (
            <Link href="/admin" style={{
              ...mono, padding: '10px 20px', textDecoration: 'none',
              background: 'rgba(126,231,255,0.03)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)', fontSize: 11, letterSpacing: '0.12em',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              ...chamfer(8),
            }}>
              ADMIN
            </Link>
          )}

          {isStudentRole(user.role) && (
            <Link href="/apply-teacher" style={{
              ...mono, padding: '10px 20px', textDecoration: 'none',
              background: 'rgba(126,231,255,0.03)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)', fontSize: 11, letterSpacing: '0.12em',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              ...chamfer(8),
            }}>
              XIN QUYỀN GIẢNG VIÊN
            </Link>
          )}
        </div>

        {/* ── Learning profile (public) ── */}
        <div style={{ marginBottom: 20 }}>
          <LearnerProfileEditor />
        </div>

        {/* ── Avatar decorations ── */}
        <div style={{ ...card, marginBottom: 20 }}>
          <Brackets s={12} o={9} />
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <span style={sectionNum('D', 'rgba(167,139,250,0.45)')}>D</span>
            <div>
              <h2 style={{ ...grotesk, margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Trang trí avatar
              </h2>
              <p style={{ ...grotesk, margin: '6px 0 0', fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Chỉ hiển thị trang trí đã mua — chọn và đeo tại đây. Mua thêm tại{' '}
                <Link href="/gem-shop" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                  Cửa hàng Gem
                </Link>
                .
              </p>
            </div>
          </div>
          <AvatarDecorationPicker
            avatarUrl={avatar || user.avatar || ''}
            displayName={user.displayName || 'User'}
            email={user.email}
          />
        </div>

        {/* ── 2-column: Details + Security ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* ── 01 Details ── */}
          <div style={{ ...card }}>
            <Brackets s={12} o={9} />

            {/* Section header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={sectionNum('01')}>01</span>
                <h2 style={{ ...grotesk, margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>Details</h2>
              </div>
              <span style={{ ...mono, fontSize: 10, letterSpacing: '0.15em', color: 'var(--color-accent)' }}>EDITABLE</span>
            </div>
            <div style={{ height: 1, background: 'rgba(126,231,255,0.1)', marginBottom: 20 }} />

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Display name */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Display Name</label>
                  <span style={{ ...mono, fontSize: 9, letterSpacing: '0.12em', color: 'var(--color-text-subtle)' }}>REQUIRED</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={{ ...inputBase, paddingRight: 40 }}
                    placeholder="Your name"
                  />
                  <svg style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.35, pointerEvents: 'none' }}
                    width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </div>

              {/* Avatar URL */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Avatar (URL)</label>
                  <span style={{ ...mono, fontSize: 9, letterSpacing: '0.12em', color: 'var(--color-text-subtle)' }}>OPTIONAL</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    style={{ ...inputBase, paddingRight: 40 }}
                    placeholder="https://..."
                  />
                  <svg style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.35, pointerEvents: 'none' }}
                    width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
              </div>

              {/* Email read-only */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Email</label>
                  <span style={{ ...mono, fontSize: 9, letterSpacing: '0.12em', color: 'var(--color-text-subtle)' }}>
                    READ-ONLY · {(user.provider || 'LOCAL').toUpperCase()}
                  </span>
                </div>
                <div style={{
                  ...inputBase,
                  background: 'rgba(126,231,255,0.02)', border: '1px solid rgba(126,231,255,0.08)',
                  color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ ...mono, fontSize: 11 }}>
                    <span style={{ color: 'var(--color-text-subtle)', marginRight: 8 }}>ADDR</span>
                    {user.email || '—'}
                  </span>
                  <span style={{
                    ...mono, fontSize: 9, letterSpacing: '0.12em', color: '#6dffb0',
                    border: '1px solid rgba(109,255,176,0.3)', padding: '2px 7px',
                    ...chamfer(4),
                  }}>
                    VERIFIED
                  </span>
                </div>
              </div>

              {/* Error */}
              {profileMessage === 'error' && (
                <p style={{ ...mono, fontSize: 11, color: '#ff5cd4', letterSpacing: '0.05em', margin: 0 }}>{profileError}</p>
              )}

              {/* Footer */}
              <div style={{ height: 1, background: 'rgba(126,231,255,0.08)', margin: '4px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                {/* Save status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono, fontSize: 10, letterSpacing: '0.1em', color: 'var(--color-text-subtle)' }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
                    background: isDirty ? 'var(--color-brand-amber)' : profileMessage === 'success' ? '#6dffb0' : 'var(--color-text-subtle)',
                    boxShadow: isDirty ? '0 0 6px var(--color-brand-amber)' : profileMessage === 'success' ? '0 0 6px #6dffb0' : 'none',
                  }} />
                  {isDirty ? 'UNSAVED' : profileMessage === 'success' ? 'SAVED' : 'NO CHANGES'}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {/* Reset */}
                  <button
                    type="button"
                    onClick={() => { setDisplayName(user.displayName || ''); setAvatar(user.avatar || ''); setProfileMessage(null) }}
                    style={{
                      ...mono, padding: '9px 16px', background: 'transparent',
                      border: '1px solid var(--color-border)', color: 'var(--color-text-muted)',
                      cursor: 'pointer', fontSize: 11, letterSpacing: '0.1em',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      ...chamfer(6),
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.5" />
                    </svg>
                    RESET
                  </button>

                  {/* Save */}
                  <button
                    type="submit"
                    disabled={loadingProfile}
                    style={{
                      ...mono, padding: '9px 18px', background: 'var(--color-brand-amber)',
                      border: 'none', color: '#1a0e00', cursor: loadingProfile ? 'not-allowed' : 'pointer',
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      opacity: loadingProfile ? 0.6 : 1,
                      boxShadow: '0 0 14px rgba(245,165,36,0.35)',
                      ...chamfer(6),
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                    </svg>
                    {loadingProfile ? 'SAVING...' : 'SAVE CHANGES'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* ── 02 Security ── */}
          {user.provider === 'local' ? (
            <div style={{ ...card }}>
              <Brackets s={12} o={9} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={sectionNum('02')}>02</span>
                  <h2 style={{ ...grotesk, margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>Change password</h2>
                </div>
                <span style={{ ...mono, fontSize: 10, letterSpacing: '0.15em', color: 'var(--color-text-subtle)' }}>AES · 256</span>
              </div>
              <div style={{ height: 1, background: 'rgba(126,231,255,0.1)', marginBottom: 20 }} />

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Current password */}
                <div>
                  <label style={labelStyle}>Current Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      style={{ ...inputBase, paddingRight: 40 }}
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowCurrent(v => !v)} style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', padding: 0, display: 'flex',
                    }}>
                      <EyeIcon open={showCurrent} />
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>New Password</label>
                    <span style={{ ...mono, fontSize: 9, letterSpacing: '0.12em', color: 'var(--color-text-subtle)' }}>MIN · 8 CHARS</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ ...inputBase, paddingRight: 40 }}
                      placeholder="••••••••"
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowNew(v => !v)} style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', padding: 0, display: 'flex',
                    }}>
                      <EyeIcon open={showNew} />
                    </button>
                  </div>
                  <PasswordStrength password={newPassword} />
                </div>

                {/* Confirm password */}
                <div>
                  <label style={labelStyle}>Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        ...inputBase, paddingRight: 40,
                        borderColor: confirmPassword && confirmPassword !== newPassword
                          ? 'rgba(255,92,212,0.5)' : 'var(--color-accent-soft)',
                      }}
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', padding: 0, display: 'flex',
                    }}>
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                {passwordMessage === 'success' && (
                  <p style={{ ...mono, fontSize: 11, color: '#6dffb0', letterSpacing: '0.05em', margin: 0 }}>Password changed successfully.</p>
                )}
                {passwordMessage === 'error' && (
                  <p style={{ ...mono, fontSize: 11, color: '#ff5cd4', letterSpacing: '0.05em', margin: 0 }}>{passwordError}</p>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Link href="/forgot-password" style={{ ...mono, fontSize: 10, letterSpacing: '0.1em', color: 'var(--color-accent)', textDecoration: 'none', opacity: 0.65 }}>
                    FORGOT PASSWORD?
                  </Link>
                  <button
                    type="submit"
                    disabled={loadingPassword}
                    style={{
                      ...mono, padding: '10px 20px', background: 'transparent',
                      border: '1px solid rgba(126,231,255,0.3)', color: 'var(--color-accent)',
                      cursor: loadingPassword ? 'not-allowed' : 'pointer',
                      fontSize: 11, letterSpacing: '0.1em',
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      opacity: loadingPassword ? 0.6 : 1,
                      ...chamfer(6),
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    {loadingPassword ? 'PROCESSING...' : 'CHANGE PASSWORD'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* OAuth users: no password panel */
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(126,231,255,0.06)' }}>
              <p style={{ ...mono, fontSize: 11, color: 'var(--color-text-subtle)', letterSpacing: '0.1em', textAlign: 'center', lineHeight: 2 }}>
                PASSWORD MANAGEMENT<br />NOT AVAILABLE<br />
                <span style={{ color: 'var(--color-text-muted)' }}>Signed in via {(user.provider || '').toUpperCase()}</span>
              </p>
            </div>
          )}
        </div>

        {user.role === 'teacher' ? (
          <div style={{ ...card, marginBottom: 16 }}>
            <Brackets s={12} o={9} />
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <span style={sectionNum('T')}>T</span>
              <h2 style={{ ...grotesk, margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Hồ sơ giáo viên
              </h2>
            </div>
            <p style={{ ...mono, fontSize: 10, color: 'var(--color-text-subtle)', letterSpacing: '0.1em', marginBottom: 12 }}>
              Hiển thị công khai trên trang khóa học — sinh viên dùng để xác minh giảng viên.
            </p>
            <TeacherProfileEditor />
          </div>
        ) : null}

        {/* ── 03 Danger zone ── */}
        <div style={{
          ...card,
          border: '1px solid rgba(255,92,212,0.2)',
          ...chamfer(14),
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={sectionNum('03', 'rgba(255,92,212,0.4)')}>03</span>
              <h2 style={{ ...grotesk, margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>Ngừng hoạt động tài khoản</h2>
            </div>
            <span style={{ ...mono, fontSize: 10, letterSpacing: '0.15em', color: '#ff5cd4' }}>REVERSIBLE</span>
          </div>

          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Warning box */}
            <div style={{
              flex: 1, minWidth: 240,
              background: 'rgba(255,92,212,0.05)', border: '1px solid rgba(255,92,212,0.2)',
              padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start',
              ...chamfer(8),
            }}>
              <svg style={{ flexShrink: 0, marginTop: 2 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5cd4" strokeWidth="1.6">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p style={{ ...grotesk, margin: '0 0 4px', fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>
                  Tài khoản sẽ không bị xóa vĩnh viễn.
                </p>
                <p style={{ ...grotesk, margin: 0, fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.55 }}>
                  Hệ thống chỉ đánh dấu ngừng hoạt động để có thể khôi phục hoặc kiểm tra khi cần. Mọi dữ liệu khóa học, tiến độ và bình luận được giữ nguyên.
                </p>
              </div>
            </div>

            {/* Action */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {deactivateError && (
                <p style={{ ...mono, fontSize: 11, color: '#ff5cd4', letterSpacing: '0.05em', margin: 0 }}>{deactivateError}</p>
              )}
              <button
                type="button"
                onClick={handleDeactivateAccount}
                disabled={loadingDeactivate}
                style={{
                  ...mono, padding: '12px 22px',
                  background: 'rgba(255,92,212,0.07)', border: '1px solid rgba(255,92,212,0.35)',
                  color: '#ff5cd4', cursor: loadingDeactivate ? 'not-allowed' : 'pointer',
                  fontSize: 11, letterSpacing: '0.12em',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  opacity: loadingDeactivate ? 0.6 : 1,
                  ...chamfer(8),
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
                {loadingDeactivate ? 'ĐANG XỬ LÝ...' : 'NGỪNG HOẠT ĐỘNG TÀI KHOẢN'}
              </button>
            </div>
          </div>
        </div>
    </div>
  )
}
