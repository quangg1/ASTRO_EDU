'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchPublicShowcaseCatalogBundle } from '@/lib/showcaseCatalogApi'
import { hydrateShowcaseCatalogBundle } from '@/lib/showcaseEntities'

const ShowcaseCatalogGenContext = createContext(0)

/**
 * Tải bundle showcase từ API một lần, hydrate mảng runtime, tăng gen để con cháu re-merge catalog.
 */
export function ShowcaseCatalogProvider({ children }: { children: ReactNode }) {
  const [gen, setGen] = useState(0)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const b = await fetchPublicShowcaseCatalogBundle()
      if (cancelled) return
      if (b) hydrateShowcaseCatalogBundle(b)
      setGen((g) => g + 1)
    })()
    return () => {
      cancelled = true
    }
  }, [])
  return <ShowcaseCatalogGenContext.Provider value={gen}>{children}</ShowcaseCatalogGenContext.Provider>
}

export function useShowcaseCatalogGen(): number {
  return useContext(ShowcaseCatalogGenContext)
}
