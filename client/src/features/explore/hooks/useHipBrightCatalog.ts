'use client'

import { useEffect, useState } from 'react'
import type { CatalogStar } from '@/features/explore/data/starCatalog'
import {
  fetchHipBrightCatalog,
  getHipBrightCatalogSync,
  preloadHipBrightCatalog,
} from '@/features/explore/lib/hipBrightCatalogCache'

export type HipBrightRecord = {
  hip?: number
  raDeg: number
  decDeg: number
  mag: number
  spect?: string
  bv?: number
  name?: string
}

export function useHipBrightCatalog() {
  const [stars, setStars] = useState<CatalogStar[] | null>(() => getHipBrightCatalogSync())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    preloadHipBrightCatalog()
    fetchHipBrightCatalog().then((mapped) => {
      if (cancelled) return
      if (mapped?.length) setStars(mapped)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { stars, loading, hasFile: stars != null }
}
