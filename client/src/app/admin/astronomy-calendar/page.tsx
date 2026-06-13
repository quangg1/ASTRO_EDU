'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canAccessAdmin, canAccessAdminPath } from '@/lib/roles'
import { AstronomyCalendarStudio } from '@/features/astronomy-calendar/admin/AstronomyCalendarStudio'
import { Spinner } from '@/components/ui/Spinner'

export default function AdminAstronomyCalendarPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const allowed = user && canAccessAdmin(user) && canAccessAdminPath(user, '/admin/astronomy-calendar')

  useEffect(() => {
    if (!checked) return
    if (!user) router.replace('/login?next=/admin/astronomy-calendar')
  }, [checked, user, router])

  if (!checked || !user) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    )
  }

  if (!allowed) {
    return <p className="text-amber-300/90">Bạn không có quyền quản trị lịch thiên văn (cần phạm vi Hệ thống).</p>
  }

  return <AstronomyCalendarStudio title="Lịch thiên văn — Admin" />
}
