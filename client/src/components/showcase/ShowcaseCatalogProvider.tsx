'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { fetchPublicShowcaseCatalogBundle } from '@/features/content3d/showcase/api/showcaseCatalogApi'
import { hydrateShowcaseCatalogBundle, NASA_SHOWCASE_ITEMS } from '@/lib/showcaseEntities'
import { SHOWCASE_CATALOG_CHANGED_EVENT } from '@/lib/showcaseCatalogRefresh'

function catalogSnapshot(): string {
  return NASA_SHOWCASE_ITEMS.map((i) => `${i.id}:${i.texturePath || ''}`).join('|')
}

const ShowcaseCatalogGenContext = createContext(0)

/**
 * Tải bundle showcase từ API, hydrate mảng runtime; refetch khi Studio lưu hoặc tab focus (chỉ bump UI nếu catalog đổi).
 */
export function ShowcaseCatalogProvider({ children }: { children: ReactNode }) {
  const [gen, setGen] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = () => {
      void (async () => {
        const before = catalogSnapshot()
        const b = await fetchPublicShowcaseCatalogBundle()
        if (cancelled) return
        if (b) hydrateShowcaseCatalogBundle(b)
        const after = catalogSnapshot()
        if (after !== before) setGen((g) => g + 1)
      })()
    }

    run()

    const schedule = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        run()
      }, 350)
    }

    window.addEventListener(SHOWCASE_CATALOG_CHANGED_EVENT, schedule)

    return () => {
      cancelled = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      window.removeEventListener(SHOWCASE_CATALOG_CHANGED_EVENT, schedule)
    }
  }, [])

  return <ShowcaseCatalogGenContext.Provider value={gen}>{children}</ShowcaseCatalogGenContext.Provider>
}

export function useShowcaseCatalogGen(): number {
  return useContext(ShowcaseCatalogGenContext)
}
