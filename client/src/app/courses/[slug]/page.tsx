import { notFound } from 'next/navigation'
import { CoursePageClient } from '@/components/courses/CoursePageClient'
import { fetchPublicCourseServer } from '@/lib/server/coursesServer'

export default async function CourseSlugPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { lesson?: string; enrolled?: string }
}) {
  const course = await fetchPublicCourseServer(params.slug)

  if (!course) {
    notFound()
  }

  return (
    <CoursePageClient
      slug={params.slug}
      initialCourse={course}
      initialLessonSlug={searchParams?.lesson}
      refreshAfterEnroll={searchParams?.enrolled === '1'}
    />
  )
}
