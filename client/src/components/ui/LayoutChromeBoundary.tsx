'use client'

import { useEffect } from 'react'
import {
  getDefaultLayoutChromeOptions,
  type LayoutChromeOptions,
  useLayoutChrome,
} from '@/components/ui/LayoutChromeContext'

export function LayoutChromeBoundary({
  children,
  options,
}: {
  children: React.ReactNode
  options: LayoutChromeOptions
}) {
  const { setOptions } = useLayoutChrome()

  useEffect(() => {
    setOptions(options)
    return () => setOptions(getDefaultLayoutChromeOptions())
  }, [options, setOptions])

  return <>{children}</>
}
