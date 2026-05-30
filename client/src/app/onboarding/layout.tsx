import type { Metadata } from 'next'
import { LayoutChromeBoundary } from '@/components/layout/LayoutChromeBoundary'
import { APP_DISPLAY_NAME } from '@/lib/appBrand'

export const metadata: Metadata = {
  title: `Cá nhân hóa · ${APP_DISPLAY_NAME}`,
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutChromeBoundary
      options={{
        showHeader: false,
        showMobileNav: false,
        showStarfield: true,
      }}
    >
      {children}
    </LayoutChromeBoundary>
  )
}
