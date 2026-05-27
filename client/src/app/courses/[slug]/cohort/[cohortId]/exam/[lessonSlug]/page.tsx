'use client'

import { useParams } from 'next/navigation'
import { ExamRunner } from '@/features/courses/exam/ExamRunner'

export default function CohortExamPage() {
  const { slug, cohortId, lessonSlug } = useParams() as {
    slug: string
    cohortId: string
    lessonSlug: string
  }
  return (
    <ExamRunner
      courseSlug={slug}
      lessonSlug={lessonSlug}
      cohortId={cohortId}
      backHref={`/courses/${slug}/cohort/${cohortId}`}
    />
  )
}
