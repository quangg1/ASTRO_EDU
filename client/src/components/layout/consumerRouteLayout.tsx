import type { ReactNode } from 'react'
import { ConsumerPageShell } from '@/components/layout/ConsumerPageShell'

/** Layout chuẩn cho route consumer (AppChrome + header, không DashboardShell). */
export default function ConsumerRouteLayout({ children }: { children: ReactNode }) {
  return <ConsumerPageShell padTop={false}>{children}</ConsumerPageShell>
}
