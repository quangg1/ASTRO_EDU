'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail, Sparkles, User } from 'lucide-react'
import {
  register,
  resendRegistrationVerification,
  useAuthStore,
  verifyRegistrationEmail,
  verifyCookieSessionAfterAuth,
} from '@/features/auth/public'
import { FirebaseAuthButtons } from '@/components/auth/FirebaseAuthButtons'
import {
  AuthAlert,
  AuthEyebrow,
  AuthHudPanel,
  AuthOrDivider,
  AuthPrimaryButton,
  AuthSplitLayout,
  AuthTextField,
  authInputClass,
} from '@/components/auth/AuthFlowShell'
import { SiteLogo } from '@/components/ui/SiteLogo'
import { trackEvent } from '@/lib/analytics'
import { APP_DISPLAY_NAME } from '@/lib/appBrand'
import { viText } from '@/messages/vi'

export default function RegisterPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<'form' | 'verify'>('form')
  const [pendingEmail, setPendingEmail] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)

  const goOnboarding = () => router.push('/onboarding')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (password.length < 6) {
      setError(viText.auth.passwordMinLength)
      return
    }
    setLoading(true)
    try {
      const res = await register(email, password, displayName || undefined)
      if (res.success && 'needsVerification' in res && res.needsVerification) {
        setPendingEmail(res.email)
        setPhase('verify')
        setInfo(
          res.message ||
            'Chúng tôi đã gửi mã 6 số tới email của bạn. Nhập mã để hoàn tất đăng ký.',
        )
        if (res.devVerificationCode) setDevCode(res.devVerificationCode)
        return
      }
      if (res.success && 'user' in res && res.user) {
        const session = await verifyCookieSessionAfterAuth(res.user)
        if (!session.ok || !session.user) {
          setError(session.error || 'Phiên đăng nhập không lưu được sau đăng ký.')
          return
        }
        trackEvent('register_success', { provider: 'local' })
        setUser(session.user)
        goOnboarding()
        return
      }
      setError('error' in res ? res.error || viText.auth.registerFailed : viText.auth.registerFailed)
    } catch {
      setError(viText.auth.networkError)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    const code = verifyCode.trim().replace(/\s/g, '')
    if (code.length !== 6) {
      setError('Nhập đủ 6 chữ số trong email.')
      return
    }
    setLoading(true)
    try {
      const res = await verifyRegistrationEmail(pendingEmail, code)
      if (res.success && res.user) {
        const session = await verifyCookieSessionAfterAuth(res.user)
        if (!session.ok || !session.user) {
          setError(session.error || 'Xác nhận OK nhưng phiên không lưu được. Đăng nhập lại.')
          return
        }
        trackEvent('register_success', { provider: 'local', email_verified: true })
        setUser(session.user)
        goOnboarding()
        return
      }
      setError(res.error || 'Mã không hợp lệ hoặc đã hết hạn.')
    } catch {
      setError(viText.auth.networkError)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const res = await resendRegistrationVerification(pendingEmail)
      if (res.success) {
        setInfo('Đã gửi lại mã — kiểm tra email (cả thư rác).')
        if (res.devVerificationCode) setDevCode(res.devVerificationCode)
      } else {
        setError(res.error || 'Không gửi lại được mã')
      }
    } catch {
      setError(viText.auth.networkError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      topRight={
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden sm:block absolute top-6 sm:top-12 right-4 sm:right-12 z-20"
        >
          <p className="font-[JetBrains_Mono,monospace] text-[11px] uppercase tracking-[0.22em] text-ds-muted">
            Đã có tài khoản?{' '}
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-ds-accent font-medium"
              style={{
                textDecoration: 'underline',
                textDecorationColor: 'rgba(126,231,255,0.4)',
                textUnderlineOffset: '3px',
              }}
            >
              Đăng nhập
              <Sparkles className="size-3.5" />
            </Link>
          </p>
        </motion.div>
      }
      hero={
        <>
          <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.8, type: 'spring' }}>
            <SiteLogo className="text-2xl" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }} className="flex flex-col gap-6">
            <span
              className="cosmo-dark-panel rounded-xl hud-mono hud-mono-md inline-flex items-center gap-2.5 self-start px-3.5 py-2 text-[color:var(--color-accent)]"
              style={{ background: 'rgba(126,231,255,0.06)', border: '2px solid rgba(126,231,255,0.25)' }}
            >
              // NEW EXPLORER
            </span>
            <h1
              className="hud-em font-heading text-[56px] xl:text-[72px] font-medium leading-[0.95] tracking-[-0.035em] text-white"
              dangerouslySetInnerHTML={{ __html: 'Bắt đầu <em>hành trình</em>' }}
            />
            <p className="text-white/70 text-[16px] max-w-[500px] leading-[1.6]">
              Tạo tài khoản {APP_DISPLAY_NAME} — khám phá thiên văn qua mô phỏng 3D và lộ trình cá nhân hóa.
            </p>
          </motion.div>
        </>
      }
    >
      <AuthHudPanel>
        <AuthEyebrow label="// register / 01" />

        <h2
          className="font-[Space_Grotesk,sans-serif] text-white leading-[1.02]"
          style={{ fontSize: 'clamp(36px, 4vw, 56px)', letterSpacing: '-0.03em', fontWeight: 500 }}
          dangerouslySetInnerHTML={{
            __html: 'Bắt đầu <em style="font-style:italic;font-weight:300;color:var(--color-brand-amber)">hành trình</em>',
          }}
        />

        {phase === 'form' ? (
          <>
            <FirebaseAuthButtons redirectTo="/onboarding" />
            <AuthOrDivider />
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
              {info ? <AuthAlert tone="info">{info}</AuthAlert> : null}
              <AuthTextField label="Tên hiển thị" icon={User}>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Phi hành gia 007"
                  className={authInputClass}
                />
              </AuthTextField>
              <AuthTextField label="Email" icon={Mail}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email của bạn"
                  required
                  className={authInputClass}
                />
              </AuthTextField>
              <AuthTextField
                label="Mật khẩu"
                icon={Lock}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="inline-flex items-center gap-1.5 font-[JetBrains_Mono,monospace] text-[10px] uppercase tracking-[0.18em] text-white hover:text-ds-accent"
                  >
                    {showPassword ? <><EyeOff className="size-[13px]" /> Ẩn</> : <><Eye className="size-[13px]" /> Hiện</>}
                  </button>
                }
              >
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  required
                  minLength={6}
                  className={authInputClass}
                />
              </AuthTextField>
              <AuthPrimaryButton type="submit" disabled={loading}>
                {loading ? 'Đang tạo…' : viText.nav.signUp}
              </AuthPrimaryButton>
            </form>
          </>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-5">
            {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
            {info ? <AuthAlert tone="info">{info}</AuthAlert> : null}
            <p className="text-sm text-ds-muted">
              Mã xác nhận đã gửi tới <strong className="text-white">{pendingEmail}</strong>
            </p>
            <AuthTextField label="Mã xác nhận" icon={Mail}>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                className={`${authInputClass} text-center tracking-[0.35em] font-mono`}
              />
            </AuthTextField>
            {devCode ? (
              <p className="text-xs text-ds-accent font-mono border border-ds-accent/30 bg-ds-accent/10 px-3 py-2 rounded-lg">
                Dev: {devCode}
              </p>
            ) : null}
            <AuthPrimaryButton type="submit" disabled={loading || verifyCode.length !== 6}>
              {loading ? 'Đang xác nhận…' : 'Xác nhận & tiếp tục'}
            </AuthPrimaryButton>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleResend()}
              className="text-sm text-ds-accent hover:text-white disabled:opacity-50"
            >
              Gửi lại mã
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase('form')
                setVerifyCode('')
                setDevCode(null)
                setError('')
                setInfo('')
              }}
              className="text-sm text-ds-subtle hover:text-white"
            >
              ← Sửa email
            </button>
          </form>
        )}

        <div className="lg:hidden text-center">
          <p className="font-[JetBrains_Mono,monospace] text-[11px] uppercase tracking-[0.22em] text-ds-muted">
            Đã có tài khoản?{' '}
            <Link href="/login" className="text-ds-accent font-medium">
              Đăng nhập
            </Link>
          </p>
        </div>
      </AuthHudPanel>
    </AuthSplitLayout>
  )
}
