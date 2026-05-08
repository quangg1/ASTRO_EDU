import 'server-only'

import type { FetchCoursesOpts, Course } from '@/features/courses/api/coursesApi'
import { getApiPathBase } from '@/lib/apiConfig'

export async function fetchPublicCoursesServer(filters?: string | FetchCoursesOpts): Promise<Course[]> {
  const base = getApiPathBase()
  const opts: FetchCoursesOpts = typeof filters === 'string' ? { search: filters } : filters ?? {}
  const qs = new URLSearchParams()
  if (opts.search?.trim()) qs.set('q', opts.search.trim())
  if (opts.level && ['beginner', 'intermediate', 'advanced'].includes(opts.level)) qs.set('level', opts.level)
  if (opts.pricing === 'free' || opts.pricing === 'paid') qs.set('pricing', opts.pricing)
  const suffix = qs.toString()
  const url = suffix ? `${base}/courses?${suffix}` : `${base}/courses`

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

/** Landing + syllabus — payload outline-only */
export async function fetchCourseOutlineServer(slug: string): Promise<Course | null> {
  try {
    const res = await fetch(`${getApiPathBase()}/courses/${encodeURIComponent(slug)}?outline=1`, {
      cache: 'no-store',
    })
    const data = await res.json()
    if (data.success && data.data) {
      return data.data as Course
    }
  } catch {}

  return null
}
