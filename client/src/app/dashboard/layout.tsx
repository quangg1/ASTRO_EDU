import { DashboardShell } from '@/components/layout/DashboardShell'

export default function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
