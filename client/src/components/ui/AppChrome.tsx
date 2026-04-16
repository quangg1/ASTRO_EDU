'use client'

import { AppHeader } from '@/components/ui/AppHeader'
import { AppShell } from '@/components/ui/AppShell'
import { useLayoutChrome } from '@/components/ui/LayoutChromeContext'

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
