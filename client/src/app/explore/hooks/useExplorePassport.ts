'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchExplorePassport } from '@/features/explore/public'
import { buildExplorePassportSummary, type ExplorePassportSummary } from '@/features/explore/public'

export function useExplorePassport(userId: string | undefined) {
  const [serverPayload, setServerPayload] = useState<Awaited<ReturnType<typeof fetchExplorePassport>>>(null)
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(async () => {
    if (!userId) {
      setServerPayload(null)
      return
    }
    setLoading(true)
    try {
      const data = await fetchExplorePassport()
      setServerPayload(data)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh, tick])

  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    window.addEventListener('explore-passport-changed', bump)
    window.addEventListener('learning-path-rewards', bump)
    return () => {
      window.removeEventListener('explore-passport-changed', bump)
      window.removeEventListener('learning-path-rewards', bump)
    }
  }, [])

  const summary = useMemo(
    (): ExplorePassportSummary => buildExplorePassportSummary({ userId, server: serverPayload }),
    [userId, serverPayload, tick],
  )

  return { summary, loading, refreshPassport: refresh }
}
