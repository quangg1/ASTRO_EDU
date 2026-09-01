'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canAccessAdmin, canAccessAdminPath } from '@/lib/roles'
import { ModerationQueuePanel } from '@/features/community/public'
import { AdminGate } from '@/components/admin/AdminShell'
import { PageHeader } from '@/components/ui/PageHeader'

export default function AdminModerationPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/admin/moderation')
    if (checked && user && !canAccessAdmin(user)) router.replace('/')
  }, [checked, user, router])

  return (
    <AdminGate checked={checked} allowed={Boolean(user && canAccessAdminPath(user, '/admin/moderation'))}>
      <PageHeader
        title="Kiểm duyệt"
        description="Hàng đợi báo cáo cộng đồng — admin có quyền tương đương moderator."
      />
      <ModerationQueuePanel />
    </AdminGate>
  )
}
