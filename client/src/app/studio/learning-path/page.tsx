'use client'

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DEPTH_ORDER,
  DEPTH_META,
  LEARNING_MODULES,
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
import {
  fetchEditorLearningPath,
  generateRecallQuizForLesson,
  saveEditorLearningPath,
} from '@/lib/learningPathApi'
import {
  FALLBACK_TAXONOMY_REGISTRY,
  fetchEditorConcepts,
  fetchTaxonomyRegistryEditor,
  type TaxonomyRegistry,
} from '@/lib/conceptsApi'
import type { Lesson, LessonSection } from '@/lib/coursesApi'
import { useAuthStore } from '@/store/useAuthStore'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  GripVertical,
  Layers,
  ClipboardList,
  ListTree,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { NodeTopicWeightsEditor } from '@/components/studio/NodeTopicWeightsEditor'
import { LearningPathRecallQuizEditor } from '@/components/studio/LearningPathRecallQuizEditor'
import { NASA_SHOWCASE_ITEMS } from '@/lib/showcaseEntities'
import { useShowcaseCatalogGen } from '@/components/showcase/ShowcaseCatalogProvider'
import { mergeNasaCatalog, type ResolvedNasaCatalogItem } from '@/lib/mergeShowcaseCatalog'
import { fetchPublicShowcaseEntityContents, type ShowcaseEntityContentDTO } from '@/lib/showcaseEntitiesApi'

const BlockEditor = dynamic(() => import('@/components/studio/BlockEditor'), { ssr: false })
const BlockPalette = dynamic(() => import('@/components/studio/BlockPalette'), { ssr: false })
const LessonPreview = dynamic(() => import('@/components/studio/LessonPreview'), { ssr: false })
const BLOCK_CLIPBOARD_STORAGE_KEY = 'lp_studio_block_clipboard_v1'

function cloneJson<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function safeLower(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : ''
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
  'w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none transition-colors'

function collectLearningPathIssues(modules: LearningModule[]): string[] {
  const issues: string[] = []
  if (modules.length === 0) return ['Chưa có module nào để lưu.']
  for (const module of modules) {
    if (!module.titleVi?.trim()) issues.push(`Module ${module.id}: thiếu tiêu đề tiếng Việt`)
    if (module.nodes.length === 0) issues.push(`Module ${module.id}: chưa có chủ đề`)
    for (const node of module.nodes) {
      if (!node.titleVi?.trim()) issues.push(`Chủ đề ${node.id}: thiếu tiêu đề tiếng Việt`)
      for (const depth of DEPTH_ORDER) {
        const lessons = node.depths[depth] ?? []
        const seenLessonIds = new Set<string>()
        for (const lesson of lessons) {
          if (!lesson.id?.trim()) issues.push(`Bài ở ${node.id}/${depth}: thiếu lesson id`)
          if (!lesson.titleVi?.trim()) issues.push(`Bài ${lesson.id || '(không id)'}: thiếu tiêu đề tiếng Việt`)
          if (lesson.id && seenLessonIds.has(lesson.id)) {
            issues.push(`Chủ đề ${node.id}/${depth}: trùng lesson id "${lesson.id}"`)
          }
          if (lesson.id) seenLessonIds.add(lesson.id)
        }
      }
    }
  }
  return issues
}

function parseSaveIssuesFromError(errorText: string): string[] {
  const raw = String(errorText || '').trim()
  if (!raw) return []
  return raw
    .split(/[\n;]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8)
}

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
  blockClipboard,
  setBlockClipboard,
  inputCls,
  resolvedShowcaseCatalog,
}: {
  activeLesson: LessonItem
  concepts: LearningConcept[]
  taxonomyRegistry: TaxonomyRegistry
  moduleId: string
  nodeId: string
  depth: DepthLevel
  editorTab: 'blocks' | 'preview' | 'lesson-page' | 'quiz'
  setEditorTab: (t: 'blocks' | 'preview' | 'lesson-page' | 'quiz') => void
  updateLesson: typeof updateLesson
  setModules: Dispatch<SetStateAction<LearningModule[]>>
  blockClipboard: LessonSection | null
  setBlockClipboard: Dispatch<SetStateAction<LessonSection | null>>
  inputCls: string
  resolvedShowcaseCatalog: ResolvedNasaCatalogItem[]
}) {
  const sections = activeLesson.sections ?? []
  const selectedConceptIds = activeLesson.conceptIds ?? []
  const [previewConceptId, setPreviewConceptId] = useState<string | null>(null)
  const [quizGenerating, setQuizGenerating] = useState(false)
  const [quizGenerateError, setQuizGenerateError] = useState<string | null>(null)
  const [conceptQuery, setConceptQuery] = useState('')
  const [conceptDomain, setConceptDomain] = useState('all')
  const [conceptSubdomain, setConceptSubdomain] = useState('all')
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null)

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

  const generateQuizByAi = async () => {
    if (quizGenerating) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
    if (!token) {
      setQuizGenerateError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }
    setQuizGenerating(true)
    setQuizGenerateError(null)
    const r = await generateRecallQuizForLesson(token, activeLesson)
    if (!r.ok || !Array.isArray(r.recallQuiz)) {
      setQuizGenerateError(r.error || 'Không thể sinh quiz lúc này')
      setQuizGenerating(false)
      return
    }
    patchLesson({ recallQuiz: r.recallQuiz })
    setQuizGenerating(false)
  }

  useEffect(() => {
    if (sections.length === 0) {
      setSelectedBlockIndex(null)
      return
    }
    if (selectedBlockIndex == null) return
    if (selectedBlockIndex >= sections.length) {
      setSelectedBlockIndex(sections.length - 1)
    }
  }, [sections.length, selectedBlockIndex])

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
        <h2 className="text-lg font-semibold text-white">Soạn bài học</h2>
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

      <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-3 space-y-2">
        <p className="text-xs font-medium text-violet-200">Showcase 3D — sceneContext (Layer 3)</p>
        <p className="text-[11px] text-slate-500">
          Gắn bài với entity trong Explore; gộp với lesson tìm được qua concept (Layer 2). Để trống nếu bài không nhắm showcase.
        </p>
        <label className="block text-xs text-slate-400">
          Entity chính (catalog)
          <select
            value={activeLesson.sceneContext?.primaryEntityId ?? ''}
            onChange={(e) => {
              const v = e.target.value.trim()
              const extras = (activeLesson.sceneContext?.entityIds || []).filter(Boolean)
              if (!v && extras.length === 0) {
                patchLesson({ sceneContext: undefined })
                return
              }
              patchLesson({
                sceneContext: {
                  ...(v ? { primaryEntityId: v } : {}),
                  ...(extras.length ? { entityIds: extras } : {}),
                },
              })
            }}
            className={`mt-1 ${inputCls}`}
          >
            <option value="">— Không chọn —</option>
            {resolvedShowcaseCatalog.map((it) => (
              <option key={it.id} value={it.id}>
                {it.displayName} ({it.id})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-400">
          Entity phụ (id, cách nhau bằng dấu phẩy)
          <input
            value={(activeLesson.sceneContext?.entityIds || []).join(', ')}
            onChange={(e) => {
              const parts = e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
              const primary = (activeLesson.sceneContext?.primaryEntityId || '').trim()
              const unique = [...new Set(parts)].filter((id) => id !== primary)
              if (!primary && unique.length === 0) {
                patchLesson({ sceneContext: undefined })
                return
              }
              patchLesson({
                sceneContext: {
                  ...(primary ? { primaryEntityId: primary } : {}),
                  ...(unique.length ? { entityIds: unique } : {}),
                },
              })
            }}
            placeholder="vd: moon-europa, sc-cassini"
            className={`mt-1 ${inputCls}`}
          />
        </label>
      </div>

      <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3">
        <p className="text-xs font-medium text-cyan-200 mb-2">Concept mapping + highlight</p>
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

      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
        <p className="text-xs font-medium text-emerald-200 mb-2">Checklist map concept (không cần AI)</p>
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

      <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
          <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() => setEditorTab('blocks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              editorTab === 'blocks'
                ? 'bg-cyan-600/90 text-white'
                : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
          >
            Blocks ({sections.length})
          </button>
          <button
            type="button"
            onClick={() => setEditorTab('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              editorTab === 'preview'
                ? 'bg-emerald-600/90 text-white'
                : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setEditorTab('lesson-page')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              editorTab === 'lesson-page'
                ? 'bg-violet-600/90 text-white'
                : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
          >
            Full Lesson Page
          </button>
          <button
            type="button"
            onClick={() => setEditorTab('quiz')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              editorTab === 'quiz'
                ? 'bg-amber-600/90 text-white'
                : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />
              Quiz mastery
            </span>
          </button>
          </div>
        </div>

        {editorTab === 'quiz' && (
          <LearningPathRecallQuizEditor
            lessonId={activeLesson.id}
            recallQuiz={activeLesson.recallQuiz}
            onChange={(next) => patchLesson({ recallQuiz: next })}
            onAutoGenerate={generateQuizByAi}
            generating={quizGenerating}
            generateError={quizGenerateError}
            inputCls={inputCls}
          />
        )}

        {editorTab === 'blocks' && (
          <div className="p-4">
          <div className="mb-3 flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                let source = blockClipboard
                if (typeof window !== 'undefined') {
                  try {
                    const raw = window.localStorage.getItem(BLOCK_CLIPBOARD_STORAGE_KEY)
                    if (raw) source = JSON.parse(raw) as LessonSection
                  } catch {
                    // ignore storage parse errors and fallback to in-memory clipboard
                  }
                }
                if (!source) {
                  window.alert('Chưa có block nào được copy.')
                  return
                }
                const next = [...sections]
                const insertAt = selectedBlockIndex == null ? next.length : Math.min(next.length, selectedBlockIndex + 1)
                next.splice(insertAt, 0, cloneJson(source))
                patchLesson({ sections: next })
                setSelectedBlockIndex(insertAt)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20"
            >
              <Copy className="w-3.5 h-3.5" />
              Dán block đã copy
            </button>
          </div>
            <div className="space-y-3 min-w-0">
              {sections.map((sec, bi) => (
                <div
                  key={bi}
                  id={`lp-studio-block-${bi}`}
                  onClick={() => setSelectedBlockIndex(bi)}
                  className={`rounded-2xl bg-[#0a0f17]/80 p-4 space-y-3 group/block relative scroll-mt-24 cursor-pointer ${
                    selectedBlockIndex === bi
                      ? 'border border-cyan-500/40 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]'
                      : 'border border-white/10'
                  }`}
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
                          const copied = cloneJson(sections[bi])
                          setBlockClipboard(copied)
                          if (typeof window !== 'undefined') {
                            try {
                              window.localStorage.setItem(BLOCK_CLIPBOARD_STORAGE_KEY, JSON.stringify(copied))
                            } catch {
                              // ignore storage write errors
                            }
                          }
                        }}
                        className="text-[10px] text-slate-600 hover:text-cyan-300 px-1"
                        title="Copy block"
                        aria-label="Copy block"
                      >
                        <Copy className="w-3.5 h-3.5" />
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
                <div className="rounded-xl border border-white/10 bg-[#060b14]/95 p-3 shadow-xl">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">TOC (theo lesson view)</p>
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
          <div className="border-t border-emerald-500/10 bg-[#060b14]">
            <div className="px-4 py-2 border-b border-emerald-500/10 bg-emerald-500/5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium text-emerald-300">Preview (như học viên thấy)</span>
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
          <div className="border-t border-violet-500/10 bg-[#060b14]">
            <div className="px-4 py-2 border-b border-violet-500/10 bg-violet-500/5 flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-[11px] font-medium text-violet-300">
                  Preview toàn trang bài học (render cục bộ)
                </span>
              </div>
            </div>
            <div className="p-4 md:p-6 bg-[#02040a]">
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#070b14]/90 p-4 md:p-5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                    Learning Path / Studio Preview
                  </p>
                  <h2 className="text-xl md:text-2xl font-bold text-white">{activeLesson.titleVi}</h2>
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
  const [saveIssues, setSaveIssues] = useState<string[]>([])
  const [undoDelete, setUndoDelete] = useState<{ label: string; modules: LearningModule[] } | null>(null)
  const [editorTab, setEditorTab] = useState<'blocks' | 'preview' | 'lesson-page' | 'quiz'>('blocks')
  const [blockClipboard, setBlockClipboard] = useState<LessonSection | null>(null)
  const [baselineSnapshot, setBaselineSnapshot] = useState('')
  const [showcaseContent, setShowcaseContent] = useState<ShowcaseEntityContentDTO[]>([])
  const showcaseCatalogGen = useShowcaseCatalogGen()

  const resolvedShowcaseCatalog = useMemo(
    () => mergeNasaCatalog(NASA_SHOWCASE_ITEMS, showcaseContent),
    [showcaseContent, showcaseCatalogGen],
  )

  useEffect(() => {
    void fetchPublicShowcaseEntityContents().then(setShowcaseContent)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(BLOCK_CLIPBOARD_STORAGE_KEY)
      if (!raw) return
      setBlockClipboard(JSON.parse(raw) as LessonSection)
    } catch {
      // ignore storage parse errors
    }
  }, [])

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
        const dbModules = d?.modules && d.modules.length > 0 ? d.modules : null
        const nextModules =
          dbModules ??
          (LEARNING_MODULES.length > 0
            ? (JSON.parse(JSON.stringify(LEARNING_MODULES)) as LearningModule[])
            : [])
        const nextConcepts =
          cs && cs.length > 0
            ? cs
            : d?.concepts && d.concepts.length > 0
              ? d.concepts
              : []
        const publishedVal = d?.published ?? true
        if (!dbModules && LEARNING_MODULES.length > 0) {
          setMessage(
            d == null
              ? 'Chưa có bản ghi LearningPath trên Mongo (hoặc API lỗi). Đang tải lộ trình mặc định từ code — bấm Lưu để ghi vào database.'
              : 'Mongo đang có LearningPath nhưng danh sách module rỗng. Đang tải lộ trình mặc định từ code — bấm Lưu để khôi phục.',
          )
        }
        setModules(nextModules)
        setConcepts(nextConcepts)
        setBaselineSnapshot(
          JSON.stringify({
            modules: nextModules,
            published: publishedVal,
          }),
        )
        if (tx) setTaxonomyRegistry(tx)
        setPublished(publishedVal)

        // Preserve current editing selection when data refreshes (e.g. tab blur/focus auth refresh).
        if (!nextModules.length) return
        const sorted = [...nextModules].sort((a, b) => a.order - b.order)
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

  const isDirty = useMemo(() => {
    if (loading) return false
    const current = JSON.stringify({ modules, published })
    return baselineSnapshot !== '' && current !== baselineSnapshot
  }, [loading, modules, published, baselineSnapshot])
  const confirmLeaveIfDirty = useCallback(() => {
    if (!isDirty || saving) return true
    return window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ thay đổi?')
  }, [isDirty, saving])

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
    setUndoDelete({ label: `Đã xóa module "${currentModule.titleVi}"`, modules: cloneJson(modules) })
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
    setUndoDelete({ label: `Đã xóa chủ đề "${currentNode.titleVi}"`, modules: cloneJson(modules) })
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
    setUndoDelete({ label: `Đã xóa bài "${activeLesson.titleVi}"`, modules: cloneJson(modules) })
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
    const localIssues = collectLearningPathIssues(modules)
    setSaveIssues(localIssues)
    setSaving(true)
    setMessage('')
    const rPath = await saveEditorLearningPath(token, modules, published)
    setSaving(false)
    if (rPath.ok && rPath.modules) {
      setModules(rPath.modules)
      if (typeof rPath.published === 'boolean') setPublished(rPath.published)
      setInvalidConceptIds(rPath.invalidConceptIds || [])
      setBaselineSnapshot(
        JSON.stringify({
          modules: rPath.modules,
          published: typeof rPath.published === 'boolean' ? rPath.published : published,
        }),
      )
      setSaveIssues([])
      setUndoDelete(null)
    }
    if (!rPath.ok) {
      const serverIssues = parseSaveIssuesFromError(rPath.error || '')
      setSaveIssues((prev) => (serverIssues.length > 0 ? [...prev, ...serverIssues] : prev))
    }
    setMessage(rPath.ok ? 'Đã lưu Learning Path.' : rPath.error || 'Lỗi lưu')
  }, [modules, published])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty || saving) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty, saving])

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
    return <div className="min-h-screen bg-black pt-20 px-4 text-gray-400">Đang kiểm tra đăng nhập...</div>
  }

  return (
    <div className="min-h-screen bg-[#050508] pt-14 pb-10 px-3 md:px-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        <nav className="text-sm shrink-0">
          <Link
            href="/studio"
            onClick={(e) => {
              if (confirmLeaveIfDirty()) return
              e.preventDefault()
            }}
            className="text-cyan-400 hover:text-cyan-300"
          >
            ← Studio
          </Link>
        </nav>

        {/* Thanh công cụ cố định */}
        <header className="rounded-2xl border border-white/10 bg-gradient-to-r from-violet-950/50 to-cyan-950/30 px-4 py-4 md:px-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <ListTree className="w-6 h-6 text-violet-400" />
              Learning Path Studio
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              <strong className="text-slate-300">Tạo mới</strong> module / chủ đề / bài, hoặc chọn{' '}
              <strong className="text-slate-300">Module → Chủ đề → Tầng → Bài</strong> để soạn. Nội dung bài dùng{' '}
              <strong className="text-cyan-200/90">cùng block kit với khóa học</strong> — không nhập HTML một ô.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`text-[11px] rounded-full border px-2.5 py-1 ${
                isDirty
                  ? 'border-amber-400/45 bg-amber-500/15 text-amber-200'
                  : 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200'
              }`}
            >
              {isDirty ? 'Chưa lưu' : 'Đã lưu'}
            </span>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
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
              className="inline-flex items-center gap-2 min-h-10 px-4 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Đang lưu...' : 'Lưu toàn bộ'}
            </button>
            <span className="text-[11px] text-slate-400">Ctrl+S / Cmd+S</span>
            <Link
              href="/tutorial"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-300 hover:underline"
            >
              Xem học viên →
            </Link>
          </div>
        </header>
        {message ? <p className="text-sm text-emerald-400/90 px-1">{message}</p> : null}
        {undoDelete ? (
          <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-amber-200">{undoDelete.label}</p>
            <button
              type="button"
              onClick={() => {
                setModules(cloneJson(undoDelete.modules))
                setUndoDelete(null)
                setMessage('Đã hoàn tác thao tác xóa.')
              }}
              className="rounded-md border border-amber-300/40 px-2.5 py-1 text-[11px] text-amber-100 hover:bg-amber-500/20"
            >
              Hoàn tác
            </button>
          </div>
        ) : null}
        {saveIssues.length > 0 ? (
          <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 p-3">
            <p className="text-xs font-semibold text-rose-200">Các mục cần kiểm tra trước/sau khi lưu</p>
            <ul className="mt-2 space-y-1">
              {saveIssues.slice(0, 8).map((issue, idx) => (
                <li key={`${issue}-${idx}`} className="text-[11px] text-rose-100/90">
                  - {issue}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {invalidConceptIds.length > 0 ? (
          <p className="text-sm text-amber-300/90 px-1">
            Đã loại bỏ concept không tồn tại khỏi lesson:{' '}
            <span className="font-mono">{invalidConceptIds.join(', ')}</span>
          </p>
        ) : null}

        {loading ? (
          <p className="text-slate-500 py-12 text-center">Đang tải...</p>
        ) : modules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-10 text-center max-w-lg mx-auto">
            <p className="text-slate-300 font-medium">Chưa có module nào trong Learning Path.</p>
            <p className="text-xs text-slate-500 mt-2 mb-6">
              Tạo module đầu tiên (có sẵn một chủ đề và một bài Cơ bản để bạn soạn), sau đó bấm &quot;Lưu toàn bộ&quot; để
              ghi lên server.
            </p>
            <button
              type="button"
              onClick={addFirstModule}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Tạo module đầu tiên
            </button>
            <p className="text-[11px] text-slate-600 mt-6">
              Hoặc chạy API và seed từ <code className="text-slate-400">learningPathDefault.json</code> rồi tải lại
              trang.
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-stretch min-h-[calc(100vh-12rem)]">
            {/* Cột trái: 3 bước điều hướng */}
            <aside className="w-full lg:w-[300px] shrink-0 flex flex-col gap-4">
              <section className="rounded-2xl border border-white/10 bg-[#0c1018] p-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> 1. Module
                </p>
                <p className="text-[10px] text-slate-600 mb-2 leading-snug">
                  Kéo thả từ cột trái · nút ↑↓ đổi chỗ · nút copy nhân đôi (id & URL bài mới).
                </p>
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {sortedModules.map((m, mi) => (
                    <div
                      key={m.id}
                      className={`flex items-stretch gap-0.5 rounded-xl border transition-colors ${
                        moduleId === m.id
                          ? 'bg-cyan-500/15 border-cyan-500/40'
                          : dragOverModuleId === m.id
                            ? 'border-cyan-400/50 bg-cyan-500/10'
                            : 'border-white/10 bg-black/20 hover:border-white/15'
                      }`}
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
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/35 bg-cyan-500/10 text-cyan-200 text-xs font-medium py-2 hover:bg-cyan-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm module
                </button>
                {currentModule && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Chỉnh module đang chọn</p>
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
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 text-red-300/90 text-xs py-1.5 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa module này
                    </button>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#0c1018] p-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> 2. Chủ đề (node)
                </p>
                {!currentModule ? (
                  <p className="text-xs text-slate-600">Chọn module trước.</p>
                ) : (
                  <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
                    {currentModule.nodes.map((n, i) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => onSelectNode(n.id)}
                        className={`w-full text-left rounded-xl px-3 py-2 text-sm transition-colors ${
                          nodeId === n.id
                            ? 'bg-violet-500/20 border border-violet-500/40 text-white'
                            : 'border border-transparent text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        <span className="text-slate-500 text-xs mr-1">{i + 1}.</span>
                        {n.titleVi}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={appendNode}
                      className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/35 bg-violet-500/10 text-violet-200 text-xs font-medium py-2 hover:bg-violet-500/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm chủ đề
                    </button>
                    {currentNode && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Chỉnh chủ đề</p>
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
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 text-red-300/90 text-xs py-1.5 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

              <section className="rounded-2xl border border-white/10 bg-[#0c1018] p-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Concept Library
                </p>
                <p className="text-xs text-slate-400 mb-3">
                  Concept được quản lý ở Studio riêng. Ở đây chỉ dùng để map vào lesson.
                </p>
                <Link
                  href="/studio/concepts"
                  onClick={(e) => {
                    if (confirmLeaveIfDirty()) return
                    e.preventDefault()
                  }}
                  className="inline-flex items-center rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-medium px-3 py-2"
                >
                  Mở Concept Studio
                </Link>
              </section>

              <details className="rounded-2xl border border-white/10 bg-[#0c1018] p-4" open={false}>
                <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Concept Usage Report (nâng cao)
                </summary>
                <div className="mt-3">
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
                </div>
              </details>

              <details className="rounded-2xl border border-white/10 bg-[#0c1018] p-4">
                <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Learning Bridge (Layer 1–3)
                </summary>
                <div className="mt-3 text-[11px] text-slate-400 space-y-2 leading-relaxed">
                  <p>
                    <span className="text-slate-200">Layer 1</span> — nhãn museum trên Explore theo catalog entity (không cần cấu hình
                    thêm).
                  </p>
                  <p>
                    <span className="text-slate-200">Layer 2</span> — map entity → concept trong code; lesson khớp qua concept gắn bài.
                  </p>
                  <p>
                    <span className="text-slate-200">Layer 3</span> — dùng khối &quot;Showcase 3D — sceneContext&quot; ở form bài để gắn entity
                    trực tiếp (ưu tiên gợi ý bài trên Explore).
                  </p>
                </div>
              </details>

              <section className="rounded-2xl border border-white/10 bg-[#0c1018] p-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> 3. Tầng độ sâu
                </p>
                {!currentNode ? (
                  <p className="text-xs text-slate-600">Chọn chủ đề trước.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {DEPTH_ORDER.map((d) => {
                      const count = currentNode.depths[d]?.length ?? 0
                      const meta = DEPTH_META[d]
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => onSelectDepth(d)}
                          className={`rounded-xl px-3 py-2.5 text-left text-sm border transition-all ${
                            depth === d
                              ? `bg-gradient-to-r ${meta.gradient} border-white/20 text-white shadow-lg`
                              : 'border-white/10 text-slate-400 hover:border-white/20 hover:bg-white/5'
                          }`}
                        >
                          <span className="mr-1">{meta.short}</span>
                          {meta.labelVi}
                          <span className="float-right text-[10px] opacity-80">
                            {count === 0 ? 'chưa có bài' : `${count} bài`}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
            </aside>

            {/* Cột phải: danh sách bài trong tầng + form một bài */}
            <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-white/10 bg-[#0a0f17] overflow-hidden">
              {/* Breadcrumb */}
              <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>Đang sửa:</span>
                <span className="text-cyan-300/90">{currentModule?.titleVi ?? '—'}</span>
                <ChevronRight className="w-3 h-3 opacity-50" />
                <span className="text-violet-300/90">{currentNode?.titleVi ?? '—'}</span>
                <ChevronRight className="w-3 h-3 opacity-50" />
                <span className="text-slate-200">
                  {depth ? `${DEPTH_META[depth].short} ${DEPTH_META[depth].labelVi}` : '—'}
                </span>
              </div>

              <div className="flex flex-col xl:flex-row flex-1 min-h-0">
                {/* Danh sách bài (chỉ tiêu đề) */}
                <div className="w-full xl:w-[200px] 2xl:w-[220px] shrink-0 border-b xl:border-b-0 xl:border-r border-white/10 p-3 max-h-[40vh] xl:max-h-none overflow-y-auto">
                  <p className="text-[10px] uppercase text-slate-500 font-semibold mb-2 px-1">4. Chọn bài</p>
                  {lessonsAtDepth.length === 0 ? (
                    <div className="px-2 space-y-2">
                      <p className="text-xs text-slate-600">Chưa có bài ở tầng này.</p>
                      {currentModule && currentNode && depth ? (
                        <button
                          type="button"
                          onClick={appendLesson}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-500/10 text-cyan-200 text-xs py-2 hover:bg-cyan-500/20"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Thêm bài đầu tiên
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
                              className={`min-w-0 flex-1 text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                                activeLessonId === le.id
                                  ? 'bg-white/10 text-white border border-cyan-500/30'
                                  : 'text-slate-400 hover:bg-white/5 border border-transparent'
                              }`}
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
                        className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 text-slate-300 text-xs py-2 hover:bg-white/5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm bài
                      </button>
                      {activeLesson ? (
                        <button
                          type="button"
                          onClick={removeCurrentLesson}
                          className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/25 text-red-300/80 text-xs py-1.5 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Xóa bài đang chọn
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
                      blockClipboard={blockClipboard}
                      setBlockClipboard={setBlockClipboard}
                      inputCls={inputCls}
                      resolvedShowcaseCatalog={resolvedShowcaseCatalog}
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
