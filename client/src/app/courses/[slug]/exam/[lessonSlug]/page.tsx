'use client'

import { useParams } from 'next/navigation'
import { ExamRunner } from '@/features/courses/exam/ExamRunner'

export default function CatalogExamPage() {
  const { slug, lessonSlug } = useParams() as { slug: string; lessonSlug: string }
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
