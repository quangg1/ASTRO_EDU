'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchCourses, type Course } from '@/lib/coursesApi'
import { SkeletonList } from '@/components/ui/Skeleton'

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-black">
      <main className="pt-16 px-4 pb-12 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-cyan-400 mt-8 mb-2">Courses</h1>
        <p className="text-gray-400 text-sm mb-8">
          Join courses and interact with 3D simulations: Earth History, the Solar System, and the Milky Way.
        </p>

        {loading ? (
          <SkeletonList count={4} />
        ) : courses.length === 0 ? (
          <p className="text-gray-500">No courses yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {courses.map((c) => (
              <Link
                key={c.id}
                href={`/courses/${c.slug}`}
                className="block glass rounded-xl p-5 hover:bg-white/10 transition-colors border border-white/10"
              >
                <h2 className="font-semibold text-white mb-1">{c.title}</h2>
                <p className="text-sm text-gray-400 line-clamp-2 mb-2">{c.description}</p>
                <span className="text-xs text-cyan-400/80">
                  {c.lessonCount ?? 0} lessons · {c.level}
                  {c.isPaid && c.price != null && c.price > 0 && (
                    <> · {c.currency === 'USD' ? `$${c.price}` : `${(c.price ?? 0).toLocaleString('en-US')} ₫`}</>
                  )}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
