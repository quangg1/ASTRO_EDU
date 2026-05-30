'use client'

import { useParams } from 'next/navigation'
import { ExamRunner } from '@/features/courses/exam/ExamRunner'
import { useCohortDeliveryRedirect } from '@/features/courses/delivery/useCohortDeliveryRedirect'

export default function CatalogExamPage() {
  const { slug, lessonSlug } = useParams() as { slug: string; lessonSlug: string }
  useCohortDeliveryRedirect(slug, 'exam', lessonSlug)
  return (
    <div className="min-h-screen bg-ds-surface">
      <ExamRunner
        courseSlug={slug}
        lessonSlug={lessonSlug}
        backHref={`/courses/${slug}/learn/${lessonSlug}`}
      />
    </div>
  )
}
