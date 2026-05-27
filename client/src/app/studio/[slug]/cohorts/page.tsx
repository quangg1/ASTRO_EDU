'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canEnterStudio } from '@/lib/roles'
import { fetchCourseForEditor } from '@/features/courses/public'
import { CohortStudioManager } from '@/features/courses/cohort/CohortStudioManager'

export default function StudioCohortsPage() {
  const { slug } = useParams() as { slug: string }
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [title, setTitle] = useState('')
  const [lessonCount, setLessonCount] = useState(0)
  const titleLoadedRef = useRef('')

  useEffect(() => {
    if (checked && !user) router.replace(`/login?redirect=/studio/${slug}/cohorts`)
    if (checked && user && !canEnterStudio(user)) router.replace('/')
  }, [checked, user?.id, slug, router])

  useEffect(() => {
    if (!slug || !user?.id) return
    if (titleLoadedRef.current === slug) return
    titleLoadedRef.current = slug
    fetchCourseForEditor(slug).then((c) => {
      if (c?.title) setTitle(c.title)
      setLessonCount(c?.lessons?.length ?? 0)
    })
  }, [slug, user?.id])

  if (!checked) return null
  if (!user) return null

  return <CohortStudioManager courseSlug={slug} courseTitle={title || slug} lessonCount={lessonCount} />
}
