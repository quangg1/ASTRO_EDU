'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { fetchCourse } from '@/features/courses/api/coursesApi'

/**
 * When the learner has an active cohort on this course, redirect catalog delivery URLs
 * to the cohort-scoped route (exam / assignment).
 */
export function useCohortDeliveryRedirect(
  courseSlug: string,
  kind: 'exam' | 'assignment',
  lessonSlug: string,
) {
  const router = useRouter()
  const { user, checked } = useAuthStore()

  useEffect(() => {
    if (!checked || !user || !courseSlug || !lessonSlug) return
    let cancelled = false
    void fetchCourse(courseSlug).then((course) => {
      if (cancelled || !course) return
      const ctx = course.deliveryContext
      if (ctx?.mode !== 'cohort' || !ctx.cohortId) return
      const base = `/courses/${courseSlug}/cohort/${ctx.cohortId}/${kind}/${encodeURIComponent(lessonSlug)}`
      router.replace(base)
    })
    return () => {
      cancelled = true
    }
  }, [checked, user, courseSlug, kind, lessonSlug, router])
}
