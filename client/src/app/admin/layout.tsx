import { LayoutChromeBoundary } from '@/components/layout/LayoutChromeBoundary'
import { AdminShell } from '@/features/admin/public'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutChromeBoundary
      options={{
        showHeader: true,
        showMobileNav: false,
        showStarfield: false,
      }}
    >
      <AdminShell>{children}</AdminShell>
    </LayoutChromeBoundary>
  )
}
