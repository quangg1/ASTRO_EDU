'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/features/auth/public'
import { getToken, fetchMe, clearToken, getUserFromStoredToken } from '@/features/auth/api/authApi'
import type { AuthUser } from '@/features/auth/api/authApi'
import { shouldRunVisibleRefresh } from '@/lib/visibleRefresh'

function sameAuthUser(a: AuthUser | null, b: AuthUser | null): boolean {
  if (!a || !b) return a === b
  const scopesA = (a.adminScopes || []).join(',')
  const scopesB = (b.adminScopes || []).join(',')
  return (
    a.id === b.id &&
    a.role === b.role &&
    a.displayName === b.displayName &&
    a.email === b.email &&
    scopesA === scopesB
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, setChecked } = useAuthStore()

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      setChecked(true)
      return
    }
    const hydratedUser = getUserFromStoredToken()
    if (hydratedUser) {
      setUser(hydratedUser)
      setLoading(false)
      setChecked(true)
    } else {
      setLoading(true)
    }
    fetchMe()
      .then((res) => {
        if (res.success && res.user) setUser(res.user)
        else setUser(null)
      })
      .catch(() => {
        clearToken()
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
        setChecked(true)
      })
  }, [setUser, setLoading, setChecked])

  const meInFlightRef = useRef(false)

  useEffect(() => {
    function onVisible() {
      if (!shouldRunVisibleRefresh('auth:me', 120_000)) return
      const token = getToken()
      if (!token || meInFlightRef.current) return
      meInFlightRef.current = true
      fetchMe()
        .then((res) => {
          if (res.success && res.user) {
            const prev = useAuthStore.getState().user
            if (!sameAuthUser(prev, res.user)) setUser(res.user)
          }
        })
        .finally(() => {
          meInFlightRef.current = false
        })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [setUser])

  return <>{children}</>
}
