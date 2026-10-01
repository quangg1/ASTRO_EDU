'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canEnterStudio } from '@/lib/roles'
import {
  fetchLearningLinkCoverage,
  type LearningLinkCoverage,
  type LearningLinkCoverageEntity,
} from '../../api/entityLearningLinksApi'

type Filter = 'unlinked' | 'linked' | 'all'

const FILTER_LABELS: Record<Filter, string> = {
  unlinked: 'Chưa nối',
  linked: 'Đã nối',
  all: 'Tất cả',
}

function pct(part: number, total: number): string {
  if (!total) return '0%'
  return `${Math.round((part / total) * 100)}%`
}

function SourceBadges({ row }: { row: LearningLinkCoverageEntity }) {
  const items = [
    { n: row.sources.cms, label: 'Studio', tone: 'text-emerald-300 border-emerald-400/30' },
    { n: row.sources.scene, label: 'Bài khai báo', tone: 'text-sky-300 border-sky-400/30' },
    { n: row.sources.concept, label: 'Qua concept', tone: 'text-violet-300 border-violet-400/30' },
    { n: row.courseLessonCount, label: 'Khóa học', tone: 'text-amber-300 border-amber-400/30' },
  ].filter((x) => x.n > 0)
  if (!items.length) return <span className="text-[11px] text-ds-subtle">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((x) => (
        <span key={x.label} className={`rounded border px-1.5 py-0.5 text-[10px] ${x.tone}`}>
          {x.label} · {x.n}
        </span>
      ))}
    </span>
  )
}

/**
 * Độ phủ Edu ↔ 3D: entity nào trong cảnh 3D chưa dạy gì, và bài học nào trỏ tới
 * entity không tồn tại. Mỗi dòng dẫn thẳng tới chỗ sửa trong Studio.
 */
export function StudioLearningCoveragePage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [report, setReport] = useState<LearningLinkCoverage | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('unlinked')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/studio/learning-links')
    if (checked && user && !canEnterStudio(user)) router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void fetchLearningLinkCoverage().then((r) => {
      if (cancelled) return
      if (r.ok) setReport(r.data)
      else setError(r.error)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (report?.entities ?? [])
      .filter((r) => (filter === 'all' ? true : filter === 'linked' ? r.explicit : !r.explicit))
      .filter((r) => !q || r.entityId.toLowerCase().includes(q) || r.nameVi.toLowerCase().includes(q))
      .sort((a, b) => a.lessonCount + a.courseLessonCount - (b.lessonCount + b.courseLessonCount) || a.entityId.localeCompare(b.entityId))
  }, [report, filter, query])

  if (!checked || !user) {
    return <div className="min-h-screen bg-ds-base text-ds-text pt-20 px-4 text-ds-muted">Đang kiểm tra đăng nhập...</div>
  }

  const s = report?.summary

  return (
    <div className="min-h-screen bg-ds-base pt-14 pb-10 px-3 md:px-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <nav className="text-sm">
          <Link href="/studio" className="text-ds-accent">
            ← Studio
          </Link>
        </nav>

        <div className="rounded-2xl border border-ds-border bg-ds-surface p-5">
          <h1 className="text-xl font-semibold text-white">Độ phủ Edu ↔ 3D</h1>
          <p className="text-xs text-ds-muted mt-1">
            Entity “chưa nối” chỉ hiện gợi ý đoán theo từ khóa trong Explore. Gắn concept / bài học ở 3D Studio, hoặc khai
            báo “Cảnh 3D của bài” trong bài Lộ trình / Khóa học.
          </p>
          {s && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Entity đã nối" value={`${s.linkedEntityCount}/${s.entityCount}`} sub={pct(s.linkedEntityCount, s.entityCount)} />
              <Stat label="Bài Lộ trình có cảnh 3D" value={`${s.lpLessonsWithScene}/${s.lpLessonCount}`} sub={pct(s.lpLessonsWithScene, s.lpLessonCount)} />
              <Stat label="Bài Khóa học có cảnh 3D" value={String(s.courseLessonsWithScene)} />
              <Stat label="Tham chiếu hỏng" value={String(report?.danglingSceneRefs.length ?? 0)} warn={(report?.danglingSceneRefs.length ?? 0) > 0} />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-300">Không tải được báo cáo: {error}</p>}
        {!report && !error && <p className="text-sm text-ds-subtle">Đang tải…</p>}

        {report && report.danglingSceneRefs.length > 0 && (
          <div className="rounded-2xl border border-amber-400/30 bg-ds-surface p-5 space-y-2">
            <h2 className="text-sm font-semibold text-amber-200">Bài học trỏ tới entity không có trong cảnh 3D</h2>
            <ul className="space-y-1 text-sm">
              {report.danglingSceneRefs.map((ref) => (
                <li key={`${ref.kind}:${ref.lessonId}:${ref.entityId}`} className="flex flex-wrap items-center gap-2">
                  <code className="text-amber-300">{ref.entityId}</code>
                  <span className="text-ds-subtle">←</span>
                  {ref.kind === 'lp' ? (
                    <Link className="text-ds-accent" href="/studio/learning-path">
                      {ref.titleVi} <span className="text-ds-subtle">(Lộ trình · {ref.lessonId})</span>
                    </Link>
                  ) : (
                    <Link className="text-ds-accent" href={`/studio/${encodeURIComponent(ref.courseSlug)}`}>
                      {ref.titleVi} <span className="text-ds-subtle">(khóa {ref.courseSlug})</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {report && (
          <div className="rounded-2xl border border-ds-border bg-ds-surface p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    filter === f ? 'border-ds-accent text-ds-accent' : 'border-ds-border text-ds-muted'
                  }`}
                >
                  {FILTER_LABELS[f]}
                </button>
              ))}
              <input
                className="studio-field ml-auto max-w-xs"
                placeholder="Tìm entity…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-ds-subtle">
                  <tr>
                    <th className="py-2 pr-3">Entity</th>
                    <th className="py-2 pr-3">Concept</th>
                    <th className="py-2 pr-3">Bài học</th>
                    <th className="py-2 pr-3">Nguồn liên kết</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.entityId} className="border-t border-ds-border/60">
                      <td className="py-2 pr-3">
                        <div className="text-ds-text">{row.nameVi || row.entityId}</div>
                        <code className="text-[11px] text-ds-subtle">{row.entityId}</code>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{row.conceptCount}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.lessonCount + row.courseLessonCount}</td>
                      <td className="py-2 pr-3">
                        <SourceBadges row={row} />
                      </td>
                      <td className="py-2 text-right">
                        <Link
                          className="text-xs text-ds-accent whitespace-nowrap"
                          href={`/studio/showcase-entities?entity=${encodeURIComponent(row.entityId)}`}
                        >
                          Gắn nội dung →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && <p className="py-4 text-sm text-ds-subtle">Không có entity nào khớp.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-ds-border bg-ds-base/40 p-3">
      <div className="text-[11px] text-ds-muted">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${warn ? 'text-amber-300' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-[11px] text-ds-subtle">{sub}</div>}
    </div>
  )
}
