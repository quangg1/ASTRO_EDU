'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { fetchCourses } from '@/lib/coursesApi'
import type { Course } from '@/lib/coursesApi'
import { DEPTH_ORDER, LEARNING_MODULES } from '@/data/learningPathCurriculum'

function searchLearningPath(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hits: { href: string; title: string; subtitle: string }[] = []
  for (const m of LEARNING_MODULES) {
    const hay = `${m.title} ${m.titleVi} ${m.goal} ${m.goalVi}`.toLowerCase()
    if (hay.includes(q)) {
      hits.push({
        href: `/tutorial/${m.id}`,
        title: `${m.emoji} ${m.titleVi}`,
        subtitle: m.goalVi,
      })
    }
    for (const n of m.nodes) {
      const nh = `${n.title} ${n.titleVi}`.toLowerCase()
      if (nh.includes(q)) {
        hits.push({
          href: `/tutorial/${m.id}/${n.id}`,
          title: n.titleVi,
          subtitle: `${m.titleVi} · ${n.title}`,
        })
      }
      for (const d of DEPTH_ORDER) {
        for (const le of n.depths[d] ?? []) {
          const lh = `${le.titleVi} ${le.title}`.toLowerCase()
          if (lh.includes(q)) {
            hits.push({
              href: `/tutorial/${m.id}/${n.id}/${encodeURIComponent(le.id)}`,
              title: le.titleVi,
              subtitle: `Bài học · ${n.titleVi}`,
            })
          }
        }
      }
    }
  }
  const seen = new Set<string>()
  return hits.filter((h) => (seen.has(h.href) ? false : (seen.add(h.href), true)))
}

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)

  const pathHits = useMemo(() => searchLearningPath(debouncedQ), [debouncedQ])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    if (!debouncedQ.trim()) {
      setCourses([])
      return
    }
    setLoading(true)
    fetchCourses(debouncedQ)
      .then((c) => setCourses(c))
      .finally(() => setLoading(false))
  }, [debouncedQ])

  return (
    <div className="min-h-screen bg-black pt-16 px-4 pb-12">
      <main className="max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-cyan-400 mt-8 mb-4">Search</h1>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm khóa học, chủ đề lộ trình học..."
          className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
          autoFocus
        />
        {loading && <p className="text-sm text-gray-500 mt-4">Searching...</p>}
        {!loading && debouncedQ.trim() && (
          <div className="mt-8 space-y-8">
            {courses.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 mb-3">Courses</h2>
                <div className="space-y-3">
                  {courses.map((c) => (
                    <Link key={c.id} href={`/courses/${c.slug}`} className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                      <h3 className="font-medium text-white">{c.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{c.description}</p>
                      <span className="text-xs text-cyan-400/80 mt-2 inline-block">{c.lessonCount ?? 0} lessons · {c.level}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {pathHits.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 mb-3">Learning Path</h2>
                <div className="space-y-3">
                  {pathHits.map((h) => (
                    <Link
                      key={h.href}
                      href={h.href}
                      className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
                    >
                      <h3 className="font-medium text-white">{h.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{h.subtitle}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {!loading && debouncedQ.trim() && courses.length === 0 && pathHits.length === 0 && (
              <p className="text-gray-500 text-sm">No results found.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
