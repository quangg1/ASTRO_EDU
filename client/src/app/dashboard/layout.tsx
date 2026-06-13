import { Suspense } from 'react'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  )
}
