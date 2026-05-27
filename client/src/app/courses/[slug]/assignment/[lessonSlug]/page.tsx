'use client'

import { useParams } from 'next/navigation'
import { AssignmentSubmit } from '@/features/courses/assignments/AssignmentSubmit'

export default function CatalogAssignmentPage() {
  const { slug, lessonSlug } = useParams() as { slug: string; lessonSlug: string }
  return (
    <AssignmentSubmit
      courseSlug={slug}
      lessonSlug={lessonSlug}
      backHref={`/courses/${slug}/learn`}
    />
  )
}
