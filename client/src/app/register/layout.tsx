import { LayoutChromeBoundary } from '@/components/ui/LayoutChromeBoundary'

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
