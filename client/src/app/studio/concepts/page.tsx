'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import type { LearningConcept, LearningModule, DepthLevel } from '@/data/learningPathCurriculum'
import { DEPTH_META, DEPTH_ORDER } from '@/data/learningPathCurriculum'
import { fetchEditorConcepts, saveEditorConcepts } from '@/lib/conceptsApi'
import { fetchEditorLearningPath } from '@/lib/learningPathApi'

const inputCls =
  'w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none transition-colors'

function slugifyConceptId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

type UsageRow = {
  conceptId: string
  moduleTitle: string
  nodeTitle: string
  depth: DepthLevel
  lessonTitle: string
}

function buildUsage(modules: LearningModule[]): UsageRow[] {
  const out: UsageRow[] = []
  for (const m of modules) {
    for (const n of m.nodes) {
      for (const d of DEPTH_ORDER) {
        for (const lesson of n.depths[d] ?? []) {
          for (const conceptId of lesson.conceptIds ?? []) {
            out.push({
              conceptId,
              moduleTitle: m.titleVi || m.title || m.id,
              nodeTitle: n.titleVi || n.title || n.id,
              depth: d,
              lessonTitle: lesson.titleVi || lesson.title || lesson.id,
            })
          }
        }
      }
    }
  }
  return out
}

export default function StudioConceptsPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [concepts, setConcepts] = useState<LearningConcept[]>([])
  const [modules, setModules] = useState<LearningModule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [newConceptId, setNewConceptId] = useState('')
  const [newConceptTitle, setNewConceptTitle] = useState('')
  const [newConceptShortDescription, setNewConceptShortDescription] = useState('')
  const [newConceptExplanation, setNewConceptExplanation] = useState('')
  const [newConceptExamples, setNewConceptExamples] = useState('')
  const [newConceptRelated, setNewConceptRelated] = useState('')

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/studio/concepts')
    if (checked && user && user.role !== 'teacher' && user.role !== 'admin') router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
    if (!token) {
      setLoading(false)
      return
    }
    Promise.all([fetchEditorConcepts(token), fetchEditorLearningPath(token)])
      .then(([cs, lp]) => {
        setConcepts(cs || [])
        setModules(lp?.modules || [])
      })
      .finally(() => setLoading(false))
  }, [user])

  const usageByConcept = useMemo(() => {
    const rows = buildUsage(modules)
    const map = new Map<string, UsageRow[]>()
    for (const row of rows) {
      if (!map.has(row.conceptId)) map.set(row.conceptId, [])
      map.get(row.conceptId)?.push(row)
    }
    return map
  }, [modules])

  const save = async () => {
    const token = localStorage.getItem('galaxies_token')
    if (!token) return
    setSaving(true)
    setMessage('')
    const r = await saveEditorConcepts(token, concepts)
    setSaving(false)
    if (r.ok && r.concepts) setConcepts(r.concepts)
    setMessage(r.ok ? 'Đã lưu Concept Library.' : r.error || 'Lỗi lưu concept')
  }

  if (!checked || !user) {
    return <div className="min-h-screen bg-black pt-20 px-4 text-gray-400">Đang kiểm tra đăng nhập...</div>
  }

  return (
    <div className="min-h-screen bg-[#050508] pt-14 pb-10 px-3 md:px-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <nav className="text-sm">
          <Link href="/studio" className="text-cyan-400 hover:text-cyan-300">
            ← Studio
          </Link>
        </nav>

        <header className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-950/40 to-violet-950/30 px-4 py-4 md:px-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Concept Studio</h1>
            <p className="text-xs text-slate-400 mt-1">
              Tạo và quản lý thư viện concept dùng chung toàn hệ thống. Lesson chỉ map bằng concept id.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/studio/learning-path"
              className="text-xs min-h-10 px-3 inline-flex items-center rounded-lg border border-white/15 text-slate-200 hover:bg-white/10"
            >
              Đi tới Learning Path mapping
            </Link>
            <button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className="text-xs min-h-10 px-3 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Lưu Concept Library'}
            </button>
          </div>
        </header>

        {message ? <p className="text-sm text-emerald-400/90">{message}</p> : null}

        {loading ? (
          <p className="text-slate-500 py-12 text-center">Đang tải...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-4">
            <section className="rounded-2xl border border-white/10 bg-[#0c1018] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Tạo concept mới</h2>
              <input
                value={newConceptId}
                onChange={(e) => setNewConceptId(slugifyConceptId(e.target.value))}
                placeholder="concept_id (vd: scientific_method)"
                className={inputCls}
              />
              <input
                value={newConceptTitle}
                onChange={(e) => setNewConceptTitle(e.target.value)}
                placeholder="title (vd: Quỹ đạo)"
                className={inputCls}
              />
              <input
                value={newConceptShortDescription}
                onChange={(e) => setNewConceptShortDescription(e.target.value)}
                placeholder="short_description"
                className={inputCls}
              />
              <textarea
                value={newConceptExplanation}
                onChange={(e) => setNewConceptExplanation(e.target.value)}
                placeholder="explanation"
                className={`${inputCls} min-h-[100px]`}
              />
              <input
                value={newConceptExamples}
                onChange={(e) => setNewConceptExamples(e.target.value)}
                placeholder='examples (phân tách bởi "|")'
                className={inputCls}
              />
              <input
                value={newConceptRelated}
                onChange={(e) => setNewConceptRelated(e.target.value)}
                placeholder='related ids (vd: gravity|velocity)'
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => {
                  const id = slugifyConceptId(newConceptId || newConceptTitle)
                  if (!id || !newConceptExplanation.trim()) return
                  if (concepts.some((c) => c.id === id)) {
                    setMessage(`Concept "${id}" đã tồn tại`)
                    return
                  }
                  setConcepts((prev) => [
                    ...prev,
                    {
                      id,
                      title: newConceptTitle.trim() || id,
                      short_description: newConceptShortDescription.trim(),
                      explanation: newConceptExplanation.trim(),
                      examples: newConceptExamples
                        .split('|')
                        .map((x) => x.trim())
                        .filter(Boolean),
                      related: newConceptRelated
                        .split('|')
                        .map((x) => slugifyConceptId(x))
                        .filter(Boolean),
                    },
                  ])
                  setNewConceptId('')
                  setNewConceptTitle('')
                  setNewConceptShortDescription('')
                  setNewConceptExplanation('')
                  setNewConceptExamples('')
                  setNewConceptRelated('')
                }}
                className="w-full rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium py-2"
              >
                + Tạo concept
              </button>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#0a0f17] p-4">
              <h2 className="text-sm font-semibold text-white mb-3">Concept usage report</h2>
              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {concepts.length === 0 ? (
                  <p className="text-xs text-slate-600">Chưa có concept nào.</p>
                ) : (
                  concepts.map((c) => {
                    const rows = usageByConcept.get(c.id) || []
                    return (
                      <details key={c.id} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                        <summary className="cursor-pointer flex items-center justify-between gap-2">
                          <span className="text-xs text-cyan-200">
                            #{c.id} · {c.title || c.id}
                          </span>
                          <span className="text-[11px] text-slate-400">{rows.length} lesson(s)</span>
                        </summary>
                        <p className="text-[11px] text-slate-400 mt-2">{c.short_description}</p>
                        <p className="text-[11px] text-slate-300 mt-1">{c.explanation}</p>
                        {c.examples?.length > 0 && (
                          <ul className="mt-1 list-disc pl-4">
                            {c.examples.map((ex, i) => (
                              <li key={`${c.id}-ex-${i}`} className="text-[11px] text-slate-300">
                                {ex}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-2 space-y-1">
                          {rows.length === 0 ? (
                            <p className="text-[11px] text-slate-500">Chưa được map vào lesson nào.</p>
                          ) : (
                            rows.map((r, idx) => (
                              <p key={`${c.id}-${idx}`} className="text-[11px] text-slate-300">
                                <span className="text-slate-500">{r.moduleTitle}</span> → {r.nodeTitle} →{' '}
                                <span className="text-cyan-300">{DEPTH_META[r.depth].labelVi}</span> → {r.lessonTitle}
                              </p>
                            ))
                          )}
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const usedCount = rows.length
                              const ok =
                                usedCount > 0
                                  ? window.confirm(
                                      `Concept "${c.id}" đang được dùng trong ${usedCount} lesson(s). Bạn có chắc muốn xóa không?`,
                                    )
                                  : window.confirm(`Xóa concept "${c.id}"?`)
                              if (!ok) return
                              setConcepts((prev) => prev.filter((x) => x.id !== c.id))
                            }}
                            className="text-[11px] text-red-400/80 hover:text-red-300"
                          >
                            Xóa concept
                          </button>
                        </div>
                      </details>
                    )
                  })
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
