'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { fetchOnboardingStatus } from '@/features/onboarding/public'

const PUBLIC_PREFIXES = ['/login', '/register', '/auth', '/onboarding']

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Chuyển học sinh chưa onboarding sang /onboarding */
export function OnboardingRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, checked, loading } = useAuthStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (isPublicPath(pathname)) {
      setReady(true)
      return
    }

    if (!checked || loading) return

    if (!user) {
      setReady(true)
      return
    }

    if (user.role && user.role !== 'student') {
      setReady(true)
      return
    }

    let cancelled = false
    setReady(false)

    void fetchOnboardingStatus().then((status) => {
      if (cancelled) return
      if (!status?.completed) {
        router.replace('/onboarding')
        return
      }
      setReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [user, checked, loading, pathname, router])

  if (!ready && user && !isPublicPath(pathname)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-ds-subtle">
        Đang tải…
      </div>
    )
  }

  return <>{children}</>
}
