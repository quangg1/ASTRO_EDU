import { notFound } from 'next/navigation'
import { CoursePageClient } from '@/components/courses/CoursePageClient'
import { fetchPublicCourseServer } from '@/features/courses/api/server'

export default async function CourseLearnLessonPage({
  params,
  searchParams,
}: {
  params: { slug: string; lessonSlug: string }
  searchParams?: { enrolled?: string }
}) {
  const course = await fetchPublicCourseServer(params.slug)
  if (!course) {
    notFound()
  }

  return (
    <CoursePageClient
      slug={params.slug}
      initialCourse={course}
      initialLessonSlug={params.lessonSlug}
      refreshAfterEnroll={searchParams?.enrolled === '1'}
    />
  )
}
