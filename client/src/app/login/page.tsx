'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Sparkles, Mail, Lock } from 'lucide-react'
import { login, useAuthStore, verifyCookieSessionAfterAuth } from '@/features/auth/public'
import { FirebaseAuthButtons } from '@/components/auth/FirebaseAuthButtons'
import { getStaticAssetUrl } from '@/lib/apiConfig'
import { SiteLogo } from '@/components/ui/SiteLogo'
import { sr } from '@/lib/ssrStableRandom'
import { trackEvent } from '@/lib/analytics'
import { viText } from '@/messages/vi'

function FloatingParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: sr(i * 7 + 1) * 100,
    y: sr(i * 7 + 2) * 100,
    size: sr(i * 7 + 3) * 3 + 1,
    duration: sr(i * 7 + 4) * 20 + 10,
    delay: sr(i * 7 + 5) * 5,
    driftX: sr(i * 7 + 6) * 20 - 10,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/30"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, p.driftX, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(
    errorParam === 'oauth_failed' ? 'Đăng nhập Google/Facebook thất bại.' : ''
  )
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)

  const redirectTo = searchParams.get('redirect') || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(email, password)
      if (res.success && res.user) {
        const session = await verifyCookieSessionAfterAuth(res.user)
        if (!session.ok || !session.user) {
          setError(session.error || 'Phiên đăng nhập không lưu được. Thử đăng nhập lại.')
          return
        }
        trackEvent('login_success', { provider: 'local' })
        setUser(session.user)
        router.push(redirectTo)
        return
      }
      if (res.code === 'EMAIL_NOT_VERIFIED') {
        setError(
          (res.error || 'Email chưa xác nhận.') +
            ' Mở trang đăng ký, nhập lại email và chọn «Gửi lại mã».',
        )
      } else {
        setError(res.error || viText.auth.signInFailed)
      }
    } catch {
      setError(viText.auth.networkError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex">
      {/* Left - Astronomy Image (desktop) */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      >
        <div className="absolute inset-0">
          <img
            src={getStaticAssetUrl('/images/nebula-home.jpg')}
            alt="Nebula"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <FloatingParticles />
        <div className="relative z-10 flex flex-col gap-6 p-16 justify-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: 'spring' }}
            className="flex justify-start"
          >
            <SiteLogo className="text-2xl" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="flex flex-col gap-6"
          >
            {/* Chamfered eyebrow pill with mini orbit icon */}
            <span
              className="cosmo-dark-panel rounded-xl hud-mono hud-mono-md inline-flex items-center gap-2.5 self-start px-3.5 py-2 text-[color:var(--color-accent)]"
              style={{
                background: 'rgba(126,231,255,0.06)',
                border: '2px solid rgba(126,231,255,0.25)',
              }}
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                <circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
                <circle cx="12" cy="12" r="2" fill="var(--color-brand-amber)" />
                <circle cx="17.5" cy="12" r="1.2" fill="currentColor" />
              </svg>
              // ASTRONOMY OBSERVATORY
            </span>

            <h1
              className="hud-em font-heading text-[56px] xl:text-[72px] 2xl:text-[clamp(56px,6vw,96px)] font-medium leading-[0.95] tracking-[-0.035em] text-white"
              dangerouslySetInnerHTML={{
                __html: 'Khám phá <em>vũ trụ</em>',
              }}
            />

            <p className="text-white/70 text-[16px] max-w-[500px] leading-[1.6]">
              <span className="font-semibold text-white">Cosmo Learn</span>
              <span className="text-white/50"> — </span>
              học thiên văn qua mô phỏng 3D tương tác. Tham gia cộng đồng và bắt đầu khám phá sao, hành tinh và thiên hà.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Right - Auth Form */}
      <div className="w-full lg:w-1/2 relative overflow-y-auto">
        {/* Deep-space background (HUD) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(900px 600px at 85% -10%, rgba(245,165,36,0.10), transparent 60%), radial-gradient(700px 500px at 10% 30%, rgba(126,231,255,0.06), transparent 60%), var(--color-bg-base)',
          }}
        />

        {/* Animated stars */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                top: `${sr(i + 1000) * 100}%`,
                left: `${sr(i + 2000) * 100}%`,
                width: sr(i + 3000) * 3 + 1,
                height: sr(i + 4000) * 3 + 1,
              }}
              animate={{
                opacity: [0.1, 1, 0.1],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: sr(i + 5000) * 3 + 2,
                repeat: Infinity,
                delay: sr(i + 6000) * 2,
              }}
            />
          ))}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={`shoot-${i}`}
              className="absolute h-[2px] w-[100px] bg-gradient-to-r from-transparent via-white to-transparent"
              style={{ top: `${sr(i + 7000) * 50}%`, left: '-100px' }}
              animate={{ x: ['0vw', '120vw'], y: ['0vh', '40vh'] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 7,
                ease: 'easeIn',
              }}
            />
          ))}
        </div>

        <FloatingParticles />

        {/* Top right - link to register */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden sm:block absolute top-6 sm:top-12 right-4 sm:right-12 z-20"
        >
          <p className="font-[JetBrains_Mono,monospace] text-[11px] uppercase tracking-[0.22em] text-ds-muted">
            Bạn mới ở đây?{' '}
            <Link
              href="/register"
              className="inline-flex items-center gap-1 text-ds-accent font-medium transition-all"
              style={{
                textDecoration: 'underline',
                textDecorationColor: 'rgba(126,231,255,0.4)',
                textUnderlineOffset: '3px',
              }}
            >
              Đăng ký
              <Sparkles className="size-3.5" />
            </Link>
          </p>
        </motion.div>

        {/* Mobile: show logo at top */}
        <div className="lg:hidden absolute top-6 left-4 z-20">
          <SiteLogo className="text-xl" />
        </div>

        {/* Form */}
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4 sm:p-8 lg:p-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative w-full max-w-[568px] pt-16 sm:pt-0"
          >
            {/* HUD panel wrapper */}
            <div
              className="relative flex flex-col gap-7 sm:gap-8 px-6 py-8 sm:px-10 sm:py-12"
              style={{
                background: 'var(--color-panel-muted)',
                border: '1px solid var(--color-border)',
                boxShadow: 'inset 0 0 80px rgba(126,231,255,0.04)',
                clipPath:
                  'polygon(22px 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%, 0 22px)',
              }}
            >
              {/* 4 corner brackets */}
              <span aria-hidden className="absolute top-2 left-2 w-[18px] h-[18px]" style={{ borderTop: '1px solid var(--color-accent)', borderLeft: '1px solid var(--color-accent)' }} />
              <span aria-hidden className="absolute top-2 right-2 w-[18px] h-[18px]" style={{ borderTop: '1px solid var(--color-accent)', borderRight: '1px solid var(--color-accent)' }} />
              <span aria-hidden className="absolute bottom-2 left-2 w-[18px] h-[18px]" style={{ borderBottom: '1px solid var(--color-accent)', borderLeft: '1px solid var(--color-accent)' }} />
              <span aria-hidden className="absolute bottom-2 right-2 w-[18px] h-[18px]" style={{ borderBottom: '1px solid var(--color-accent)', borderRight: '1px solid var(--color-accent)' }} />

              {/* Eyebrow */}
              <div className="inline-flex items-center gap-3">
                <span aria-hidden className="block w-8 h-px bg-ds-accent/60" />
                <span className="font-[JetBrains_Mono,monospace] text-[11px] uppercase tracking-[0.22em] text-ds-subtle">
                  // authenticate / 01
                </span>
              </div>

              {/* Heading */}
              <h2
                className="font-[Space_Grotesk,sans-serif] text-white leading-[1.02]"
                style={{
                  fontSize: 'clamp(36px, 4vw, 56px)',
                  letterSpacing: '-0.03em',
                  fontWeight: 500,
                }}
                dangerouslySetInnerHTML={{
                  __html: viText.auth.welcomeBack.replace(
                    /(trở lại|back)/i,
                    '<em style="font-style:italic;font-weight:300;color:var(--color-brand-amber)">$1</em>'
                  ),
                }}
              />

              <div className="flex flex-col gap-3">
                <FirebaseAuthButtons redirectTo={redirectTo} />
              </div>

              {/* Divider HOẶC */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-[var(--color-accent-soft)]" />
                <span className="font-[JetBrains_Mono,monospace] text-[11px] uppercase tracking-[0.28em] text-ds-subtle">
                  HOẶC
                </span>
                <div className="flex-1 h-px bg-[var(--color-accent-soft)]" />
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {error && (
                  <div
                    className="px-4 py-3 text-sm text-red-200"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.4)',
                      clipPath:
                        'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Email */}
                <div className="flex flex-col gap-2 w-full">
                  <label className="font-[JetBrains_Mono,monospace] text-[11px] uppercase tracking-[0.2em] text-white">
                    Email
                  </label>
                  <div
                    className="input-row flex items-center gap-3 px-4 h-[52px] focus-within:!border-ds-accent transition-all"
                    style={{
                      background: 'var(--color-panel-glass)',
                      border: '1px solid var(--color-border)',
                      clipPath:
                        'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                    }}
                  >
                    <Mail className="size-[15px] text-ds-subtle shrink-0" strokeWidth={1.6} aria-hidden />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Nhập email của bạn"
                      required
                      className="flex-1 bg-transparent border-0 outline-none font-[Space_Grotesk,sans-serif] text-[14px] text-ds-text placeholder:text-ds-subtle"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="font-[JetBrains_Mono,monospace] text-[11px] uppercase tracking-[0.2em] text-white">
                      Mật khẩu
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="inline-flex items-center gap-1.5 font-[JetBrains_Mono,monospace] text-[10px] uppercase tracking-[0.18em] text-white hover:text-ds-accent transition-colors"
                    >
                      {showPassword ? (
                        <><EyeOff className="size-[13px] text-white" strokeWidth={1.6} /> Ẩn</>
                      ) : (
                        <><Eye className="size-[13px] text-white" strokeWidth={1.6} /> Hiện</>
                      )}
                    </button>
                  </div>
                  <div
                    className="input-row flex items-center gap-3 px-4 h-[52px] focus-within:!border-ds-accent transition-all"
                    style={{
                      background: 'var(--color-panel-glass)',
                      border: '1px solid var(--color-border)',
                      clipPath:
                        'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                    }}
                  >
                    <Lock className="size-[15px] text-ds-subtle shrink-0" strokeWidth={1.6} aria-hidden />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      required
                      className="flex-1 bg-transparent border-0 outline-none font-[Space_Grotesk,sans-serif] text-[14px] text-ds-text placeholder:text-ds-subtle"
                    />
                  </div>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ y: loading ? 0 : -1, boxShadow: loading ? 'none' : '0 0 0 1px rgba(245,165,36,0.6), 0 16px 44px -10px rgba(245,165,36,0.7)' }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="relative inline-flex items-center justify-center gap-2 w-full px-7 py-[18px] mt-1 font-[Space_Grotesk,sans-serif] text-[15px] uppercase tracking-[0.16em] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
                  style={{
                    background: 'linear-gradient(180deg, #ffd27a, var(--color-brand-amber) 60%, #d8901c)',
                    color: '#1a0e00',
                    fontWeight: 600,
                    boxShadow: '0 0 0 1px rgba(245,165,36,0.5), 0 12px 36px -10px rgba(245,165,36,0.55)',
                    clipPath:
                      'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
                  }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="relative z-10">
                    {loading ? 'Đang đăng nhập...' : viText.auth.signIn}
                  </span>
                  <span className="relative z-10 font-[JetBrains_Mono,monospace] text-[14px]" aria-hidden>→</span>
                </motion.button>

                <div className="lg:hidden text-center">
                  <p className="font-[JetBrains_Mono,monospace] text-[11px] uppercase tracking-[0.22em] text-ds-muted">
                    Bạn mới ở đây?{' '}
                    <Link
                      href="/register"
                      className="text-ds-accent font-medium"
                      style={{ textDecoration: 'underline', textDecorationColor: 'rgba(126,231,255,0.4)', textUnderlineOffset: '3px' }}
                    >
                      Đăng ký
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="relative z-10 text-ds-text w-full flex items-center justify-center"><p className="text-ds-subtle">Loading...</p></div>}>
      <LoginPageContent />
    </Suspense>
  )
}
