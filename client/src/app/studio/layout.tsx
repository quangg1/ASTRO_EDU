import { LayoutChromeBoundary } from '@/components/layout/LayoutChromeBoundary'

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutChromeBoundary
      options={{
        showHeader: true,
        showMobileNav: false,
        showStarfield: false,
      }}
    >
      <div className="surface-studio">{children}</div>
    </LayoutChromeBoundary>
  )
}
