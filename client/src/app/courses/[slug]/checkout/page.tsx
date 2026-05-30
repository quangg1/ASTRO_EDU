import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { CourseCheckoutClient } from '@/features/payment/ui/CourseCheckoutClient'
import { fetchCourseOutlineServer } from '@/features/courses/server'

export default async function CourseCheckoutPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { cohortId?: string }
}) {
  const { slug } = params
  const cohortId = searchParams?.cohortId?.trim() || null
  const outline = await fetchCourseOutlineServer(slug)
  if (!outline) {
    notFound()
  }

  const isPaid = Boolean(outline.isPaid && (outline.price ?? 0) > 0)

  if (!isPaid) {
    redirect(`/courses/${slug}`)
  }

  if (outline.enrollment && !cohortId) {
    redirect(`/courses/${slug}?owned=1`)
  }

  if (!outline.id) {
    notFound()
  }

  return (
    <Suspense
      fallback={
        <main className="surface-edu min-h-screen flex items-center justify-center">
          <p className="text-sm text-ds-muted">Đang tải…</p>
        </main>
      }
    >
      <CourseCheckoutClient
        slug={slug}
        courseId={outline.id}
        courseTitle={outline.title}
        initialCohortId={cohortId}
      />
    </Suspense>
  )
}
