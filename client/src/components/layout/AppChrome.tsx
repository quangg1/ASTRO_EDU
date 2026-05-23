'use client'

import { AppHeader } from '@/components/layout/AppHeader'
import { AppShell } from '@/components/layout/AppShell'
import { useLayoutChrome } from '@/components/layout/LayoutChromeContext'

export function AppChrome({ children }: { children: React.ReactNode }) {
  const { options } = useLayoutChrome()

  return (
    <>
      {options.showHeader ? <AppHeader /> : null}
      <AppShell showMobileNav={options.showMobileNav} showStarfield={options.showStarfield}>
        {children}
      </AppShell>
    </>
  )
}
