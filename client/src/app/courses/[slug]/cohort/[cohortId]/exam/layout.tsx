import type { ReactNode } from 'react'
import { LayoutChromeBoundary } from '@/components/layout/LayoutChromeBoundary'

export default function CohortExamLayout({ children }: { children: ReactNode }) {
  return (
    <LayoutChromeBoundary options={{ showHeader: false, showMobileNav: false, showStarfield: false }}>
      {children}
    </LayoutChromeBoundary>
  )
}
