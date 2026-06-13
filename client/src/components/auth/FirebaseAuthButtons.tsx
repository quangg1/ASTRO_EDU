'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebaseClient'
import { loginWithFirebaseIdToken, useAuthStore, verifyCookieSessionAfterAuth } from '@/features/auth/public'

function GoogleIcon({ className = 'size-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function FacebookIcon({ className = 'size-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      <path fill="#ffffff" d="M16.671 15.543l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.513V4.996s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.643H7.078v3.47h3.047v8.385a12.07 12.07 0 003.75 0v-8.385h2.796z" />
    </svg>
  )
}

type Props = {
  redirectTo?: string
  onSuccess?: () => void
  variant?: 'default' | 'onboarding'
  layout?: 'stack' | 'row'
}

const pillClass =
  'h-[52px] relative w-full flex items-center justify-center gap-2.5 text-[14px] font-medium transition-all duration-200'

const defaultPillStyle: React.CSSProperties = {
  background: 'rgba(10,16,36, 0.9)',
  border: '1px solid rgba(126,231,255,0.28)',
  clipPath:
    'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
}

const onboardingPillStyle: React.CSSProperties = {
  background: '#0f1222',
  border: '1px solid #252b42',
  borderRadius: '12px',
  color: '#eaf0ff',
}

export function FirebaseAuthButtons({
  redirectTo = '/dashboard',
  onSuccess,
  variant = 'default',
  layout = 'stack',
}: Props) {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState<'google' | 'facebook' | null>(null)
  const [err, setErr] = useState('')

  const pillStyle = variant === 'onboarding' ? onboardingPillStyle : defaultPillStyle
  const labelClass = variant === 'onboarding' ? '' : 'font-[Space_Grotesk,sans-serif] text-ds-text'
  const containerClass = layout === 'row' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'
  const isOnboarding = variant === 'onboarding'

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={containerClass} aria-busy="true">
        <div className={`${pillClass} opacity-50 pointer-events-none select-none ${labelClass}`} style={pillStyle}>
          <GoogleIcon className="size-5 shrink-0" />
          <span>Google</span>
        </div>
        <div className={`${pillClass} opacity-50 pointer-events-none select-none ${labelClass}`} style={pillStyle}>
          <FacebookIcon className="size-5 shrink-0" />
          <span>Facebook</span>
        </div>
      </div>
    )
  }

  const auth = getFirebaseAuth()
  if (!auth) {
    return (
      <div className={containerClass}>
        <div className={`${pillClass} opacity-50 cursor-not-allowed ${labelClass}`} style={pillStyle} aria-disabled>
          <GoogleIcon className="size-5 shrink-0" />
          <span>Google</span>
        </div>
        <div className={`${pillClass} opacity-50 cursor-not-allowed ${labelClass}`} style={pillStyle} aria-disabled>
          <FacebookIcon className="size-5 shrink-0" />
          <span>Facebook</span>
        </div>
        <div className="col-span-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-100/90">
          Bật đăng nhập: thêm{' '}
          <code className="rounded bg-ds-surface/70 px-1 py-0.5 text-[11px]">NEXT_PUBLIC_FIREBASE_*</code> vào{' '}
          <code className="rounded bg-ds-surface/70 px-1 py-0.5 text-[11px]">.env.local</code> và khởi động lại dev server.
        </div>
      </div>
    )
  }

  const run = async (kind: 'google' | 'facebook') => {
    setErr('')
    setLoading(kind)
    try {
      const provider = kind === 'google' ? new GoogleAuthProvider() : new FacebookAuthProvider()
      provider.addScope('email')
      const cred = await signInWithPopup(auth, provider)
      const idToken = await cred.user.getIdToken()
      const res = await loginWithFirebaseIdToken(idToken)
      if (res.success && res.user) {
        const session = await verifyCookieSessionAfterAuth(res.user)
        if (!session.ok || !session.user) {
          setErr(session.error || 'Phiên đăng nhập không lưu được. Thử lại hoặc dùng email/mật khẩu.')
          return
        }
        setUser(session.user)
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(redirectTo)
        }
        return
      }
      setErr(res.error || 'Đăng nhập thất bại')
    } catch (e: unknown) {
      const code =
        e && typeof e === 'object' && 'code' in e ? String((e as { code?: string }).code) : ''
      const msg = e instanceof Error ? e.message : 'Lỗi đăng nhập'
      if (msg.includes('auth/popup-closed')) return
      if (code === 'auth/internal-error' || msg.includes('auth/internal-error')) {
        setErr(
          'Không mở được cửa sổ đăng nhập Google/Facebook. Thử tắt chặn popup hoặc đăng nhập bằng email.',
        )
        return
      }
      setErr(msg)
    } finally {
      setLoading(null)
    }
  }

  const hoverProps = isOnboarding
    ? { whileHover: { scale: loading ? 1 : 1.01 }, whileTap: { scale: loading ? 1 : 0.98 } }
    : {
        whileHover: {
          y: loading ? 0 : -1,
          borderColor: loading ? 'rgba(126,231,255,0.28)' : 'rgba(128,231,255,0.7)',
          boxShadow: loading ? 'none' : '0 0 24px -8px rgba(128,231,255,0.7)',
        },
        whileTap: { scale: loading ? 1 : 0.98 },
      }

  return (
    <div className={containerClass}>
      {err ? (
        <div className="col-span-2 p-3 bg-red-500/20 text-red-300 text-sm border border-red-400/30 rounded-xl">
          {err}
        </div>
      ) : null}
      <motion.button
        type="button"
        disabled={!!loading}
        onClick={() => void run('google')}
        {...hoverProps}
        className={`${pillClass} disabled:opacity-50 ${labelClass}`}
        style={pillStyle}
      >
        <GoogleIcon className="size-5 shrink-0" />
        <span>{loading === 'google' ? '…' : isOnboarding ? 'Google' : 'Continue with Google'}</span>
      </motion.button>
      <motion.button
        type="button"
        disabled={!!loading}
        onClick={() => void run('facebook')}
        {...hoverProps}
        className={`${pillClass} disabled:opacity-50 ${labelClass}`}
        style={pillStyle}
      >
        <FacebookIcon className="size-5 shrink-0" />
        <span>{loading === 'facebook' ? '…' : isOnboarding ? 'Facebook' : 'Continue with Facebook'}</span>
      </motion.button>
    </div>
  )
}
