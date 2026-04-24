'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { fetchCourses } from '@/lib/coursesApi'
import type { Course } from '@/lib/coursesApi'
import { DEPTH_ORDER, type LearningConcept, type LearningModule } from '@/data/learningPathCurriculum'
import { useLearningPath } from '@/hooks/useLearningPath'

type Facet = 'all' | 'courses' | 'path_modules' | 'path_nodes' | 'path_lessons' | 'concepts'

type PathHit =
  | { kind: 'module'; href: string; title: string; subtitle: string }
  | { kind: 'node'; href: string; title: string; subtitle: string }
  | { kind: 'lesson'; href: string; title: string; subtitle: string }

function conceptHaystack(c: LearningConcept): string {
  return [c.id, c.title || '', c.short_description || '', ...(c.aliases || []), c.domain || '', c.subdomain || '']
    .join(' ')
    .toLowerCase()
}

function searchLearningPathDynamic(q: string, modules: LearningModule[]): PathHit[] {
  const query = q.trim().toLowerCase()
  if (!query) return []
  const hits: PathHit[] = []
  for (const m of modules) {
    const hay = `${m.title} ${m.titleVi} ${m.goal} ${m.goalVi}`.toLowerCase()
    if (hay.includes(query)) {
      hits.push({
        kind: 'module',
        href: `/tutorial/${m.id}`,
        title: `${m.emoji} ${m.titleVi}`,
        subtitle: m.goalVi,
      })
    }
    for (const n of m.nodes) {
      const nh = `${n.title} ${n.titleVi}`.toLowerCase()
      if (nh.includes(query)) {
        hits.push({
          kind: 'node',
          href: `/tutorial/${m.id}/${n.id}`,
          title: n.titleVi,
          subtitle: `${m.titleVi} · ${n.title}`,
        })
      }
      for (const d of DEPTH_ORDER) {
        for (const le of n.depths[d] ?? []) {
          const lh = `${le.titleVi} ${le.title}`.toLowerCase()
          if (lh.includes(query)) {
            hits.push({
              kind: 'lesson',
              href: `/tutorial/${m.id}/${n.id}/${encodeURIComponent(le.id)}`,
              title: le.titleVi,
              subtitle: `Bài học · ${n.titleVi} · ${d}`,
            })
          }
        }
      }
    }
  }
  const seen = new Set<string>()
  return hits.filter((h) => (seen.has(h.href) ? false : (seen.add(h.href), true)))
}

function searchConceptsList(q: string, concepts: LearningConcept[]): LearningConcept[] {
  const query = q.trim().toLowerCase()
  if (!query) return []
  return concepts.filter((c) => conceptHaystack(c).includes(query)).slice(0, 40)
}

const FACETS: { id: Facet; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'courses', label: 'Khóa học' },
  { id: 'path_modules', label: 'Module LP' },
  { id: 'path_nodes', label: 'Chủ đề LP' },
  { id: 'path_lessons', label: 'Bài LP' },
  { id: 'concepts', label: 'Concept' },
]

function facetLabel(kind: PathHit['kind'] | 'concept' | 'course'): string {
  switch (kind) {
    case 'module':
      return 'Module'
    case 'node':
      return 'Chủ đề'
    case 'lesson':
      return 'Bài học'
    case 'concept':
      return 'Concept'
    case 'course':
      return 'Khóa học'
    default:
      return 'Kết quả'
  }
}

export default function SearchPage() {
  const { modules, concepts, loaded } = useLearningPath()
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [facet, setFacet] = useState<Facet>('all')
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)

  const pathHits = useMemo(() => searchLearningPathDynamic(debouncedQ, modules), [debouncedQ, modules])
  const conceptHits = useMemo(() => searchConceptsList(debouncedQ, concepts), [debouncedQ, concepts])

  const modulesOnly = useMemo(() => pathHits.filter((h): h is PathHit & { kind: 'module' } => h.kind === 'module'), [pathHits])
  const nodesOnly = useMemo(() => pathHits.filter((h): h is PathHit & { kind: 'node' } => h.kind === 'node'), [pathHits])
  const lessonsOnly = useMemo(() => pathHits.filter((h): h is PathHit & { kind: 'lesson' } => h.kind === 'lesson'), [pathHits])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const showCourses = facet === 'all' || facet === 'courses'

  useEffect(() => {
    if (!debouncedQ.trim() || !showCourses) {
      setCourses([])
      return
    }
    setLoadingCourses(true)
    fetchCourses(debouncedQ)
      .then((c) => setCourses(c))
      .finally(() => setLoadingCourses(false))
  }, [debouncedQ, showCourses])
  const showModules = facet === 'all' || facet === 'path_modules'
  const showNodes = facet === 'all' || facet === 'path_nodes'
  const showLessons = facet === 'all' || facet === 'path_lessons'
  const showConcepts = facet === 'all' || facet === 'concepts'

  const anyPath =
    (showModules && modulesOnly.length > 0) ||
    (showNodes && nodesOnly.length > 0) ||
    (showLessons && lessonsOnly.length > 0)
  const anyConcepts = showConcepts && conceptHits.length > 0
  const anyCourses = showCourses && courses.length > 0
  const empty =
    debouncedQ.trim() &&
    !loadingCourses &&
    !anyPath &&
    !anyConcepts &&
    !anyCourses &&
    loaded

  return (
    <div className="min-h-screen bg-black pt-16 px-4 pb-12">
      <main className="max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-cyan-400 mt-8 mb-2">Tìm kiếm thống nhất</h1>
        <p className="text-sm text-slate-500 mb-4">
          Một ô tìm — lọc theo loại: khóa học, module/chủ đề/bài trong Lộ trình học, hoặc concept (đồ thị tri thức).
        </p>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Gõ từ khóa: bài học, module, concept id…"
          className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
          autoFocus
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {FACETS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFacet(f.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                facet === f.id
                  ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-100'
                  : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {!loaded && debouncedQ.trim() ? <p className="text-sm text-slate-500 mt-4">Đang tải lộ trình…</p> : null}
        {loadingCourses && showCourses && debouncedQ.trim() ? <p className="text-sm text-gray-500 mt-4">Đang tìm khóa học…</p> : null}
        {!loadingCourses && debouncedQ.trim() && (
          <div className="mt-8 space-y-10">
            {showCourses && courses.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-violet-200">Khóa học</span>
                  Kết quả
                </h2>
                <div className="space-y-3">
                  {courses.map((c) => (
                    <Link
                      key={c.id}
                      href={`/courses/${c.slug}`}
                      className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
                    >
                      <h3 className="font-medium text-white">{c.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{c.description}</p>
                      <span className="text-xs text-cyan-400/80 mt-2 inline-block">
                        {c.lessonCount ?? 0} bài · {c.level}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {showModules && modulesOnly.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 mb-3">Module lộ trình</h2>
                <div className="space-y-3">
                  {modulesOnly.map((h) => (
                    <Link key={h.href} href={h.href} className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                      <span className="text-[10px] uppercase tracking-wide text-cyan-400/80">{facetLabel('module')}</span>
                      <h3 className="font-medium text-white mt-0.5">{h.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{h.subtitle}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {showNodes && nodesOnly.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 mb-3">Chủ đề (node)</h2>
                <div className="space-y-3">
                  {nodesOnly.map((h) => (
                    <Link key={h.href} href={h.href} className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                      <span className="text-[10px] uppercase tracking-wide text-cyan-400/80">{facetLabel('node')}</span>
                      <h3 className="font-medium text-white mt-0.5">{h.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{h.subtitle}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {showLessons && lessonsOnly.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 mb-3">Bài học lộ trình</h2>
                <div className="space-y-3">
                  {lessonsOnly.map((h) => (
                    <Link key={h.href} href={h.href} className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                      <span className="text-[10px] uppercase tracking-wide text-cyan-400/80">{facetLabel('lesson')}</span>
                      <h3 className="font-medium text-white mt-0.5">{h.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{h.subtitle}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {showConcepts && conceptHits.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 mb-3">Concept</h2>
                <div className="space-y-3">
                  {conceptHits.map((c) => (
                    <Link
                      key={c.id}
                      href={`/tutorial/knowledge-map?c=${encodeURIComponent(c.id)}&mode=focus&domain=all&hops=2`}
                      className="block rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 hover:bg-emerald-500/10 transition-colors"
                    >
                      <span className="text-[10px] uppercase tracking-wide text-emerald-300/90">{facetLabel('concept')}</span>
                      <h3 className="font-medium text-white mt-0.5">{c.title}</h3>
                      <p className="font-mono text-[11px] text-slate-500">{c.id}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.short_description}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {empty ? <p className="text-gray-500 text-sm">Không có kết quả trong nhóm đang lọc.</p> : null}
          </div>
        )}
      </main>
    </div>
  )
}
