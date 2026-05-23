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
    <div className="min-h-screen bg-ds-base">
      <main className="pt-16 px-4 pb-12 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-ds-accent mt-8 mb-2">Courses</h1>
        <p className="text-ds-muted text-sm mb-6">
          Join courses and interact with 3D simulations: Earth History, the Solar System, and the Milky Way.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wide text-ds-subtle">Độ khó</span>
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
                level === v ? 'border-ds-accent-strong bg-ds-accent-soft text-cyan-200' : 'border-ds-border text-ds-muted hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="text-[10px] uppercase tracking-wide text-ds-subtle">Giá</span>
          {(['', 'free', 'paid'] as const).map((v) => (
            <button
              key={v || 'all-pr'}
              type="button"
              onClick={() => setPricing(v)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                pricing === v ? 'border-ds-accent-strong bg-ds-accent-soft text-cyan-200' : 'border-ds-border text-ds-muted hover:bg-white/5'
              }`}
            >
              {v === '' ? 'Tất cả' : v === 'free' ? 'Miễn phí' : 'Trả phí'}
            </button>
          ))}
          <Link
            href="/tutorial"
            className="ml-auto text-xs text-ds-accent hover:text-cyan-100"
          >
            Lộ trình miễn phí →
          </Link>
        </div>

        {loading ? (
          <SkeletonList count={4} />
        ) : courses.length === 0 ? (
          <p className="text-ds-subtle">No courses yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {courses.map((c) => (
              <Link
                key={c.id}
                href={`/courses/${c.slug}`}
                className="block glass rounded-xl p-5 hover:bg-white/10 transition-colors border border-ds-border"
              >
                <h2 className="font-semibold text-ds-text mb-1">{c.title}</h2>
                <p className="text-sm text-ds-muted line-clamp-2 mb-2">{c.description}</p>
                <span className="text-xs text-ds-accent">
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
