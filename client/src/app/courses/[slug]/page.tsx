import { notFound, redirect } from 'next/navigation'
import { CourseLandingClient } from '@/components/courses/CourseLandingClient'
import { fetchCourseOutlineServer } from '@/features/courses/server'

export default async function CourseSlugPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { lesson?: string; enrolled?: string; checkout?: string }
}) {
  const { slug } = params

  if (searchParams?.lesson?.trim()) {
    redirect(`/courses/${slug}/learn/${encodeURIComponent(searchParams.lesson.trim())}`)
  }

  const outline = await fetchCourseOutlineServer(slug)
  if (searchParams?.checkout === '1' && outline?.isPaid && (outline.price ?? 0) > 0 && !outline.enrollment) {
    redirect(`/courses/${slug}/checkout`)
  }
  if (!outline) {
    notFound()
  }

  return (
    <CourseLandingClient
      slug={slug}
      initialCourse={outline}
      enrolledFlash={searchParams?.enrolled === '1'}
    />
  )
}
