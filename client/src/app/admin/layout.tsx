import { LayoutChromeBoundary } from '@/components/ui/LayoutChromeBoundary'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutChromeBoundary
      options={{
        showHeader: true,
        showMobileNav: false,
        showStarfield: false,
      }}
    >
      {children}
    </LayoutChromeBoundary>
  )
}
