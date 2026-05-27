'use client'

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DEPTH_ORDER,
  DEPTH_META,
  createEmptyLessonItem,
  createEmptyModule,
  createEmptyNode,
  duplicateLearningModule,
  insertModuleCloneAfter,
  moveModuleStep,
  renumberModuleOrders,
  reorderModulesDragDrop,
  type DepthLevel,
  type LearningConcept,
  type LearningModule,
  type LearningNode,
  type LessonConceptAnchor,
  type LessonItem,
  type TopicWeight,
} from '@/data/learningPathCurriculum'
import { fetchEditorLearningPath, saveEditorLearningPath } from '@/lib/learningPathApi'
import {
  FALLBACK_TAXONOMY_REGISTRY,
  fetchEditorConcepts,
  fetchTaxonomyRegistryEditor,
  type TaxonomyRegistry,
} from '@/lib/conceptsApi'
import type { Lesson } from '@/lib/coursesApi'
import { useAuthStore } from '@/store/useAuthStore'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  GripVertical,
  Layers,
  ListTree,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { NodeTopicWeightsEditor } from '@/components/studio/NodeTopicWeightsEditor'

const BlockEditor = dynamic(() => import('@/components/studio/BlockEditor'), { ssr: false })
const BlockPalette = dynamic(() => import('@/components/studio/BlockPalette'), { ssr: false })
const LessonPreview = dynamic(() => import('@/components/studio/LessonPreview'), { ssr: false })

function cloneJson<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function safeLower(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : ''
}

// ── HUD chrome helpers ──────────────────────────────────
function _pr(seed: number) { const x = Math.sin(seed + 1) * 10000; return x - Math.floor(x) }
const STUDIO_STARS = Array.from({ length: 100 }, (_, i) => ({
  x: _pr(i * 7 + 1) * 100, y: _pr(i * 7 + 2) * 100,
  r: _pr(i * 7 + 3) * 1.2 + 0.4, o: _pr(i * 7 + 4) * 0.5 + 0.15,
  d: _pr(i * 7 + 5) * 4 + 2,
  c: _pr(i * 7 + 6) > 0.9 ? '#7ee7ff' : _pr(i * 7 + 1) > 0.88 ? '#f5a524' : '#ffffff',
}))

function SCorner({ color = '#7ee7ff', size = 12, thick = 1.5 }: { color?: string; size?: number; thick?: number }) {
  const b = `${thick}px solid ${color}`
  const s: CSSProperties = { position: 'absolute', width: size, height: size, pointerEvents: 'none' }
  return (
    <>
      <span style={{ ...s, top: 0, left: 0, borderTop: b, borderLeft: b }} />
      <span style={{ ...s, top: 0, right: 0, borderTop: b, borderRight: b }} />
      <span style={{ ...s, bottom: 0, left: 0, borderBottom: b, borderLeft: b }} />
      <span style={{ ...s, bottom: 0, right: 0, borderBottom: b, borderRight: b }} />
    </>
  )
}

type ConceptUsageItem = {
  conceptId: string
  moduleId: string
  moduleTitle: string
  nodeId: string
  nodeTitle: string
  depth: DepthLevel
  lessonId: string
  lessonTitle: string
}

function buildConceptUsage(modules: LearningModule[]): ConceptUsageItem[] {
  const out: ConceptUsageItem[] = []
  for (const m of modules) {
    for (const n of m.nodes) {
      for (const d of DEPTH_ORDER) {
        for (const lesson of n.depths[d] ?? []) {
          const seen = new Set<string>()
          for (const conceptId of lesson.conceptIds ?? []) {
            const key = `${lesson.id}:${conceptId}`
            if (seen.has(key)) continue
            seen.add(key)
            out.push({
              conceptId,
              moduleId: m.id,
              moduleTitle: m.titleVi || m.title || m.id,
              nodeId: n.id,
              nodeTitle: n.titleVi || n.title || n.id,
              depth: d,
              lessonId: lesson.id,
              lessonTitle: lesson.titleVi || lesson.title || lesson.id,
            })
          }
          for (const a of lesson.conceptAnchors ?? []) {
            const conceptId = String(a.conceptId || '').trim()
            if (!conceptId) continue
            const key = `${lesson.id}:${conceptId}`
            if (seen.has(key)) continue
            seen.add(key)
            out.push({
              conceptId,
              moduleId: m.id,
              moduleTitle: m.titleVi || m.title || m.id,
              nodeId: n.id,
              nodeTitle: n.titleVi || n.title || n.id,
              depth: d,
              lessonId: lesson.id,
              lessonTitle: lesson.titleVi || lesson.title || lesson.id,
            })
          }
        }
      }
    }
  }
  return out
}

const inputCls =
  'w-full rounded bg-[#030a14] border border-white/10 px-3 py-2 text-white text-sm focus:border-cyan-500/40 focus:outline-none transition-colors placeholder:text-slate-600'

function updateLesson(
  modules: LearningModule[],
  moduleId: string,
  nodeId: string,
  depth: DepthLevel,
  lessonId: string,
  patch: Partial<LessonItem>,
): LearningModule[] {
  return modules.map((m) => {
    if (m.id !== moduleId) return m
    return {
      ...m,
      nodes: m.nodes.map((n) => {
        if (n.id !== nodeId) return n
        const depths = { ...n.depths } as Record<DepthLevel, LessonItem[]>
        const list = [...(depths[depth] ?? [])]
        const idx = list.findIndex((l) => l.id === lessonId)
        if (idx >= 0) list[idx] = { ...list[idx], ...patch }
        depths[depth] = list
        return { ...n, depths }
      }),
    }
  })
}

function updateNodeFields(
  modules: LearningModule[],
  moduleId: string,
  nodeId: string,
  patch: Partial<LearningNode>,
): LearningModule[] {
  return modules.map((m) => {
    if (m.id !== moduleId) return m
    return {
      ...m,
      nodes: m.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
    }
  })
}

function updateModuleFields(
  modules: LearningModule[],
  moduleId: string,
  patch: Partial<LearningModule>,
): LearningModule[] {
  return modules.map((m) => (m.id === moduleId ? { ...m, ...patch } : m))
}

function updateLessonList(
  modules: LearningModule[],
  moduleId: string,
  nodeId: string,
  depth: DepthLevel,
  fn: (list: LessonItem[]) => LessonItem[],
): LearningModule[] {
  return modules.map((m) => {
    if (m.id !== moduleId) return m
    return {
      ...m,
      nodes: m.nodes.map((n) => {
        if (n.id !== nodeId) return n
        const list = [...(n.depths[depth] ?? [])]
        const nextList = fn(list)
        return { ...n, depths: { ...n.depths, [depth]: nextList } }
      }),
    }
  })
}

function LearningPathLessonEditor({
  activeLesson,
  concepts,
  taxonomyRegistry,
  moduleId,
  nodeId,
  depth,
  editorTab,
  setEditorTab,
  updateLesson: applyPatch,
  setModules,
  inputCls,
}: {
  activeLesson: LessonItem
  concepts: LearningConcept[]
  taxonomyRegistry: TaxonomyRegistry
  moduleId: string
  nodeId: string
  depth: DepthLevel
  editorTab: 'blocks' | 'preview' | 'lesson-page'
  setEditorTab: (t: 'blocks' | 'preview' | 'lesson-page') => void
  updateLesson: typeof updateLesson
  setModules: Dispatch<SetStateAction<LearningModule[]>>
  inputCls: string
}) {
  const sections = activeLesson.sections ?? []
  const selectedConceptIds = activeLesson.conceptIds ?? []
  const [previewConceptId, setPreviewConceptId] = useState<string | null>(null)
  const [conceptQuery, setConceptQuery] = useState('')
  const [conceptDomain, setConceptDomain] = useState('all')
  const [conceptSubdomain, setConceptSubdomain] = useState('all')

  const conceptDomains = useMemo(() => {
    return Object.keys(taxonomyRegistry).sort((a, b) => a.localeCompare(b, 'vi'))
  }, [taxonomyRegistry])

  const filteredConceptCandidates = useMemo(() => {
    const q = safeLower(conceptQuery.trim())
    return concepts.filter((c) => {
      if (conceptDomain !== 'all' && (c.domain || '') !== conceptDomain) return false
      if (conceptSubdomain !== 'all' && (c.subdomain || '') !== conceptSubdomain) return false
      if (!q) return true
      const haystack = [
        c.id,
        c.title,
        c.short_description,
        c.explanation,
        c.domain,
        c.subdomain,
        ...(c.aliases || []),
      ]
      return haystack.some((x) => safeLower(x).includes(q))
    })
  }, [concepts, conceptDomain, conceptSubdomain, conceptQuery])

  const conceptSubdomains = useMemo(() => {
    const set = new Set<string>()
    if (conceptDomain !== 'all') {
      ;(taxonomyRegistry[conceptDomain] || []).forEach((x) => set.add(x))
    } else {
      Object.values(taxonomyRegistry).forEach((arr) => arr.forEach((x) => set.add(x)))
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'))
  }, [conceptDomain, taxonomyRegistry])

  useEffect(() => {
    if (conceptSubdomain === 'all') return
    if (!conceptSubdomains.includes(conceptSubdomain)) setConceptSubdomain('all')
  }, [conceptSubdomains, conceptSubdomain])
  const selectedConcepts = useMemo(
    () =>
      selectedConceptIds
        .map((id) => concepts.find((c) => c.id === id))
        .filter((x): x is LearningConcept => !!x),
    [selectedConceptIds, concepts],
  )
  const previewConcept = useMemo(
    () => (previewConceptId ? concepts.find((c) => c.id === previewConceptId) ?? null : null),
    [previewConceptId, concepts],
  )
  const unselectedFilteredConcepts = useMemo(
    () => filteredConceptCandidates.filter((c) => !selectedConceptIds.includes(c.id)),
    [filteredConceptCandidates, selectedConceptIds],
  )
  const conceptById = useMemo(() => new Map(concepts.map((c) => [c.id, c])), [concepts])
  const anchoredConceptIds = useMemo(
    () =>
      new Set(
        (activeLesson.conceptAnchors ?? [])
          .map((a) => String(a.conceptId || '').trim())
          .filter(Boolean),
      ),
    [activeLesson.conceptAnchors],
  )
  const depthBudget = useMemo(() => {
    if (depth === 'beginner') return 3
    if (depth === 'explorer') return 5
    return 7
  }, [depth])
  const conceptChecklist = useMemo(() => {
    const selectedSet = new Set(selectedConceptIds)
    const missingConceptIds = selectedConceptIds.filter((id) => !conceptById.has(id))
    const missingAnchorIds = selectedConceptIds.filter((id) => !anchoredConceptIds.has(id))
    const missingPrerequisites: Array<{ conceptId: string; prereqId: string }> = []
    for (const concept of selectedConcepts) {
      for (const prereqId of concept.prerequisites ?? []) {
        if (!selectedSet.has(prereqId)) {
          missingPrerequisites.push({ conceptId: concept.id, prereqId })
        }
      }
    }
    const removalCandidates = selectedConcepts
      .map((concept) => {
        const anchored = anchoredConceptIds.has(concept.id)
        const usedAsPrereq = selectedConcepts.some((other) =>
          (other.prerequisites ?? []).includes(concept.id),
        )
        const score = (anchored ? 2 : 0) + (usedAsPrereq ? 2 : 0)
        return { conceptId: concept.id, score }
      })
      .sort((a, b) => a.score - b.score)
      .map((row) => row.conceptId)
      .slice(0, 3)

    return {
      selectedCount: selectedConceptIds.length,
      overBudget: Math.max(0, selectedConceptIds.length - depthBudget),
      missingConceptIds,
      missingAnchorIds,
      missingPrerequisites,
      removalCandidates,
    }
  }, [anchoredConceptIds, conceptById, depthBudget, selectedConceptIds, selectedConcepts])

  useEffect(() => {
    if (!previewConceptId) return
    if (!unselectedFilteredConcepts.some((c) => c.id === previewConceptId)) {
      setPreviewConceptId(null)
    }
  }, [previewConceptId, unselectedFilteredConcepts])

  const patchLesson = (patch: Partial<LessonItem>) => {
    setModules((prev) => applyPatch(prev, moduleId, nodeId, depth, activeLesson.id, patch))
  }

  const previewLesson: Lesson = useMemo(
    () => ({
      title: activeLesson.titleVi,
      slug: activeLesson.id,
      description: '',
      type: 'text',
      visualizationId: null,
      stageTime: null,
      videoUrl: null,
      coverImage: null,
      galleryImages: [],
      week: null,
      moduleId: null,
      content: '',
      learningGoals: [],
      sections: activeLesson.sections ?? [],
      quizQuestions: [],
      resourceLinks: [],
      sourcePdf: null,
      sourcePageCount: null,
      order: 0,
    }),
    [activeLesson],
  )
  const sectionOutline = useMemo(
    () =>
      sections.map((sec, idx) => ({
        idx,
        id: `lp-studio-block-${idx}`,
        title: sec.title?.trim() || `Block ${idx + 1}`,
        type: sec.type,
        level: sec.sectionLevel ?? 'main',
      })),
    [sections],
  )
  const tocGroups = useMemo(() => {
    type OutlineItem = (typeof sectionOutline)[number]
    const groups: Array<{ parent: OutlineItem; children: OutlineItem[] }> = []
    let lastParent = -1
    for (const item of sectionOutline) {
      if (item.level === 'sub' && lastParent >= 0) {
        groups[lastParent].children.push(item)
      } else {
        groups.push({ parent: item, children: [] })
        lastParent = groups.length - 1
      }
    }
    return groups
  }, [sectionOutline])

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= sections.length || from === to) return
    const next = [...sections]
    const [picked] = next.splice(from, 1)
    next.splice(to, 0, picked)
    patchLesson({ sections: next })
  }

  return (
    <div className="w-full max-w-none space-y-4">
      <div>
        <p className="text-[10px] text-slate-600 font-mono break-all mb-2">{activeLesson.id}</p>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.2em', color: '#7ee7ff', textTransform: 'uppercase', marginBottom: 8 }}>
          // lesson editor
        </div>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600, color: '#eaf6ff' }}>
          Soạn <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#f5a524' }}>bài học</em>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Cùng block kit với Course Studio — &quot;Lưu toàn bộ&quot; sau khi sửa xong (có thể nhiều bài).
        </p>
      </div>

      <label className="block text-xs text-slate-400">
        Tiêu đề (VI)
        <input
          value={activeLesson.titleVi}
          onChange={(e) => patchLesson({ titleVi: e.target.value })}
          className={`mt-1 ${inputCls}`}
        />
      </label>
      <label className="block text-xs text-slate-400">
        Title (EN)
        <input
          value={activeLesson.title}
          onChange={(e) => patchLesson({ title: e.target.value })}
          className={`mt-1 ${inputCls}`}
        />
      </label>

      <div style={{ position: 'relative', background: 'rgba(3,7,14,0.95)', border: '1px solid rgba(126,231,255,0.22)', clipPath: 'polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0% 100%,0% 12px)', padding: 16 }}>
        <SCorner color="#7ee7ff" size={10} thick={1} />
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.2em', color: '#7ee7ff', textTransform: 'uppercase' as const, marginBottom: 12 }}>
          // concept mapping + highlight
        </div>
        {concepts.length === 0 ? (
          <p className="text-xs text-slate-500">
            Chưa có concept. Tạo concept ở panel bên trái rồi quay lại map cho bài này.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1fr,180px,180px] gap-2 mb-2">
              <input
                value={conceptQuery}
                onChange={(e) => setConceptQuery(e.target.value)}
                placeholder="Tìm concept theo id/title/aliases..."
                className={inputCls}
              />
              <select
                value={conceptDomain}
                onChange={(e) => setConceptDomain(e.target.value)}
                className={inputCls}
              >
                <option value="all">Tất cả domain</option>
                {conceptDomains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={conceptSubdomain}
                onChange={(e) => setConceptSubdomain(e.target.value)}
                className={inputCls}
              >
                <option value="all">Tất cả subdomain</option>
                {conceptSubdomains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Đang chọn {selectedConcepts.length}/{concepts.length} concept
            </p>
            <div className="rounded-lg border border-white/10 bg-black/25 p-2.5 mb-2">
              <p className="text-[11px] text-slate-400 mb-2">Concept đã gắn vào bài</p>
              {selectedConcepts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedConcepts.map((c) => (
                    <div key={`selected-${c.id}`} className="inline-flex items-center gap-1">
                      <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 text-xs text-cyan-100">
                        #{c.id}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          patchLesson({ conceptIds: selectedConceptIds.filter((id) => id !== c.id) })
                        }
                        className="rounded-full border border-white/15 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
                        title="Bỏ concept khỏi bài"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">Chưa gắn concept nào cho bài này.</p>
              )}
            </div>
            {previewConcept ? (
              <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3 mb-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] text-slate-400">Preview concept trước khi thêm</p>
                  <button
                    type="button"
                    onClick={() => setPreviewConceptId(null)}
                    className="text-[11px] rounded border border-white/15 px-2 py-0.5 text-slate-300 hover:bg-white/10"
                  >
                    Đóng preview
                  </button>
                </div>
                <p className="text-xs font-semibold text-cyan-200 mt-1">
                  {previewConcept.title || previewConcept.id} ({previewConcept.id})
                </p>
                <p className="text-xs text-slate-300 mt-2">
                  {previewConcept.short_description || previewConcept.explanation || 'Chưa có nội dung mô tả.'}
                </p>
                {previewConcept.examples?.length ? (
                  <ul className="mt-2 list-disc pl-4 space-y-1">
                    {previewConcept.examples.slice(0, 3).map((ex, i) => (
                      <li key={`${previewConcept.id}-preview-example-${i}`} className="text-[11px] text-slate-300">
                        {ex}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => patchLesson({ conceptIds: [...new Set([...selectedConceptIds, previewConcept.id])] })}
                    className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs text-white hover:bg-cyan-500"
                  >
                    Thêm vào bài
                  </button>
                </div>
              </div>
            ) : null}
            <p className="text-[11px] text-slate-400 mb-2">
              Thêm nhanh từ danh sách ({unselectedFilteredConcepts.length} concept phù hợp bộ lọc)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {unselectedFilteredConcepts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPreviewConceptId(c.id)}
                  className={`text-left rounded-lg border px-2.5 py-2 text-xs transition-colors ${
                    previewConceptId === c.id
                      ? 'border-cyan-400/70 bg-cyan-500/15'
                      : 'border-white/10 bg-black/30 hover:border-cyan-500/40 hover:bg-cyan-500/10'
                  }`}
                  title={c.short_description || c.explanation}
                >
                  <span className="text-cyan-200 block">+ #{c.id}</span>
                  <span className="text-slate-200 block">{c.title || c.id}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {c.domain || 'no-domain'}
                    {c.subdomain ? ` / ${c.subdomain}` : ''}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-cyan-500/20">
              <p className="text-xs font-medium text-violet-200 mb-1">Highlight trong nội dung (cụm văn bản → concept)</p>
              <p className="text-[11px] text-slate-500 mb-3">
                Gõ đúng cụm xuất hiện trong nội dung bài (khớp ngữ nghĩa do bạn chọn, không auto theo title concept). Cụm dài được ưu tiên nếu trùng phần.
              </p>
              <div className="space-y-2">
                {(activeLesson.conceptAnchors ?? []).map((row, idx) => (
                  <div key={idx} className="flex flex-wrap gap-2 items-end">
                    <label className="flex-1 min-w-[140px] text-[10px] text-slate-400">
                      Cụm trong bài
                      <input
                        value={row.phrase}
                        onChange={(e) => {
                          const next = [...(activeLesson.conceptAnchors ?? [])] as LessonConceptAnchor[]
                          next[idx] = { ...next[idx], phrase: e.target.value }
                          patchLesson({ conceptAnchors: next })
                        }}
                        className={`mt-1 ${inputCls}`}
                        placeholder="Đúng đoạn văn cần gắn (vd: quỹ đạo elip)"
                      />
                    </label>
                    <label className="flex-1 min-w-[120px] text-[10px] text-slate-400">
                      Concept
                      <select
                        value={row.conceptId}
                        onChange={(e) => {
                          const next = [...(activeLesson.conceptAnchors ?? [])] as LessonConceptAnchor[]
                          next[idx] = { ...next[idx], conceptId: e.target.value }
                          patchLesson({ conceptAnchors: next })
                        }}
                        className={`mt-1 ${inputCls}`}
                      >
                        <option value="">— Chọn —</option>
                        {selectedConcepts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.id} — {c.title || c.id}
                          </option>
                        ))}
                        {!selectedConcepts.some((c) => c.id === row.conceptId) && row.conceptId ? (
                          <option value={row.conceptId}>{row.conceptId} — (chưa add vào bài)</option>
                        ) : null}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = (activeLesson.conceptAnchors ?? []).filter((_, i) => i !== idx)
                        patchLesson({ conceptAnchors: next })
                      }}
                      className="rounded-lg border border-red-500/30 px-2 py-1.5 text-[10px] text-red-300 hover:bg-red-500/10"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const first = selectedConcepts[0]?.id ?? ''
                    patchLesson({
                      conceptAnchors: [
                        ...(activeLesson.conceptAnchors ?? []),
                        { conceptId: first, phrase: '' },
                      ],
                    })
                  }}
                  disabled={selectedConcepts.length === 0}
                  className="text-xs text-violet-300 hover:text-violet-100 border border-violet-500/30 rounded-lg px-3 py-1.5"
                >
                  + Thêm cụm gắn concept
                </button>
                {selectedConcepts.length === 0 ? (
                  <p className="text-[11px] text-amber-300">Hãy add concept vào bài trước khi gắn highlight.</p>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ position: 'relative', background: 'rgba(3,7,14,0.95)', border: '1px solid rgba(109,255,176,0.2)', clipPath: 'polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0% 100%,0% 12px)', padding: 16 }}>
        <SCorner color="#6dffb0" size={10} thick={1} />
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.2em', color: '#6dffb0', textTransform: 'uppercase' as const, marginBottom: 12 }}>
          // concept checklist
        </div>
        <div className="space-y-2 text-[11px] text-slate-300">
          <p>
            Budget tầng <span className="text-emerald-200 font-semibold">{DEPTH_META[depth].labelVi}</span>:{' '}
            <span className="font-semibold">{conceptChecklist.selectedCount}</span>/{depthBudget} concept
            {conceptChecklist.overBudget > 0 ? (
              <span className="ml-2 text-amber-300">(+{conceptChecklist.overBudget} quá tải)</span>
            ) : (
              <span className="ml-2 text-emerald-300">OK</span>
            )}
          </p>
          {conceptChecklist.missingConceptIds.length > 0 && (
            <p className="text-amber-300">
              Concept id không còn trong library: {conceptChecklist.missingConceptIds.join(', ')}
            </p>
          )}
          {conceptChecklist.missingAnchorIds.length > 0 ? (
            <p className="text-amber-200">
              Chưa có anchor phrase cho: {conceptChecklist.missingAnchorIds.slice(0, 6).join(', ')}
              {conceptChecklist.missingAnchorIds.length > 6 ? '…' : ''}
            </p>
          ) : (
            <p className="text-emerald-300">Tất cả concept đã có anchor phrase.</p>
          )}
          {conceptChecklist.missingPrerequisites.length > 0 ? (
            <div className="rounded border border-amber-400/30 bg-amber-500/10 px-2 py-1.5">
              <p className="text-amber-200 mb-1">Thiếu prerequisite:</p>
              <div className="space-y-1">
                {conceptChecklist.missingPrerequisites.slice(0, 4).map((row) => (
                  <p key={`${row.conceptId}-${row.prereqId}`} className="text-amber-100/90">
                    {row.conceptId} cần {row.prereqId}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-emerald-300">Prerequisite nhất quán.</p>
          )}
          {conceptChecklist.overBudget > 0 && conceptChecklist.removalCandidates.length > 0 && (
            <div className="rounded border border-white/15 bg-black/25 px-2 py-1.5">
              <p className="text-slate-300 mb-1">Gợi ý bỏ trước (ít liên kết/anchor):</p>
              <div className="flex flex-wrap gap-1.5">
                {conceptChecklist.removalCandidates.map((id) => (
                  <button
                    key={`drop-${id}`}
                    type="button"
                    onClick={() =>
                      patchLesson({ conceptIds: selectedConceptIds.filter((x) => x !== id) })
                    }
                    className="rounded-full border border-red-400/35 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-500/20"
                  >
                    Bỏ {id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', background: 'rgba(3,7,14,0.95)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.5)' }}>
          <button
            type="button"
            onClick={() => setEditorTab('blocks')}
            style={{
              padding: '5px 14px',
              clipPath: 'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
              background: editorTab === 'blocks' ? 'rgba(126,231,255,0.12)' : 'transparent',
              border: editorTab === 'blocks' ? '1px solid rgba(126,231,255,0.45)' : '1px solid rgba(255,255,255,0.07)',
              color: editorTab === 'blocks' ? '#7ee7ff' : '#4a5568',
              fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.08em',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            Blocks ({sections.length})
          </button>
          <button
            type="button"
            onClick={() => setEditorTab('preview')}
            style={{
              padding: '5px 14px',
              clipPath: 'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
              background: editorTab === 'preview' ? 'rgba(109,255,176,0.1)' : 'transparent',
              border: editorTab === 'preview' ? '1px solid rgba(109,255,176,0.45)' : '1px solid rgba(255,255,255,0.07)',
              color: editorTab === 'preview' ? '#6dffb0' : '#4a5568',
              fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.08em',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setEditorTab('lesson-page')}
            style={{
              padding: '5px 14px',
              clipPath: 'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
              background: editorTab === 'lesson-page' ? 'rgba(139,92,246,0.12)' : 'transparent',
              border: editorTab === 'lesson-page' ? '1px solid rgba(139,92,246,0.45)' : '1px solid rgba(255,255,255,0.07)',
              color: editorTab === 'lesson-page' ? '#c4b5fd' : '#4a5568',
              fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.08em',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            Full Lesson Page
          </button>
        </div>

        {editorTab === 'blocks' && (
          <div className="p-4">
            <div className="space-y-3 min-w-0">
              {sections.map((sec, bi) => (
                <div
                  key={bi}
                  id={`lp-studio-block-${bi}`}
                  className="rounded-2xl border border-white/10 bg-[#0a0f17]/80 p-4 space-y-3 group/block relative scroll-mt-24"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-600 w-5 text-right">{bi + 1}</span>
                      <div className="h-3 w-px bg-white/10" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => moveSection(bi, bi - 1)}
                        disabled={bi === 0}
                        className="text-[10px] text-slate-600 hover:text-white disabled:opacity-20 px-1"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(bi, bi + 1)}
                        disabled={bi === sections.length - 1}
                        className="text-[10px] text-slate-600 hover:text-white disabled:opacity-20 px-1"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const s = [...sections]
                          s.splice(bi + 1, 0, cloneJson(s[bi]))
                          patchLesson({ sections: s })
                        }}
                        className="text-[10px] text-slate-600 hover:text-cyan-300 px-1"
                        title="Nhân đôi block"
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const s = [...sections]
                          s.splice(bi, 1)
                          patchLesson({ sections: s })
                        }}
                        className="text-[10px] text-red-500/50 hover:text-red-400 px-1"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <BlockEditor
                    section={sec}
                    onChange={(updated) => {
                      const s = [...sections]
                      s[bi] = updated
                      patchLesson({ sections: s })
                    }}
                  />
                </div>
              ))}
              <BlockPalette onAdd={(sec) => patchLesson({ sections: [...sections, sec] })} />
            </div>
            <aside className="hidden xl:block fixed right-4 top-24 w-[300px] z-30">
                <div style={{ position: 'relative', background: 'rgba(4,8,18,0.97)', border: '1px solid rgba(126,231,255,0.14)', clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)', padding: 12, backdropFilter: 'blur(12px)' }}>
                  <SCorner color="#7ee7ff" size={8} thick={1} />
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.2em', color: '#7ee7ff', textTransform: 'uppercase', marginBottom: 10 }}>// toc · lesson view</div>
                  <div className="space-y-1.5 max-h-[65vh] overflow-y-auto pr-1">
                    {tocGroups.map((group) => {
                      return (
                        <div key={`studio-toc-${group.parent.id}`} className="space-y-1">
                          <button
                            type="button"
                            onClick={() =>
                              document.getElementById(group.parent.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }
                            className="w-full text-left rounded-md px-2.5 py-2 text-xs transition-colors border border-transparent text-slate-300 hover:bg-white/5 hover:border-cyan-500/30"
                          >
                            {group.parent.title}
                          </button>
                          {group.children.length > 0 ? (
                            <div className="ml-2 pl-2 border-l border-white/10 space-y-1">
                              {group.children.map((child) => (
                                <button
                                  key={child.id}
                                  type="button"
                                  onClick={() =>
                                    document.getElementById(child.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                  }
                                  className="w-full text-left rounded-md px-2 py-1 text-[11px] transition-colors text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent hover:border-cyan-500/20"
                                >
                                  {child.title}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
            </aside>
          </div>
        )}

        {editorTab === 'preview' && (
          <div style={{ borderTop: '1px solid rgba(109,255,176,0.12)', background: '#020a06' }}>
            <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(109,255,176,0.1)', background: 'rgba(109,255,176,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6dffb0', boxShadow: '0 0 6px #6dffb0', animation: 'studio-pulse 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.14em', color: '#6dffb0', textTransform: 'uppercase' }}>// preview · như học viên thấy</span>
            </div>
            <div className="p-5 max-w-4xl mx-auto">
              <LessonPreview
                lesson={previewLesson}
                conceptAnchors={activeLesson.conceptAnchors}
                concepts={concepts}
              />
            </div>
          </div>
        )}

        {editorTab === 'lesson-page' && (
          <div style={{ borderTop: '1px solid rgba(139,92,246,0.12)', background: '#030208' }}>
            <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(139,92,246,0.1)', background: 'rgba(139,92,246,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#c4b5fd', boxShadow: '0 0 6px #c4b5fd', animation: 'studio-pulse 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.14em', color: '#c4b5fd', textTransform: 'uppercase' }}>// full lesson · render cục bộ</span>
            </div>
            <div className="p-4 md:p-6" style={{ background: '#02040a' }}>
              <div className="max-w-3xl mx-auto space-y-4">
                <div style={{ position: 'relative', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(7,11,20,0.9)', padding: '16px 20px', clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)' }}>
                  <SCorner color="#7ee7ff" size={8} thick={1} />
                  <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.18em', color: '#3a4a6a', textTransform: 'uppercase', marginBottom: 8 }}>
                    // learning path · studio preview
                  </p>
                  <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, color: '#eaf6ff' }}>{activeLesson.titleVi}</h2>
                  {activeLesson.title ? <p className="text-slate-500 text-sm mt-1">{activeLesson.title}</p> : null}
                </div>
                <LessonPreview
                  lesson={previewLesson}
                  conceptAnchors={activeLesson.conceptAnchors}
                  concepts={concepts}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudioLearningPathPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [modules, setModules] = useState<LearningModule[]>([])
  const [concepts, setConcepts] = useState<LearningConcept[]>([])
  const [taxonomyRegistry, setTaxonomyRegistry] = useState<TaxonomyRegistry>(FALLBACK_TAXONOMY_REGISTRY)
  const [published, setPublished] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [editorTab, setEditorTab] = useState<'blocks' | 'preview' | 'lesson-page'>('blocks')

  /** Điều hướng phân cấp */
  const [moduleId, setModuleId] = useState<string | null>(null)
  const [nodeId, setNodeId] = useState<string | null>(null)
  const [depth, setDepth] = useState<DepthLevel | null>(null)
  /** Chỉ một bài được mở form chi tiết */
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const [invalidConceptIds, setInvalidConceptIds] = useState<string[]>([])
  const [dragOverModuleId, setDragOverModuleId] = useState<string | null>(null)

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/studio/learning-path')
    if (checked && user && user.role !== 'teacher' && user.role !== 'admin') router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
    if (!token) {
      setLoading(false)
      return
    }
    Promise.all([fetchEditorLearningPath(token), fetchEditorConcepts(token), fetchTaxonomyRegistryEditor(token)])
      .then(([d, cs, tx]) => {
        if (!d) return
        setModules(d.modules || [])
        setConcepts(cs || [])
        if (tx) setTaxonomyRegistry(tx)
        setPublished(d.published)

        // Preserve current editing selection when data refreshes (e.g. tab blur/focus auth refresh).
        if (!d.modules?.length) return
        const sorted = [...d.modules].sort((a, b) => a.order - b.order)
        const hasModule = moduleId && sorted.some((m) => m.id === moduleId)
        const selectedModule = hasModule
          ? sorted.find((m) => m.id === moduleId) || sorted[0]
          : sorted[0]
        const hasNode = nodeId && selectedModule.nodes.some((n) => n.id === nodeId)
        const selectedNode = hasNode
          ? selectedModule.nodes.find((n) => n.id === nodeId) || selectedModule.nodes[0]
          : selectedModule.nodes[0]
        const selectedDepth =
          depth && selectedNode?.depths?.[depth] ? depth : DEPTH_ORDER.find((dep) => (selectedNode?.depths[dep]?.length ?? 0) > 0) ?? 'beginner'
        const hasLesson =
          activeLessonId &&
          (selectedNode?.depths?.[selectedDepth] || []).some((l) => l.id === activeLessonId)
        const selectedLessonId = hasLesson
          ? activeLessonId
          : selectedNode?.depths?.[selectedDepth]?.[0]?.id ?? null

        setModuleId(selectedModule?.id ?? null)
        setNodeId(selectedNode?.id ?? null)
        setDepth(selectedDepth)
        setActiveLessonId(selectedLessonId)
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  const sortedModules = useMemo(
    () => [...modules].sort((a, b) => a.order - b.order),
    [modules],
  )

  const currentModule = useMemo(
    () => sortedModules.find((m) => m.id === moduleId) ?? null,
    [sortedModules, moduleId],
  )

  const currentNode = useMemo(
    () => currentModule?.nodes.find((n) => n.id === nodeId) ?? null,
    [currentModule, nodeId],
  )

  const conceptUsage = useMemo(() => buildConceptUsage(modules), [modules])
  const conceptUsageById = useMemo(() => {
    const map = new Map<string, ConceptUsageItem[]>()
    for (const row of conceptUsage) {
      if (!map.has(row.conceptId)) map.set(row.conceptId, [])
      map.get(row.conceptId)?.push(row)
    }
    return map
  }, [conceptUsage])

  const lessonsAtDepth = useMemo(() => {
    if (!currentNode || !depth) return []
    return currentNode.depths[depth] ?? []
  }, [currentNode, depth])

  const activeLesson = useMemo(
    () => lessonsAtDepth.find((l) => l.id === activeLessonId) ?? null,
    [lessonsAtDepth, activeLessonId],
  )

  /** Giữ bài đang chọn khớp danh sách khi đổi tầng/node */
  useEffect(() => {
    if (lessonsAtDepth.length === 0) {
      setActiveLessonId(null)
      return
    }
    setActiveLessonId((prev) =>
      prev && lessonsAtDepth.some((l) => l.id === prev) ? prev : lessonsAtDepth[0].id,
    )
  }, [lessonsAtDepth])

  /** Khi đổi module: chọn node & depth hợp lệ đầu tiên */
  const onSelectModule = (id: string) => {
    setModuleId(id)
    const mod = sortedModules.find((m) => m.id === id)
    const n = mod?.nodes[0]
    setNodeId(n?.id ?? null)
    if (!n) {
      setDepth(null)
      setActiveLessonId(null)
      return
    }
    const dep = DEPTH_ORDER.find((d) => (n.depths[d]?.length ?? 0) > 0) ?? 'beginner'
    setDepth(dep)
    setActiveLessonId(n.depths[dep]?.[0]?.id ?? null)
  }

  const onSelectNode = (nid: string) => {
    setNodeId(nid)
    const n = currentModule?.nodes.find((x) => x.id === nid)
    if (!n) {
      setActiveLessonId(null)
      return
    }
    const dep = DEPTH_ORDER.find((d) => (n.depths[d]?.length ?? 0) > 0) ?? depth ?? 'beginner'
    setDepth(dep)
    setActiveLessonId(n.depths[dep]?.[0]?.id ?? null)
  }

  const onSelectDepth = (d: DepthLevel) => {
    setDepth(d)
    const n = currentNode
    setActiveLessonId(n?.depths[d]?.[0]?.id ?? null)
  }

  /** Khi xóa module / tải lại, moduleId có thể không còn — chọn lại module đầu; khi rỗng thì reset. */
  useEffect(() => {
    if (loading) return
    if (modules.length === 0) {
      setModuleId(null)
      setNodeId(null)
      setDepth(null)
      setActiveLessonId(null)
      return
    }
    if (moduleId && sortedModules.some((m) => m.id === moduleId)) return
    const first = sortedModules[0]
    const n0 = first.nodes[0]
    setModuleId(first.id)
    if (n0) {
      setNodeId(n0.id)
      const dep = DEPTH_ORDER.find((d) => (n0.depths[d]?.length ?? 0) > 0) ?? 'beginner'
      setDepth(dep)
      setActiveLessonId(n0.depths[dep]?.[0]?.id ?? null)
    } else {
      setNodeId(null)
      setDepth(null)
      setActiveLessonId(null)
    }
  }, [loading, modules, moduleId, sortedModules])

  const addFirstModule = () => {
    const m = createEmptyModule(1)
    setModules([m])
    setModuleId(m.id)
    setNodeId(m.nodes[0]?.id ?? null)
    setDepth('beginner')
    setActiveLessonId(m.nodes[0]?.depths.beginner?.[0]?.id ?? null)
  }

  const appendModule = () => {
    setModules((prev) => {
      const maxOrder = prev.reduce((acc, x) => Math.max(acc, x.order), 0)
      const m = createEmptyModule(maxOrder + 1)
      queueMicrotask(() => {
        setModuleId(m.id)
        const nn = m.nodes[0]
        if (nn) {
          setNodeId(nn.id)
          const dep = DEPTH_ORDER.find((d) => (nn.depths[d]?.length ?? 0) > 0) ?? 'beginner'
          setDepth(dep)
          setActiveLessonId(nn.depths[dep]?.[0]?.id ?? null)
        }
      })
      return [...prev, m]
    })
  }

  const removeCurrentModule = () => {
    if (!currentModule) return
    if (!confirm(`Xóa module "${currentModule.titleVi}" và toàn bộ chủ đề / bài bên trong?`)) return
    const mid = currentModule.id
    setModules((prev) => {
      const next = renumberModuleOrders(prev.filter((x) => x.id !== mid))
      queueMicrotask(() => {
        if (next.length === 0) {
          setModuleId(null)
          setNodeId(null)
          setDepth(null)
          setActiveLessonId(null)
        } else if (moduleId === mid) {
          const nm = next[0]
          setModuleId(nm.id)
          const n0 = nm.nodes[0]
          if (n0) {
            setNodeId(n0.id)
            const dep = DEPTH_ORDER.find((d) => (n0.depths[d]?.length ?? 0) > 0) ?? 'beginner'
            setDepth(dep)
            setActiveLessonId(n0.depths[dep]?.[0]?.id ?? null)
          } else {
            setNodeId(null)
            setDepth(null)
            setActiveLessonId(null)
          }
        }
      })
      return next
    })
  }

  const appendNode = () => {
    if (!currentModule) return
    const mid = currentModule.id
    const node = createEmptyNode(mid, 'Chủ đề mới')
    node.depths.beginner = [createEmptyLessonItem(mid, node.id, 'beginner')]
    setModules((prev) => {
      const mod = prev.find((x) => x.id === mid)
      if (!mod) return prev
      return updateModuleFields(prev, mid, { nodes: [...mod.nodes, node] })
    })
    setNodeId(node.id)
    setDepth('beginner')
    setActiveLessonId(node.depths.beginner[0]?.id ?? null)
  }

  const removeCurrentNode = () => {
    if (!currentModule || !currentNode) return
    if (currentModule.nodes.length <= 1) {
      alert('Mỗi module cần ít nhất một chủ đề. Thêm chủ đề mới trước khi xóa cái này.')
      return
    }
    if (!confirm(`Xóa chủ đề "${currentNode.titleVi}" và mọi bài trong 3 tầng?`)) return
    const mid = currentModule.id
    const nid = currentNode.id
    const remaining = currentModule.nodes.filter((n) => n.id !== nid)
    const pick = remaining[0]
    setModules((prev) =>
      prev.map((m) => (m.id === mid ? { ...m, nodes: m.nodes.filter((n) => n.id !== nid) } : m)),
    )
    if (pick) {
      setNodeId(pick.id)
      const dep = DEPTH_ORDER.find((d) => (pick.depths[d]?.length ?? 0) > 0) ?? 'beginner'
      setDepth(dep)
      setActiveLessonId(pick.depths[dep]?.[0]?.id ?? null)
    }
  }

  const appendLesson = () => {
    if (!currentModule || !currentNode || !depth) return
    const lesson = createEmptyLessonItem(currentModule.id, currentNode.id, depth)
    setModules((prev) =>
      updateLessonList(prev, currentModule.id, currentNode.id, depth, (list) => [...list, lesson]),
    )
    setActiveLessonId(lesson.id)
  }

  const removeCurrentLesson = () => {
    if (!currentModule || !currentNode || !depth || !activeLesson) return
    if (!confirm(`Xóa bài "${activeLesson.titleVi}"?`)) return
    const lid = activeLesson.id
    setModules((prev) =>
      updateLessonList(prev, currentModule.id, currentNode.id, depth, (list) => list.filter((l) => l.id !== lid)),
    )
  }

  const moveLessonBy = (lessonId: string, delta: number) => {
    if (!currentModule || !currentNode || !depth || !delta) return
    setModules((prev) =>
      updateLessonList(prev, currentModule.id, currentNode.id, depth, (list) => {
        const from = list.findIndex((l) => l.id === lessonId)
        if (from < 0) return list
        const to = from + delta
        if (to < 0 || to >= list.length) return list
        const next = [...list]
        const [picked] = next.splice(from, 1)
        next.splice(to, 0, picked)
        return next
      }),
    )
    setActiveLessonId(lessonId)
  }

  const moveModuleUp = (mid: string) => {
    setModules((prev) => moveModuleStep(prev, mid, -1))
  }

  const moveModuleDown = (mid: string) => {
    setModules((prev) => moveModuleStep(prev, mid, 1))
  }

  const duplicateModuleAt = (mid: string) => {
    const orig = sortedModules.find((m) => m.id === mid)
    if (!orig) return
    const copy = duplicateLearningModule(orig)
    setModules((prev) => insertModuleCloneAfter(prev, mid, copy))
    queueMicrotask(() => onSelectModule(copy.id))
  }

  const save = useCallback(async () => {
    const token = localStorage.getItem('galaxies_token')
    if (!token) return
    setSaving(true)
    setMessage('')
    const rPath = await saveEditorLearningPath(token, modules, published)
    setSaving(false)
    if (rPath.ok && rPath.modules) {
      setModules(rPath.modules)
      if (typeof rPath.published === 'boolean') setPublished(rPath.published)
      setInvalidConceptIds(rPath.invalidConceptIds || [])
    }
    setMessage(rPath.ok ? 'Đã lưu Learning Path.' : rPath.error || 'Lỗi lưu')
  }, [modules, published])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isSaveShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'
      if (!isSaveShortcut) return
      e.preventDefault()
      if (loading || saving) return
      void save()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [loading, save, saving])

  if (!checked || !user) {
    return (
      <div style={{ minHeight: '100vh', background: '#03060f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.2em', color: '#3a4a6a', textTransform: 'uppercase', animation: 'studio-pulse 2s infinite' }}>
          // đang kiểm tra đăng nhập...
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#03060f', position: 'relative', overflow: 'hidden', fontFamily: "'Space Grotesk',sans-serif" }}>

      {/* ── Animations ── */}
      <style>{`
        @keyframes studio-scan   { from { transform: translateY(-4px) } to { transform: translateY(100vh) } }
        @keyframes studio-pulse  { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }
        .studio-mod-item { transition: background 0.2s, border-color 0.2s; }
        .studio-btn-amber { transition: box-shadow 0.2s, transform 0.15s; }
        .studio-btn-amber:hover { box-shadow: 0 0 20px rgba(245,165,36,0.5) !important; transform: translateY(-1px); }
        .studio-btn-ghost { transition: background 0.2s, border-color 0.2s, box-shadow 0.2s; }
        .studio-btn-ghost:hover { background: rgba(126,231,255,0.08) !important; border-color: rgba(126,231,255,0.5) !important; box-shadow: 0 0 12px rgba(126,231,255,0.2) !important; }
        .studio-mod-sel-item { transition: background 0.2s, border-color 0.2s, box-shadow 0.2s; }
        .studio-mod-sel-item:hover { border-color: rgba(126,231,255,0.4) !important; background: rgba(126,231,255,0.06) !important; }
        .studio-lesson-btn { transition: background 0.2s, border-color 0.2s; }
        .studio-lesson-btn:hover { background: rgba(126,231,255,0.06) !important; }
        @media (max-width: 1100px) { .studio-edge { display: none !important; } }
      `}</style>

      {/* ── Starfield ── */}
      <svg aria-hidden style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
        {STUDIO_STARS.map((s, i) => (
          <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill={s.c} opacity={s.o}>
            <animate attributeName="opacity" values={`${s.o.toFixed(2)};${(s.o * 0.2).toFixed(2)};${s.o.toFixed(2)}`} dur={`${s.d.toFixed(1)}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>

      {/* ── Grid overlay ── */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)',
        backgroundSize: '80px 80px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 10%,transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 10%,transparent 100%)',
      }} />

      {/* ── Scanline ── */}
      <div aria-hidden style={{
        position: 'fixed', left: 0, right: 0, top: 0, height: 2,
        background: 'linear-gradient(90deg,transparent,#7ee7ff,transparent)',
        boxShadow: '0 0 8px #7ee7ff', opacity: 0.4,
        animation: 'studio-scan 14s linear infinite',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* ── Ambient glow ── */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 50% 30% at 5% 70%,rgba(245,165,36,0.04) 0%,transparent 60%),radial-gradient(ellipse 50% 30% at 95% 30%,rgba(126,231,255,0.04) 0%,transparent 60%)',
      }} />

      {/* ── Edge labels ── */}
      <div className="studio-edge" style={{ position: 'fixed', left: 6, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#1e2d40', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          COSMOLEARN · STUDIO · LEARNING PATH EDITOR
        </span>
      </div>
      <div className="studio-edge" style={{ position: 'fixed', right: 6, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <span style={{ writingMode: 'vertical-rl', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#1e2d40', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          CTRL+S TO SAVE · MODULE / NODE / DEPTH / LESSON
        </span>
      </div>

      {/* ── Main content ── */}
      <div style={{ position: 'relative', zIndex: 10, paddingTop: 72, paddingBottom: 40, paddingLeft: 'clamp(16px,3vw,24px)', paddingRight: 'clamp(16px,3vw,24px)', maxWidth: 1440, margin: '0 auto' }}>
        <nav className="text-sm shrink-0 mb-4">
          <Link href="/studio" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.12em', color: '#7ee7ff', textDecoration: 'none', textTransform: 'uppercase' }}>
            ← Studio
          </Link>
        </nav>

        {/* ── Header ── */}
        <header style={{ position: 'relative', background: 'linear-gradient(120deg,rgba(126,231,255,0.05) 0%,rgba(6,9,26,0.96) 50%,rgba(3,6,15,0.97) 100%)', border: '1px solid rgba(126,231,255,0.2)', clipPath: 'polygon(18px 0%,100% 0%,100% calc(100% - 18px),calc(100% - 18px) 100%,0% 100%,0% 18px)', padding: '20px 28px', marginBottom: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <SCorner color="#7ee7ff" size={14} thick={1.5} />
          {/* Left accent bar */}
          <span aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg,transparent 0%,#7ee7ff 38%,#7ee7ff 62%,transparent 100%)', boxShadow: '2px 0 10px rgba(126,231,255,0.45)' }} />
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.22em', color: '#7ee7ff', textTransform: 'uppercase', marginBottom: 10 }}>
              // learning path · studio editor
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(20px,3vw,28px)', fontWeight: 600, color: '#eaf6ff', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, lineHeight: 1.1 }}>
              <ListTree style={{ width: 24, height: 24, color: '#7ee7ff', flexShrink: 0 }} />
              Learning <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#f5a524' }}>Path</em> Studio
            </h1>
            <p style={{ fontSize: 12, color: '#9aa8c4', maxWidth: 520, lineHeight: 1.6, margin: 0 }}>
              Tạo mới module / chủ đề / bài, hoặc chọn{' '}
              <span style={{ color: '#eaf6ff' }}>Module → Chủ đề → Tầng → Bài</span> để soạn. Nội dung dùng{' '}
              <span style={{ color: '#7ee7ff' }}>cùng block kit với khóa học</span>.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.12em', color: '#9aa8c4', textTransform: 'uppercase' }}>
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="rounded border-white/20"
              />
              Published
            </label>
            <button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className="studio-btn-amber"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 22px',
                clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
                background: saving || loading ? 'rgba(245,165,36,0.4)' : '#f5a524',
                color: '#1a0e00', border: 'none', cursor: saving || loading ? 'not-allowed' : 'pointer',
                fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
                boxShadow: '0 0 16px rgba(245,165,36,0.35)',
              }}
            >
              <Save style={{ width: 14, height: 14 }} />
              {saving ? 'ĐANG LƯU...' : 'LƯU TOÀN BỘ'}
            </button>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#3a4a6a', textTransform: 'uppercase' }}>Ctrl+S</span>
            <Link
              href="/tutorial"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.1em', color: '#7ee7ff', textDecoration: 'none', textTransform: 'uppercase' }}
            >
              Xem học viên →
            </Link>
          </div>
        </header>
        {message ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(109,255,176,0.07)', border: '1px solid rgba(109,255,176,0.25)', clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6dffb0', flexShrink: 0 }} />
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#6dffb0', letterSpacing: '0.08em', margin: 0 }}>{message}</p>
          </div>
        ) : null}
        {invalidConceptIds.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(245,165,36,0.07)', border: '1px solid rgba(245,165,36,0.25)', clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f5a524', flexShrink: 0 }} />
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#f5a524', letterSpacing: '0.08em', margin: 0 }}>
              Đã loại bỏ concept không tồn tại: <span style={{ color: '#ffd27a' }}>{invalidConceptIds.join(', ')}</span>
            </p>
          </div>
        ) : null}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.2em', color: '#3a4a6a', textTransform: 'uppercase', animation: 'studio-pulse 2s infinite' }}>
              // đang tải...
            </div>
          </div>
        ) : modules.length === 0 ? (
          <div style={{ position: 'relative', border: '1px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', clipPath: 'polygon(18px 0%,100% 0%,100% calc(100% - 18px),calc(100% - 18px) 100%,0% 100%,0% 18px)', padding: '48px 32px', textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
            <SCorner color="#7ee7ff" size={14} thick={1} />
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.2em', color: '#7ee7ff', textTransform: 'uppercase', marginBottom: 16 }}>
              // empty · no modules
            </div>
            <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 500, color: '#eaf6ff', marginBottom: 8 }}>Chưa có module nào trong Learning Path.</p>
            <p style={{ fontSize: 12, color: '#9aa8c4', lineHeight: 1.6, marginBottom: 28 }}>
              Tạo module đầu tiên (có sẵn một chủ đề và một bài Cơ bản để bạn soạn), sau đó bấm &quot;Lưu toàn bộ&quot; để ghi lên server.
            </p>
            <button
              type="button"
              onClick={addFirstModule}
              className="studio-btn-amber"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 28px',
                clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
                background: '#f5a524', color: '#1a0e00', border: 'none', cursor: 'pointer',
                fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
                boxShadow: '0 0 16px rgba(245,165,36,0.35)',
              }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              TẠO MODULE ĐẦU TIÊN
            </button>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#263042', marginTop: 24, letterSpacing: '0.1em' }}>
              Hoặc seed từ <span style={{ color: '#4a5568' }}>learningPathDefault.json</span> rồi tải lại.
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-stretch min-h-[calc(100vh-12rem)]">
            {/* Cột trái: 3 bước điều hướng */}
            <aside className="w-full lg:w-[300px] shrink-0 flex flex-col gap-4">
              <section style={{ position: 'relative', background: 'rgba(4,8,18,0.95)', border: '1px solid rgba(126,231,255,0.15)', clipPath: 'polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0% 100%,0% 12px)', padding: 16 }}>
                <SCorner color="#7ee7ff" size={10} thick={1} />
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.22em', color: '#7ee7ff', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Layers style={{ width: 12, height: 12 }} />
                  // 01 · modules
                </div>
                <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#263042', letterSpacing: '0.1em', marginBottom: 12, lineHeight: 1.5 }}>
                  kéo thả · ↑↓ đổi chỗ · copy nhân đôi
                </p>
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {sortedModules.map((m, mi) => (
                    <div
                      key={m.id}
                      className="studio-mod-item"
                      style={{
                        display: 'flex', alignItems: 'stretch', gap: 2,
                        border: moduleId === m.id
                          ? '1px solid rgba(126,231,255,0.5)'
                          : dragOverModuleId === m.id
                            ? '1px solid rgba(126,231,255,0.4)'
                            : '1px solid rgba(255,255,255,0.07)',
                        background: moduleId === m.id
                          ? 'rgba(126,231,255,0.1)'
                          : dragOverModuleId === m.id
                            ? 'rgba(126,231,255,0.07)'
                            : 'rgba(0,0,0,0.3)',
                        clipPath: 'polygon(8px 0%,100% 0%,100% calc(100% - 8px),calc(100% - 8px) 100%,0% 100%,0% 8px)',
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        setDragOverModuleId(m.id)
                      }}
                      onDragLeave={(e) => {
                        const rel = e.relatedTarget as Node | null
                        if (rel && e.currentTarget.contains(rel)) return
                        setDragOverModuleId(null)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const from = e.dataTransfer.getData('text/plain')
                        setDragOverModuleId(null)
                        if (!from || from === m.id) return
                        setModules((prev) => reorderModulesDragDrop(prev, from, m.id))
                      }}
                    >
                      <button
                        type="button"
                        aria-label="Kéo để đổi thứ tự module"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', m.id)
                          e.dataTransfer.effectAllowed = 'move'
                          setDragOverModuleId(null)
                        }}
                        onDragEnd={() => setDragOverModuleId(null)}
                        className="shrink-0 flex items-center px-1 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing rounded-lg hover:bg-white/5 border-0 bg-transparent"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectModule(m.id)}
                        className={`flex-1 min-w-0 text-left rounded-lg px-2 py-2 text-sm transition-colors ${
                          moduleId === m.id ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="mr-1">{m.emoji}</span>
                        <span className="font-medium line-clamp-2">{m.titleVi}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          #{m.order} · {m.id}
                        </span>
                      </button>
                      <div className="flex flex-col justify-center gap-0.5 shrink-0 py-1 pr-1">
                        <button
                          type="button"
                          aria-label="Lên"
                          disabled={mi === 0}
                          onClick={(e) => {
                            e.stopPropagation()
                            moveModuleUp(m.id)
                          }}
                          className="rounded p-0.5 text-slate-500 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Xuống"
                          disabled={mi === sortedModules.length - 1}
                          onClick={(e) => {
                            e.stopPropagation()
                            moveModuleDown(m.id)
                          }}
                          className="rounded p-0.5 text-slate-500 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Nhân đôi module"
                          onClick={(e) => {
                            e.stopPropagation()
                            duplicateModuleAt(m.id)
                          }}
                          className="rounded p-0.5 text-slate-500 hover:text-cyan-300 hover:bg-cyan-500/15"
                          title="Nhân đôi (id & nội dung mới)"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={appendModule}
                  className="studio-btn-ghost"
                  style={{
                    marginTop: 10, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px 0',
                    clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
                    background: 'rgba(126,231,255,0.05)', border: '1px solid rgba(126,231,255,0.3)',
                    color: '#7ee7ff', cursor: 'pointer',
                    fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm module
                </button>
                {currentModule && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }} className="space-y-2">
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.2em', color: '#4a5568', textTransform: 'uppercase' }}>// chỉnh module đang chọn</div>
                    <label className="block text-[11px] text-slate-400">
                      Tiêu đề (VI)
                      <input
                        value={currentModule.titleVi}
                        onChange={(e) =>
                          setModules((prev) =>
                            updateModuleFields(prev, currentModule.id, { titleVi: e.target.value }),
                          )
                        }
                        className={`mt-0.5 ${inputCls}`}
                      />
                    </label>
                    <label className="block text-[11px] text-slate-400">
                      Emoji
                      <input
                        value={currentModule.emoji}
                        onChange={(e) =>
                          setModules((prev) =>
                            updateModuleFields(prev, currentModule.id, { emoji: e.target.value }),
                          )
                        }
                        className={`mt-0.5 ${inputCls}`}
                        maxLength={8}
                      />
                    </label>
                    <label className="block text-[11px] text-slate-400">
                      Mục tiêu (VI)
                      <textarea
                        value={currentModule.goalVi}
                        onChange={(e) =>
                          setModules((prev) =>
                            updateModuleFields(prev, currentModule.id, { goalVi: e.target.value }),
                          )
                        }
                        rows={2}
                        className={`mt-0.5 ${inputCls} resize-y min-h-[48px]`}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={removeCurrentModule}
                      style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: 'rgba(252,165,165,0.8)', cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.08em' }}
                    >
                      <Trash2 style={{ width: 12, height: 12 }} />
                      Xóa module này
                    </button>
                  </div>
                )}
              </section>

              <section style={{ position: 'relative', background: 'rgba(4,8,18,0.95)', border: '1px solid rgba(139,92,246,0.18)', clipPath: 'polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0% 100%,0% 12px)', padding: 16 }}>
                <SCorner color="#a78bfa" size={10} thick={1} />
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.22em', color: '#a78bfa', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen style={{ width: 12, height: 12 }} />
                  // 02 · nodes
                </div>
                {!currentModule ? (
                  <p className="text-xs text-slate-600">Chọn module trước.</p>
                ) : (
                  <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
                    {currentModule.nodes.map((n, i) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => onSelectNode(n.id)}
                        className="studio-mod-sel-item"
                        style={{
                          width: '100%', textAlign: 'left', padding: '8px 12px', cursor: 'pointer',
                          clipPath: 'polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px)',
                          background: nodeId === n.id ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.2)',
                          border: nodeId === n.id ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.06)',
                          color: nodeId === n.id ? '#eaf6ff' : '#9aa8c4',
                          fontFamily: "'Space Grotesk',sans-serif", fontSize: 13,
                        }}
                      >
                        <span className="text-slate-500 text-xs mr-1">{i + 1}.</span>
                        {n.titleVi}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={appendNode}
                      className="studio-btn-ghost"
                      style={{
                        marginTop: 8, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px 0',
                        clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
                        background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.3)',
                        color: '#a78bfa', cursor: 'pointer',
                        fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm chủ đề
                    </button>
                    {currentNode && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }} className="space-y-2">
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.2em', color: '#4a5568', textTransform: 'uppercase' }}>// chỉnh chủ đề</div>
                        <label className="block text-[11px] text-slate-400">
                          Tiêu đề (VI)
                          <input
                            value={currentNode.titleVi}
                            onChange={(e) =>
                              setModules((prev) =>
                                updateNodeFields(prev, currentModule.id, currentNode.id, {
                                  titleVi: e.target.value,
                                }),
                              )
                            }
                            className={`mt-0.5 ${inputCls}`}
                          />
                        </label>
                        <label className="block text-[11px] text-slate-400">
                          Title (EN)
                          <input
                            value={currentNode.title}
                            onChange={(e) =>
                              setModules((prev) =>
                                updateNodeFields(prev, currentModule.id, currentNode.id, {
                                  title: e.target.value,
                                }),
                              )
                            }
                            className={`mt-0.5 ${inputCls}`}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={removeCurrentNode}
                          style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: 'rgba(252,165,165,0.8)', cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.08em' }}
                        >
                          <Trash2 style={{ width: 12, height: 12 }} />
                          Xóa chủ đề này
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {currentModule && currentNode && (
                <NodeTopicWeightsEditor
                  topicWeights={currentNode.topicWeights}
                  onChange={(topicWeights: TopicWeight[]) =>
                    setModules((prev) =>
                      updateNodeFields(prev, currentModule.id, currentNode.id, { topicWeights }),
                    )
                  }
                />
              )}

              <section style={{ position: 'relative', background: 'rgba(4,8,18,0.95)', border: '1px solid rgba(126,231,255,0.12)', clipPath: 'polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0% 100%,0% 12px)', padding: 16 }}>
                <SCorner color="#7ee7ff" size={10} thick={1} />
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.22em', color: '#7ee7ff', textTransform: 'uppercase', marginBottom: 8 }}>
                  // concept library
                </div>
                <p style={{ fontSize: 12, color: '#9aa8c4', lineHeight: 1.5, marginBottom: 14 }}>
                  Concept được quản lý ở Studio riêng. Ở đây chỉ dùng để map vào lesson.
                </p>
                <Link
                  href="/studio/concepts"
                  className="studio-btn-ghost"
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '7px 16px',
                    clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
                    background: 'rgba(126,231,255,0.07)', border: '1px solid rgba(126,231,255,0.3)',
                    color: '#7ee7ff', textDecoration: 'none',
                    fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}
                >
                  Mở Concept Studio →
                </Link>
              </section>

              <section style={{ position: 'relative', background: 'rgba(4,8,18,0.95)', border: '1px solid rgba(126,231,255,0.12)', clipPath: 'polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0% 100%,0% 12px)', padding: 16 }}>
                <SCorner color="#7ee7ff" size={10} thick={1} />
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.22em', color: '#7ee7ff', textTransform: 'uppercase', marginBottom: 12 }}>
                  // concept usage report
                </div>
                {concepts.length === 0 ? (
                  <p className="text-xs text-slate-600">Chưa có concept để thống kê.</p>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {concepts.map((c) => {
                      const rows = conceptUsageById.get(c.id) || []
                      return (
                        <details
                          key={`usage-${c.id}`}
                          className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2"
                        >
                          <summary className="cursor-pointer text-xs text-cyan-200">
                            #{c.id} · {c.title || c.id} ({rows.length})
                          </summary>
                          <div className="mt-2 space-y-1">
                            {rows.length === 0 ? (
                              <p className="text-[11px] text-slate-500">Chưa được gắn vào lesson nào.</p>
                            ) : (
                              rows.map((r) => (
                                <p key={`${r.lessonId}-${r.depth}`} className="text-[11px] text-slate-300 leading-snug">
                                  <span className="text-slate-500">{r.moduleTitle}</span> → {r.nodeTitle} →{' '}
                                  <span className="text-cyan-300">{DEPTH_META[r.depth].labelVi}</span> → {r.lessonTitle}
                                </p>
                              ))
                            )}
                          </div>
                        </details>
                      )
                    })}
                  </div>
                )}
              </section>

              <section style={{ position: 'relative', background: 'rgba(4,8,18,0.95)', border: '1px solid rgba(245,165,36,0.18)', clipPath: 'polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0% 100%,0% 12px)', padding: 16 }}>
                <SCorner color="#f5a524" size={10} thick={1} />
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.22em', color: '#f5a524', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles style={{ width: 12, height: 12 }} />
                  // 03 · depth
                </div>
                {!currentNode ? (
                  <p className="text-xs text-slate-600">Chọn chủ đề trước.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {DEPTH_ORDER.map((d) => {
                      const count = currentNode.depths[d]?.length ?? 0
                      const meta = DEPTH_META[d]
                      const isSelected = depth === d
                      const depthColor = d === 'beginner' ? '#f5a524' : d === 'explorer' ? '#7ee7ff' : '#eaf6ff'
                      const depthColorRgb = d === 'beginner' ? '245,165,36' : d === 'explorer' ? '126,231,255' : '234,246,255'
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => onSelectDepth(d)}
                          className="studio-mod-sel-item"
                          style={{
                            padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
                            clipPath: 'polygon(8px 0%,100% 0%,100% calc(100% - 8px),calc(100% - 8px) 100%,0% 100%,0% 8px)',
                            background: isSelected ? `rgba(${depthColorRgb},0.12)` : 'rgba(0,0,0,0.3)',
                            border: isSelected ? `1px solid rgba(${depthColorRgb},0.5)` : '1px solid rgba(255,255,255,0.07)',
                            color: isSelected ? depthColor : '#9aa8c4',
                            boxShadow: isSelected ? `0 0 16px rgba(${depthColorRgb},0.15)` : 'none',
                            fontFamily: "'Space Grotesk',sans-serif", fontSize: 13,
                          }}
                        >
                          <span style={{ marginRight: 6 }}>{meta.short}</span>
                          {meta.labelVi}
                          <span style={{ float: 'right', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.1em', color: isSelected ? depthColor : '#3a4a6a' }}>
                            {count === 0 ? 'no lessons' : `${count} bài`}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
            </aside>

            {/* Cột phải: danh sách bài trong tầng + form một bài */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ background: 'rgba(3,7,14,0.97)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Breadcrumb */}
              <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.4)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#263042', textTransform: 'uppercase' }}>// editing:</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#7ee7ff' }}>{currentModule?.titleVi ?? '—'}</span>
                <ChevronRight style={{ width: 10, height: 10, color: '#263042' }} />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#a78bfa' }}>{currentNode?.titleVi ?? '—'}</span>
                <ChevronRight style={{ width: 10, height: 10, color: '#263042' }} />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#eaf6ff' }}>
                  {depth ? `${DEPTH_META[depth].short} ${DEPTH_META[depth].labelVi}` : '—'}
                </span>
              </div>

              <div className="flex flex-col xl:flex-row flex-1 min-h-0">
                {/* Danh sách bài (chỉ tiêu đề) */}
                <div className="w-full xl:w-[200px] 2xl:w-[220px] shrink-0 border-b xl:border-b-0 xl:border-r border-white/10 p-3 max-h-[40vh] xl:max-h-none overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.2em', color: '#4a5568', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>// 04 · lessons</div>
                  {lessonsAtDepth.length === 0 ? (
                    <div className="px-2 space-y-2">
                      <p className="text-xs text-slate-600">Chưa có bài ở tầng này.</p>
                      {currentModule && currentNode && depth ? (
                        <button
                          type="button"
                          onClick={appendLesson}
                          className="studio-btn-ghost"
                          style={{
                            width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0',
                            clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
                            background: 'rgba(126,231,255,0.05)', border: '1px solid rgba(126,231,255,0.3)',
                            color: '#7ee7ff', cursor: 'pointer',
                            fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                          }}
                        >
                          <Plus style={{ width: 12, height: 12 }} />
                          + Bài đầu tiên
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <ul className="space-y-1">
                        {lessonsAtDepth.map((le, idx) => (
                          <li key={le.id} className="flex items-stretch gap-1">
                            <button
                              type="button"
                              onClick={() => setActiveLessonId(le.id)}
                              className="studio-lesson-btn"
                              style={{
                                minWidth: 0, flex: 1, textAlign: 'left', padding: '8px 10px', cursor: 'pointer',
                                clipPath: 'polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px)',
                                background: activeLessonId === le.id ? 'rgba(126,231,255,0.1)' : 'rgba(0,0,0,0.25)',
                                border: activeLessonId === le.id ? '1px solid rgba(126,231,255,0.4)' : '1px solid rgba(255,255,255,0.06)',
                                color: activeLessonId === le.id ? '#eaf6ff' : '#9aa8c4',
                                fontFamily: "'Space Grotesk',sans-serif", fontSize: 12,
                              }}
                            >
                              <span className="text-slate-600 text-xs mr-1">{idx + 1}.</span>
                              <span className="line-clamp-2">{le.titleVi}</span>
                            </button>
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => moveLessonBy(le.id, -1)}
                                disabled={idx === 0}
                                className="h-6 w-6 inline-flex items-center justify-center rounded border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Đưa lên"
                                aria-label="Đưa bài lên"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveLessonBy(le.id, 1)}
                                disabled={idx === lessonsAtDepth.length - 1}
                                className="h-6 w-6 inline-flex items-center justify-center rounded border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Đưa xuống"
                                aria-label="Đưa bài xuống"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={appendLesson}
                        className="studio-btn-ghost"
                        style={{
                          marginTop: 6, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0',
                          clipPath: 'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)',
                          color: '#9aa8c4', cursor: 'pointer',
                          fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                        }}
                      >
                        <Plus style={{ width: 10, height: 10 }} />
                        + Bài mới
                      </button>
                      {activeLesson ? (
                        <button
                          type="button"
                          onClick={removeCurrentLesson}
                          style={{
                            marginTop: 4, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0',
                            background: 'transparent', border: '1px solid rgba(239,68,68,0.25)',
                            color: 'rgba(252,165,165,0.7)', cursor: 'pointer',
                            fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.08em',
                          }}
                        >
                          <Trash2 style={{ width: 10, height: 10 }} />
                          Xóa bài này
                        </button>
                      ) : null}
                    </>
                  )}
                </div>

                {/* Form chi tiết — một bài (block kit như Course) */}
                <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-[320px]">
                  {!currentModule || !currentNode || !depth || !activeLesson ? (
                    <p className="text-slate-500 text-sm">Chọn đủ Module → Chủ đề → Tầng → Bài để soạn nội dung.</p>
                  ) : (
                    <LearningPathLessonEditor
                      activeLesson={activeLesson}
                      concepts={concepts}
                      taxonomyRegistry={taxonomyRegistry}
                      moduleId={currentModule.id}
                      nodeId={currentNode.id}
                      depth={depth}
                      editorTab={editorTab}
                      setEditorTab={setEditorTab}
                      updateLesson={updateLesson}
                      setModules={setModules}
                      inputCls={inputCls}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
