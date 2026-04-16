import 'server-only'

import { getApiPathBase } from '@/lib/apiConfig'
import type { Course } from '@/lib/coursesApi'

export async function fetchPublicCoursesServer(search?: string): Promise<Course[]> {
  const base = getApiPathBase()
  const url = search?.trim() ? `${base}/courses?q=${encodeURIComponent(search.trim())}` : `${base}/courses`

  try {
    const res = await fetch(url, {
      cache: 'no-store',
    })
    const data = await res.json()
    if (data.success && Array.isArray(data.data)) {
      return data.data as Course[]
    }
  } catch {}

  return []
}

export async function fetchPublicCourseServer(slug: string): Promise<Course | null> {
  try {
    const res = await fetch(`${getApiPathBase()}/courses/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    })
    const data = await res.json()
    if (data.success && data.data) {
      return data.data as Course
    }
  } catch {}

  return null
}
