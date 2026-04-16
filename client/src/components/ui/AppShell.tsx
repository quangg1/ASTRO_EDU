'use client'

import { MobileBottomNav } from '@/components/ui/MobileBottomNav'

export function AppShell({
  children,
  showMobileNav = true,
  showStarfield = true,
}: {
  children: React.ReactNode
  showMobileNav?: boolean
  showStarfield?: boolean
}) {
  return (
    <>
      {showStarfield ? (
        <div aria-hidden className="enduser-starfield-overlay">
          <div className="enduser-starfield-layer enduser-starfield-layer-a" />
          <div className="enduser-starfield-layer enduser-starfield-layer-b" />
          <div className="enduser-starfield-nebula" />
        </div>
      ) : null}
      <div
        className={
          showMobileNav
            ? 'relative z-[1] min-h-screen pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0'
            : 'relative z-[1] min-h-screen'
        }
      >
        {children}
      </div>
      {showMobileNav ? <MobileBottomNav /> : null}
    </>
  )
}
