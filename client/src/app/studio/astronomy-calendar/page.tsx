'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canAccessAdmin, canAccessAdminPath } from '@/lib/roles'
import { AstronomyCalendarStudio } from '@/features/astronomy-calendar/admin/AstronomyCalendarStudio'
import { Spinner } from '@/components/ui/Spinner'

export default function StudioAstronomyCalendarPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const allowed = user && canAccessAdmin(user) && canAccessAdminPath(user, '/admin/astronomy-calendar')

  useEffect(() => {
    if (!checked) return
    if (!user) router.replace('/login?redirect=/studio/astronomy-calendar')
    else if (!allowed) router.replace('/studio')
  }, [checked, user, allowed, router])

  if (!checked || !user || !allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen pb-16 pt-20"
      style={{ background: 'var(--color-bg-base)' }}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <AstronomyCalendarStudio title="Studio · Lịch Thiên Văn" />
      </div>
    </div>
  )
}
