'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchCourses, type Course, type FetchCoursesOpts } from '@/features/courses/api/coursesApi'
import { SkeletonList } from '@/components/ui/Skeleton'

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [level, setLevel] = useState<NonNullable<FetchCoursesOpts['level']>>( '')
  const [pricing, setPricing] = useState<NonNullable<FetchCoursesOpts['pricing']>>( '')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchCourses({ level, pricing })
      .then((next) => {
        if (!cancelled) setCourses(next)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [level, pricing])

  return (
    <div className="min-h-screen bg-black">
      <main className="pt-16 px-4 pb-12 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-cyan-400 mt-8 mb-2">Courses</h1>
        <p className="text-gray-400 text-sm mb-6">
          Join courses and interact with 3D simulations: Earth History, the Solar System, and the Milky Way.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wide text-gray-600">Độ khó</span>
          {(
            [
              ['', 'Tất cả'],
              ['beginner', 'Cơ bản'],
              ['intermediate', 'Trung cấp'],
              ['advanced', 'Nâng cao'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v || 'all'}
              type="button"
              onClick={() => setLevel(v)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                level === v ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200' : 'border-white/10 text-gray-400 hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="text-[10px] uppercase tracking-wide text-gray-600">Giá</span>
          {(['', 'free', 'paid'] as const).map((v) => (
            <button
              key={v || 'all-pr'}
              type="button"
              onClick={() => setPricing(v)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                pricing === v ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200' : 'border-white/10 text-gray-400 hover:bg-white/5'
              }`}
            >
              {v === '' ? 'Tất cả' : v === 'free' ? 'Miễn phí' : 'Trả phí'}
            </button>
          ))}
          <Link
            href="/tutorial"
            className="ml-auto text-xs text-cyan-400/90 hover:text-cyan-300"
          >
            Lộ trình miễn phí →
          </Link>
        </div>

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
