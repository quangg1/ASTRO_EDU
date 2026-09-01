'use client'

import { useParams } from 'next/navigation'
import { CohortHub } from '@/features/courses/public'

export default function CohortHubPage() {
  const { slug, cohortId } = useParams() as { slug: string; cohortId: string }
  return <CohortHub courseSlug={slug} cohortId={cohortId} />
}
