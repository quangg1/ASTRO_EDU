import type { ReactNode } from 'react'
import { ConsumerPageShell } from '@/components/layout/ConsumerPageShell'

export default function CourseSlugLayout({ children }: { children: ReactNode }) {
  return (
    <ConsumerPageShell padTop={false} className="surface-edu">
      {children}
    </ConsumerPageShell>
  )
}
