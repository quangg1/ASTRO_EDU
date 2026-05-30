import { DashboardShell } from '@/components/layout/DashboardShell'

export default function MyOrdersLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
