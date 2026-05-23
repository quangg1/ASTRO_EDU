'use client'

import { createContext, useContext, useMemo, useState } from 'react'

export interface LayoutChromeOptions {
  showHeader: boolean
  showMobileNav: boolean
  showStarfield: boolean
}

const DEFAULT_OPTIONS: LayoutChromeOptions = {
  showHeader: true,
  showMobileNav: true,
  showStarfield: true,
}

type LayoutChromeContextValue = {
  options: LayoutChromeOptions
  setOptions: (next: LayoutChromeOptions) => void
}

const LayoutChromeContext = createContext<LayoutChromeContextValue | null>(null)

export function LayoutChromeProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<LayoutChromeOptions>(DEFAULT_OPTIONS)
  const value = useMemo(() => ({ options, setOptions }), [options])
  return <LayoutChromeContext.Provider value={value}>{children}</LayoutChromeContext.Provider>
}

export function useLayoutChrome() {
  const context = useContext(LayoutChromeContext)
  if (!context) {
    throw new Error('useLayoutChrome phải được dùng trong LayoutChromeProvider')
  }
  return context
}

export function getDefaultLayoutChromeOptions(): LayoutChromeOptions {
  return DEFAULT_OPTIONS
}
