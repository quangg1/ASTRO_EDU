'use client'

import { useEffect } from 'react'
import {
  getDefaultLayoutChromeOptions,
  useLayoutChrome,
} from '@/components/layout/LayoutChromeContext'

/** Landing hero is self-contained — global starfield washes out Space UI on wide viewports. */
export function LandingPageChrome() {
  const { setOptions } = useLayoutChrome()

  useEffect(() => {
    setOptions({
      showHeader: true,
      showMobileNav: true,
      showStarfield: false,
    })
    return () => setOptions(getDefaultLayoutChromeOptions())
  }, [setOptions])

  return null
}
