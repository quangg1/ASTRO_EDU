import { LayoutChromeBoundary } from '@/components/ui/LayoutChromeBoundary'

export default function LoginLayout({ children }: { children: React.ReactNode }) {
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
