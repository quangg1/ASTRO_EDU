import { LayoutChromeBoundary } from '@/components/layout/LayoutChromeBoundary'

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
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
