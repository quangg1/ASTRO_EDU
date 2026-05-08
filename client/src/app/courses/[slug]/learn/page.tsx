import { notFound, redirect } from 'next/navigation'
import { fetchCourseOutlineServer } from '@/features/courses/api/server'

export default async function CourseLearnIndexPage({
  params,
}: {
  params: { slug: string }
}) {
  const outline = await fetchCourseOutlineServer(params.slug)
  const lessons = outline?.lessons ?? []
  if (!outline || lessons.length === 0) {
    notFound()
  }
  const first = [...lessons].sort((a, b) => a.order - b.order)[0]
  redirect(`/courses/${params.slug}/learn/${encodeURIComponent(first.slug)}`)
}
