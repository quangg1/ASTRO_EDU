'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebaseClient'
import { loginWithFirebaseIdToken } from '@/lib/authApi'
import { useAuthStore } from '@/store/useAuthStore'

function GoogleIcon({ className = 'size-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function FacebookIcon({ className = 'size-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

type Props = { redirectTo?: string }

const pillClass =
  'h-[64px] relative rounded-[40px] w-full border border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center gap-4 text-white transition-all duration-300'

/** Hai nút Google / Facebook — giao diện như trước; bên dưới là Firebase popup + API verify token. */
export function FirebaseAuthButtons({ redirectTo = '/dashboard' }: Props) {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState<'google' | 'facebook' | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  /** Tránh gọi Firebase / đọc env khác nhau giữa SSR và lần hydrate đầu tiên (gây hydration mismatch). */
  if (!mounted) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className={`${pillClass} opacity-50 pointer-events-none select-none`}>
          <GoogleIcon className="size-6 shrink-0" />
          <span className="font-medium text-[20px]">Continue with Google</span>
        </div>
        <div className={`${pillClass} opacity-50 pointer-events-none select-none`}>
          <FacebookIcon className="size-6 shrink-0" />
          <span className="font-medium text-[20px]">Continue with Facebook</span>
        </div>
      </div>
    )
  }

  const auth = getFirebaseAuth()
  if (!auth) {
    return (
      <div className="flex flex-col gap-4">
        <div className={`${pillClass} opacity-50 cursor-not-allowed`} aria-disabled>
          <GoogleIcon className="size-6 shrink-0" />
          <span className="font-medium text-[20px]">Continue with Google</span>
        </div>
        <div className={`${pillClass} opacity-50 cursor-not-allowed`} aria-disabled>
          <FacebookIcon className="size-6 shrink-0" />
          <span className="font-medium text-[20px]">Continue with Facebook</span>
        </div>
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-100/90">
          Bật đăng nhập: thêm{' '}
          <code className="rounded bg-black/30 px-1 py-0.5 text-[11px]">NEXT_PUBLIC_FIREBASE_*</code> vào{' '}
          <code className="rounded bg-black/30 px-1 py-0.5 text-[11px]">.env.local</code> và khởi động lại dev server.
        </div>
      </div>
    )
  }

  const run = async (kind: 'google' | 'facebook') => {
    setErr('')
    setLoading(kind)
    try {
      const provider =
        kind === 'google' ? new GoogleAuthProvider() : new FacebookAuthProvider()
      provider.addScope('email')
      const cred = await signInWithPopup(auth, provider)
      const idToken = await cred.user.getIdToken()
      const res = await loginWithFirebaseIdToken(idToken)
      if (res.success && res.user) {
        setUser(res.user)
        router.push(redirectTo)
        return
      }
      setErr(res.error || 'Đăng nhập thất bại')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Lỗi đăng nhập'
      if (!msg.includes('auth/popup-closed')) setErr(msg)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {err ? (
        <div className="p-3 rounded-xl bg-red-500/20 text-red-300 text-sm border border-red-400/30">{err}</div>
      ) : null}
      <motion.button
        type="button"
        disabled={!!loading}
        onClick={() => void run('google')}
        whileHover={{ scale: loading ? 1 : 1.02, y: -2 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
        className={`${pillClass} hover:bg-white/20 disabled:opacity-50 disabled:hover:scale-100`}
      >
        <GoogleIcon className="size-6 shrink-0" />
        <span className="font-medium text-[20px]">{loading === 'google' ? '…' : 'Continue with Google'}</span>
      </motion.button>
      <motion.button
        type="button"
        disabled={!!loading}
        onClick={() => void run('facebook')}
        whileHover={{ scale: loading ? 1 : 1.02, y: -2 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
        className={`${pillClass} hover:bg-white/20 disabled:opacity-50 disabled:hover:scale-100`}
      >
        <FacebookIcon className="size-6 shrink-0" />
        <span className="font-medium text-[20px]">{loading === 'facebook' ? '…' : 'Continue with Facebook'}</span>
      </motion.button>
    </div>
  )
}
