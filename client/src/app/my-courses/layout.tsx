import { DashboardShell } from '@/components/layout/DashboardShell'

export default function MyCoursesRouteLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
