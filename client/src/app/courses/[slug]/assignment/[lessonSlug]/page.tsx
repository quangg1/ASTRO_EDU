'use client'

import { useParams } from 'next/navigation'
import { AssignmentSubmit } from '@/features/courses/assignments/AssignmentSubmit'
import { useCohortDeliveryRedirect } from '@/features/courses/delivery/useCohortDeliveryRedirect'

export default function CatalogAssignmentPage() {
  const { slug, lessonSlug } = useParams() as { slug: string; lessonSlug: string }
  useCohortDeliveryRedirect(slug, 'assignment', lessonSlug)
  return (
    <AssignmentSubmit
      courseSlug={slug}
      lessonSlug={lessonSlug}
      backHref={`/courses/${slug}/learn`}
    />
  )
}
