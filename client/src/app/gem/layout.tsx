import { DashboardShell } from '@/components/layout/DashboardShell'

export default function GemRouteLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
