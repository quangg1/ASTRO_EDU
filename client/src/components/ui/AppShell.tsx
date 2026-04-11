'use client'

import { usePathname } from 'next/navigation'
import { MobileBottomNav } from '@/components/ui/MobileBottomNav'

function shouldShowMobileNav(pathname: string | null): boolean {
  if (!pathname) return true
  if (pathname === '/login' || pathname === '/register') return false
  /** Studio / Admin: màn soạn hoặc bảng điều khiển — không chồng bottom bar */
  if (pathname.startsWith('/studio') || pathname.startsWith('/admin')) return false
  return true
}

function shouldShowEndUserStarfield(pathname: string | null): boolean {
  if (!pathname) return true
  if (pathname.startsWith('/studio') || pathname.startsWith('/admin')) return false
  return true
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const show = shouldShowMobileNav(pathname)
  const showStarfield = shouldShowEndUserStarfield(pathname)

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
          show
            ? 'relative z-[1] min-h-screen pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0'
            : 'relative z-[1] min-h-screen'
        }
      >
        {children}
      </div>
      {show ? <MobileBottomNav /> : null}
    </>
  )
}
