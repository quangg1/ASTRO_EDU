import type { Metadata } from 'next'
import { LayoutChromeBoundary } from '@/components/layout/LayoutChromeBoundary'

export const metadata: Metadata = {
  title: 'Bản đồ thiên hà · Cosmos',
  description: 'Mô phỏng 3D phân bố thiên hà trong 200 Mpc quanh Dải Ngân Hà.',
}

export default function CosmosLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutChromeBoundary
      options={{
        showHeader: false,
        showMobileNav: false,
        showStarfield: false,
      }}
    >
      {children}
    </LayoutChromeBoundary>
  )
}
