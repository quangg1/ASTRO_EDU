'use client'

import { useEffect, useState } from 'react'
import { AppHeader } from '@/components/ui/AppHeader'
import { AppShell } from '@/components/layout/AppShell'
import { useLayoutChrome } from '@/components/layout/LayoutChromeContext'
import { PromoCampaignBar } from '@/components/promotions/PromoCampaignBar'

export function AppChrome({ children }: { children: React.ReactNode }) {
  const { options } = useLayoutChrome()
  const [promoBarVisible, setPromoBarVisible] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail
      setPromoBarVisible(Boolean(detail))
    }
    window.addEventListener('promo-bar-visible', handler)
    return () => window.removeEventListener('promo-bar-visible', handler)
  }, [])

  return (
    <>
      {options.showHeader ? <AppHeader /> : null}
      {options.showHeader ? <PromoCampaignBar /> : null}
      <AppShell showMobileNav={options.showMobileNav} showStarfield={options.showStarfield}>
        <div className={options.showHeader && promoBarVisible ? 'pt-11' : undefined}>{children}</div>
      </AppShell>
    </>
  )
}
