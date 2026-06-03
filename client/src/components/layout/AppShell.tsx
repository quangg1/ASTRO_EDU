'use client'

import { CosmoPageBackdrop } from '@/components/layout/CosmoPageBackdrop'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

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
        <>
          <CosmoPageBackdrop />
          <div aria-hidden className="enduser-starfield-overlay">
            <div className="enduser-starfield-layer enduser-starfield-layer-a" />
            <div className="enduser-starfield-layer enduser-starfield-layer-b" />
          </div>
        </>
      ) : null}
      <div
        className={
          showMobileNav
            ? 'relative z-[1] isolate relative z-10 text-ds-text w-full pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0'
            : 'relative z-[1] isolate relative z-10 text-ds-text w-full'
        }
      >
        {children}
      </div>
      {showMobileNav ? <MobileBottomNav /> : null}
    </>
  )
}
