'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { getToken, fetchMe, clearToken, getUserFromStoredToken } from '@/lib/authApi'

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

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      const token = getToken()
      if (!token) return
      fetchMe().then((res) => {
        if (res.success && res.user) setUser(res.user)
      })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [setUser])

  return <>{children}</>
}
