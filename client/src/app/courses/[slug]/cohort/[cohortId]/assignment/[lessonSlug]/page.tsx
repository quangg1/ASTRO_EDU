'use client'

import { useParams } from 'next/navigation'
import { AssignmentSubmit } from '@/features/courses/assignments/AssignmentSubmit'

export default function CohortAssignmentPage() {
  const { slug, cohortId, lessonSlug } = useParams() as {
    slug: string
    cohortId: string
    lessonSlug: string
  }
  return (
    <AssignmentSubmit
      courseSlug={slug}
      lessonSlug={lessonSlug}
      cohortId={cohortId}
      backHref={`/courses/${slug}/cohort/${cohortId}`}
    />
  )
}
