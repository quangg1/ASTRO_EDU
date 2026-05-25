import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { CourseCheckoutClient } from '@/features/payment/ui/CourseCheckoutClient'
import { fetchCourseOutlineServer } from '@/features/courses/server'

export default async function CourseCheckoutPage({
  params,
}: {
  params: { slug: string }
}) {
  const { slug } = params
  const outline = await fetchCourseOutlineServer(slug)
  if (!outline) {
    notFound()
  }

  const isPaid = Boolean(outline.isPaid && (outline.price ?? 0) > 0)

  if (!isPaid) {
    redirect(`/courses/${slug}`)
  }

  if (outline.enrollment) {
    redirect(`/courses/${slug}/learn`)
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
      <CourseCheckoutClient slug={slug} courseId={outline.id} courseTitle={outline.title} />
    </Suspense>
  )
}
