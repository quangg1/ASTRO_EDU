'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { fetchCourses } from '@/lib/coursesApi'
import { fetchTutorials } from '@/lib/tutorialsApi'
import type { Course } from '@/lib/coursesApi'
import type { Tutorial } from '@/lib/tutorialsApi'

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    if (!debouncedQ.trim()) {
      setCourses([])
      setTutorials([])
      return
    }
    setLoading(true)
    Promise.all([fetchCourses(debouncedQ), fetchTutorials(undefined, debouncedQ)])
      .then(([c, t]) => {
        setCourses(c)
        setTutorials(t)
      })
      .finally(() => setLoading(false))
  }, [debouncedQ])

  return (
    <div className="min-h-screen bg-black pt-16 px-4 pb-12">
      <main className="max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-cyan-400 mt-8 mb-4">Tìm kiếm</h1>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm khóa học, tutorial..."
          className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
          autoFocus
        />
        {loading && <p className="text-sm text-gray-500 mt-4">Đang tìm...</p>}
        {!loading && debouncedQ.trim() && (
          <div className="mt-8 space-y-8">
            {courses.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 mb-3">Khóa học</h2>
                <div className="space-y-3">
                  {courses.map((c) => (
                    <Link key={c.id} href={`/courses/${c.slug}`} className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                      <h3 className="font-medium text-white">{c.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{c.description}</p>
                      <span className="text-xs text-cyan-400/80 mt-2 inline-block">{c.lessonCount ?? 0} bài · {c.level}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {tutorials.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 mb-3">Tutorial</h2>
                <div className="space-y-3">
                  {tutorials.map((t) => (
                    <Link key={t._id} href={`/tutorial/${t.slug}`} className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                      <h3 className="font-medium text-white">{t.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.summary}</p>
                      <span className="text-xs text-cyan-400/80 mt-2 inline-block">{t.readTime} phút đọc</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {!loading && debouncedQ.trim() && courses.length === 0 && tutorials.length === 0 && (
              <p className="text-gray-500 text-sm">Không tìm thấy kết quả.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
