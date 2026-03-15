'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { setToken, fetchMe } from '@/lib/authApi'
import { useAuthStore } from '@/store/useAuthStore'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    const token = searchParams.get('token')
    const redirectTo = searchParams.get('redirect') || '/courses'
    if (!token) {
      router.replace('/login?error=missing_token')
      return
    }
    setToken(token)
    fetchMe()
      .then((res) => {
        if (res.success && res.user) {
          setUser(res.user)
          router.replace(redirectTo)
        } else {
          router.replace('/login?error=invalid_token')
        }
      })
      .catch(() => {
        router.replace('/login?error=invalid_token')
      })
  }, [searchParams, router, setUser])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-cyan-400">Đang đăng nhập...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-cyan-400">Đang tải...</p>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
