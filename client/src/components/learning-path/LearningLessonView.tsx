'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type {
  DepthLevel,
  LearningConcept,
  LearningModule,
  LearningNode,
  LessonItem,
} from '@/data/learningPathCurriculum'
import { DEPTH_META, getLessonNeighbors, getLessonById } from '@/data/learningPathCurriculum'
import {
  loadLessonCompletion,
  saveLessonCompletion,
  saveLastLearningPathLessonId,
  syncLearningPathCompletion,
  pushLearningPathCompletionWithLast,
  toggleLessonComplete,
  isLessonComplete,
  type LessonCompletionMap,
} from '@/lib/learningPathProgress'
import { awardGemsForLearningPathLesson } from '@/lib/gemWallet'
import { useLearningPath } from '@/hooks/useLearningPath'
import { useAuthStore } from '@/store/useAuthStore'
import { SectionPreview } from '@/components/studio/LessonPreview'
import { applyConceptAnchorsToHtml } from '@/lib/conceptAnchorsHtml'
import { trackEvent } from '@/lib/analytics'
import { flushLearningPathBehavior, trackLearningPathBehavior } from '@/lib/learningPathBehavior'

type Props = {
  /** Từ server merge API — đồng bộ SSR */
  modules?: LearningModule[]
  concepts?: LearningConcept[]
  module: LearningModule
  node: LearningNode
  depth: DepthLevel
  lesson: LessonItem
}

function escapeHtmlTitle(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function placeholderBody(lesson: LessonItem) {
  return `<p class="text-slate-300 leading-relaxed">Nội dung bài học đang được biên soạn. Tiêu đề: <strong>${escapeHtmlTitle(lesson.titleVi)}</strong></p><p class="text-slate-500 text-sm mt-4">Giáo viên có thể thêm nội dung trong Studio → Lộ trình học.</p>`
}

export default function LearningLessonView({
  modules: modulesProp,
  concepts: conceptsProp,
  module,
  node,
  depth,
  lesson: initialLesson,
}: Props) {
  const { modules: hookModules, concepts: hookConcepts } = useLearningPath()
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const modules = modulesProp ?? hookModules
  const concepts = conceptsProp ?? hookConcepts
  const hit = getLessonById(initialLesson.id, modules)
  const lesson = hit?.lesson ?? initialLesson
  const displayModule = hit?.module ?? module
  const displayNode = hit?.node ?? node

  const { prev, next } = getLessonNeighbors(lesson.id, modules)
  const meta = DEPTH_META[depth]

  const [completion, setCompletion] = useState<LessonCompletionMap>({})
  useEffect(() => {
    setCompletion(loadLessonCompletion(userId))
    void syncLearningPathCompletion(userId).then((synced) => setCompletion(synced))
  }, [userId])

  const done = isLessonComplete(completion, lesson.id)
  const toggle = () => {
    const markingComplete = !done
    const nextMap = toggleLessonComplete(completion, lesson.id, markingComplete)
    setCompletion(nextMap)
    saveLessonCompletion(nextMap, userId)
    if (markingComplete) saveLastLearningPathLessonId(lesson.id, userId)
    void pushLearningPathCompletionWithLast(nextMap, markingComplete ? lesson.id : null, userId)
    if (markingComplete) {
      awardGemsForLearningPathLesson(lesson.id, userId)
    }
    trackEvent('lesson_complete_toggled', {
      lesson_id: lesson.id,
      module_id: displayModule.id,
      node_id: displayNode.id,
      completed: markingComplete,
    })
    trackLearningPathBehavior({
      eventName: 'lp_lesson_completed_toggled',
      moduleId: displayModule.id,
      nodeId: displayNode.id,
      lessonId: lesson.id,
      depth,
      completed: markingComplete,
    })
    window.dispatchEvent(new Event('lp-progress-changed'))
  }

  const sections = lesson.sections ?? []
  const legacyHtml = lesson.body?.trim() ? lesson.body : placeholderBody(lesson)
  const anchorConceptIds = (lesson.conceptAnchors ?? []).map((a) => a.conceptId)
  const linkedIds = [...new Set([...(lesson.conceptIds ?? []), ...anchorConceptIds])]
  const linkedConcepts = linkedIds
    .map((id) => concepts.find((c) => c.id === id))
    .filter((x): x is LearningConcept => !!x)
  /** Toàn bộ thư viện concept — để anchor luôn resolve được (không chỉ concept đã tick trong bài). */
  const conceptMap = useMemo(
    () => new Map(concepts.map((c) => [c.id, c] as const)),
    [concepts],
  )
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ id: string; x: number; y: number } | null>(null)
  const [panelWidth, setPanelWidth] = useState(400)
  const [resizingPanel, setResizingPanel] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [readingProgress, setReadingProgress] = useState(0)
  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null)
  const tocListRef = useRef<HTMLDivElement | null>(null)
  const lessonEnterAtRef = useRef<number>(Date.now())
  const anchors = lesson.conceptAnchors ?? []
  const highlightedLegacyHtml = useMemo(
    () => applyConceptAnchorsToHtml(legacyHtml, anchors, conceptMap),
    [legacyHtml, anchors, conceptMap],
  )
  const highlightedSections = useMemo(
    () =>
      sections.map((sec) => {
        if ((sec as { type?: string }).type !== 'richtext') return sec
        const rich = sec as { html?: string; content?: string }
        return {
          ...sec,
          html: applyConceptAnchorsToHtml(rich.html || rich.content || '', anchors, conceptMap),
        }
      }),
    [sections, anchors, conceptMap],
  )
  const activeConcept = activeConceptId ? conceptMap.get(activeConceptId) ?? null : null
  const isConceptPanelOpen = !!activeConcept
  const sectionNavItems = useMemo(
    () =>
      highlightedSections.map((sec, i) => ({
        id: `lesson-section-${i}`,
        title: sec.title?.trim() || `Phần ${i + 1}`,
        type: (sec as { type?: string }).type || 'text',
        sectionLevel: (sec as { sectionLevel?: 'main' | 'sub' }).sectionLevel ?? 'main',
      })),
    [highlightedSections],
  )
  const tocGroups = useMemo(() => {
    type TocItem = (typeof sectionNavItems)[number]
    const groups: Array<{ parent: TocItem; children: TocItem[] }> = []
    let lastParentIndex = -1
    for (const item of sectionNavItems) {
      if (item.sectionLevel === 'sub' && lastParentIndex >= 0) {
        groups[lastParentIndex].children.push(item)
        continue
      }
      groups.push({ parent: item, children: [] })
      lastParentIndex = groups.length - 1
    }
    return groups
  }, [sectionNavItems])
  const relatedLessonsForActiveConcept = useMemo(() => {
    if (!activeConceptId) return []
    const rows: Array<{
      lessonId: string
      lessonTitle: string
      moduleId: string
      nodeId: string
      score: number
    }> = []
    for (const m of modules) {
      for (const n of m.nodes ?? []) {
        const nodeLessons = [n.depths.beginner ?? [], n.depths.explorer ?? [], n.depths.researcher ?? []].flat()
        for (const l of nodeLessons) {
          if (l.id === lesson.id) continue
          const ids = l.conceptIds ?? []
          const hasConcept = ids.includes(activeConceptId)
          if (!hasConcept) continue
          const sameNode = n.id === displayNode.id
          const sameModule = m.id === displayModule.id
          rows.push({
            lessonId: l.id,
            lessonTitle: l.titleVi || l.title || l.id,
            moduleId: m.id,
            nodeId: n.id,
            score: sameNode ? 2 : sameModule ? 1 : 0,
          })
        }
      }
    }
    return rows
      .sort((a, b) => b.score - a.score || a.lessonTitle.localeCompare(b.lessonTitle, 'vi'))
      .slice(0, 8)
  }, [activeConceptId, modules, lesson.id, displayNode.id, displayModule.id])
  const prerequisiteGuides = useMemo(() => {
    if (!activeConcept?.prerequisites?.length) return []
    const rows: Array<{ conceptId: string; conceptTitle: string; lessonHref: string | null; lessonTitle: string | null }> = []
    for (const pid of activeConcept.prerequisites) {
      const pc = conceptMap.get(pid)
      let best: { score: number; moduleId: string; nodeId: string; lessonId: string; lessonTitle: string } | null = null
      for (const m of modules) {
        for (const n of m.nodes ?? []) {
          const nodeLessons = [n.depths.beginner ?? [], n.depths.explorer ?? [], n.depths.researcher ?? []].flat()
          for (const l of nodeLessons) {
            if (l.id === lesson.id) continue
            if (!(l.conceptIds ?? []).includes(pid)) continue
            const score = n.id === displayNode.id ? 2 : m.id === displayModule.id ? 1 : 0
            const candidate = { score, moduleId: m.id, nodeId: n.id, lessonId: l.id, lessonTitle: l.titleVi || l.title || l.id }
            if (!best || candidate.score > best.score) best = candidate
          }
        }
      }
      rows.push({
        conceptId: pid,
        conceptTitle: pc?.title || pid,
        lessonHref: best ? `/tutorial/${best.moduleId}/${best.nodeId}/${encodeURIComponent(best.lessonId)}` : null,
        lessonTitle: best?.lessonTitle || null,
      })
    }
    return rows
  }, [activeConcept, conceptMap, modules, lesson.id, displayNode.id, displayModule.id])

  const focusConceptInline = (conceptId: string) => {
    const el = document.querySelector(`[data-concept-id="${conceptId}"]`) as HTMLElement | null
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('lp-concept-focus')
    window.setTimeout(() => el.classList.remove('lp-concept-focus'), 1200)
  }

  const onConceptMouseMove = (e: any) => {
    const t = (e.target as HTMLElement).closest('[data-concept-id]') as HTMLElement | null
    if (!t) {
      if (tooltip) setTooltip(null)
      return
    }
    const id = t.dataset.conceptId
    if (!id) return
    setTooltip({ id, x: e.clientX + 12, y: e.clientY + 12 })
  }

  const onConceptClick = (e: any) => {
    const t = (e.target as HTMLElement).closest('[data-concept-id]') as HTMLElement | null
    if (!t) return
    const id = t.dataset.conceptId
    if (!id) return
    e.preventDefault()
    setActiveConceptId(id)
    trackEvent('concept_panel_opened', {
      concept_id: id,
      lesson_id: lesson.id,
    })
    trackLearningPathBehavior({
      eventName: 'lp_concept_opened',
      moduleId: displayModule.id,
      nodeId: displayNode.id,
      lessonId: lesson.id,
      depth,
      metadata: { conceptId: id, source: 'inline-anchor' },
    })
  }

  useEffect(() => {
    lessonEnterAtRef.current = Date.now()
    trackLearningPathBehavior({
      eventName: 'lp_lesson_opened',
      moduleId: displayModule.id,
      nodeId: displayNode.id,
      lessonId: lesson.id,
      depth,
    })

    return () => {
      const durationSec = Math.max(1, Math.round((Date.now() - lessonEnterAtRef.current) / 1000))
      trackLearningPathBehavior({
        eventName: 'lp_lesson_dwell',
        moduleId: displayModule.id,
        nodeId: displayNode.id,
        lessonId: lesson.id,
        depth,
        durationSec,
      })
      void flushLearningPathBehavior()
    }
  }, [displayModule.id, displayNode.id, lesson.id, depth])

  useEffect(() => {
    if (!isConceptPanelOpen) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveConceptId(null)
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isConceptPanelOpen])

  useEffect(() => {
    if (!resizingPanel) return
    const onMove = (e: MouseEvent) => {
      const start = resizeStartRef.current
      if (!start) return
      const next = start.width + (start.x - e.clientX)
      const bounded = Math.min(560, Math.max(320, next))
      setPanelWidth(bounded)
    }
    const onUp = () => {
      setResizingPanel(false)
      resizeStartRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizingPanel])

  useEffect(() => {
    if (sectionNavItems.length === 0) {
      setReadingProgress(0)
      setActiveSectionId(null)
      setActiveSectionIndex(0)
      return
    }

    let ticking = false
    const SCROLL_OFFSET = 140
    const sectionEls = () =>
      sectionNavItems
        .map((item) => document.getElementById(item.id))
        .filter((el): el is HTMLElement => !!el)

    const updateFromScroll = () => {
      const els = sectionEls()
      if (els.length === 0) {
        ticking = false
        return
      }
      const probeY = window.scrollY + SCROLL_OFFSET
      let currentIdx = 0
      for (let i = 0; i < els.length; i += 1) {
        const curTop = els[i].offsetTop
        const nextTop = i < els.length - 1 ? els[i + 1].offsetTop : Number.POSITIVE_INFINITY
        if (probeY >= curTop && probeY < nextTop) {
          currentIdx = i
          break
        }
        if (probeY >= curTop) currentIdx = i
      }

      const current = els[currentIdx]
      const currentTop = current.offsetTop
      const nextTop = currentIdx < els.length - 1 ? els[currentIdx + 1].offsetTop : currentTop + current.offsetHeight
      const span = Math.max(1, nextTop - currentTop)
      const inside = Math.max(0, Math.min(1, (probeY - currentTop) / span))
      const pct = Math.round(((currentIdx + inside) / els.length) * 100)

      setActiveSectionIndex(currentIdx)
      setActiveSectionId(sectionNavItems[currentIdx]?.id ?? null)
      setReadingProgress(Math.max(0, Math.min(100, pct)))
      ticking = false
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(updateFromScroll)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [sectionNavItems])

  useEffect(() => {
    if (!activeSectionId) return
    const container = tocListRef.current
    if (!container) return
    const activeBtn = container.querySelector(`[data-toc-id="${activeSectionId}"]`) as HTMLElement | null
    if (!activeBtn) return

    const cTop = container.scrollTop
    const cBottom = cTop + container.clientHeight
    const elTop = activeBtn.offsetTop
    const elBottom = elTop + activeBtn.offsetHeight
    const padding = 20

    if (elTop < cTop + padding || elBottom > cBottom - padding) {
      activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeSectionId])

  return (
    <div className="min-h-screen bg-[#02040a] relative overflow-x-hidden">
      <div
        className="pointer-events-none fixed inset-0 opacity-25"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 80% 20%, rgba(236,72,153,0.12), transparent), radial-gradient(ellipse 50% 50% at 10% 60%, rgba(34,211,238,0.08), transparent)',
        }}
      />

      <main
        className={`relative z-10 pt-20 pb-24 px-4 xl:px-6 max-w-6xl mx-auto lg:mx-0 lg:ml-[292px] lg:mr-6 lg:max-w-[calc(100%-316px)] lg:pl-0 transition-[margin] duration-300 ${
          isConceptPanelOpen ? 'md:mr-4' : ''
        }`}
        style={isConceptPanelOpen ? { marginRight: `${panelWidth + 40}px` } : undefined}
      >
        <nav className="text-xs text-slate-500 mb-6 flex flex-wrap items-center gap-2">
          <Link href="/tutorial" className="hover:text-cyan-400 transition-colors">
            Lộ trình học
          </Link>
          <span className="opacity-50">/</span>
          <Link href={`/tutorial/${displayModule.id}`} className="hover:text-cyan-400 transition-colors truncate max-w-[32vw]">
            {displayModule.titleVi}
          </Link>
          <span className="opacity-50">/</span>
          <Link
            href={`/tutorial/${displayModule.id}/${displayNode.id}`}
            className="hover:text-cyan-400 transition-colors truncate max-w-[32vw]"
          >
            {displayNode.titleVi}
          </Link>
          <span className="opacity-50">/</span>
          <span className="text-slate-400 truncate">Bài học</span>
        </nav>

        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-7 rounded-2xl border border-white/10 bg-[#070b14]/80 p-5 md:p-6"
        >
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-lg border border-white/10 bg-gradient-to-br ${meta.gradient}`}>
              {meta.short} {meta.labelVi}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500">
              {displayModule.emoji} Mô-đun {displayModule.order}
            </span>
          </div>
          <h1
            className="text-3xl md:text-4xl font-bold text-white mb-1.5 leading-tight"
            style={{ fontFamily: 'var(--font-heading), Space Grotesk, sans-serif' }}
          >
            {lesson.titleVi}
          </h1>
          {lesson.title ? <p className="text-slate-400 text-sm md:text-base">{lesson.title}</p> : null}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>Tiến độ đọc</span>
              <span className="text-cyan-300 tabular-nums">{readingProgress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-[width] duration-200"
                style={{ width: `${readingProgress}%` }}
              />
            </div>
          </div>
        </motion.header>

        {sections.length > 0 ? (
          <div className="relative mb-8">
            <aside className="hidden lg:block fixed top-20 left-4 w-[260px] z-20">
              <div className="max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#070b14]/92 p-3.5 shadow-xl">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Mục lục bài học</p>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>
                      {Math.min(activeSectionIndex + 1, Math.max(sectionNavItems.length, 1))}/{sectionNavItems.length}
                    </span>
                    <span className="text-cyan-300 tabular-nums">{readingProgress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-[width] duration-200"
                      style={{ width: `${readingProgress}%` }}
                    />
                  </div>
                </div>
                <div ref={tocListRef} className="space-y-2 max-h-[calc(100vh-13rem)] overflow-y-auto pr-1">
                  {tocGroups.map((group) => {
                    const parentActive =
                      activeSectionId === group.parent.id ||
                      group.children.some((child) => child.id === activeSectionId)
                    return (
                      <div key={`group-${group.parent.id}`} className="space-y-1.5">
                        <button
                          data-toc-id={group.parent.id}
                          type="button"
                          onClick={() => {
                            document.getElementById(group.parent.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }}
                          className={`w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors ${
                            parentActive
                              ? 'border border-cyan-500/40 bg-cyan-500/15 text-cyan-100 shadow-[inset_2px_0_0_0_rgba(34,211,238,0.9)]'
                              : 'border border-transparent text-slate-300 hover:text-slate-100 hover:bg-white/5'
                          }`}
                        >
                          {group.parent.title}
                        </button>
                        {group.children.length > 0 ? (
                          <div className="ml-2 pl-2 border-l border-white/10 space-y-1">
                            {group.children.map((child) => (
                              <button
                                key={child.id}
                                data-toc-id={child.id}
                                type="button"
                                onClick={() => {
                                  document.getElementById(child.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }}
                                className={`w-full text-left rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                                  activeSectionId === child.id
                                    ? 'text-cyan-200 bg-cyan-500/10 border border-cyan-500/25'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                                }`}
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
            <div
              className="space-y-5"
              onMouseMove={onConceptMouseMove}
              onMouseLeave={() => setTooltip(null)}
              onClick={onConceptClick}
            >
              {highlightedSections.map((sec, i) => (
                <div
                  key={i}
                  id={`lesson-section-${i}`}
                  className="scroll-mt-24 rounded-2xl border border-white/10 bg-[#070b14]/95 p-6 md:p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                >
                  <SectionPreview sec={sec} index={i} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <article
            className="prose prose-invert prose-sm md:prose-base max-w-none rounded-2xl border border-white/10 bg-[#070b14]/90 p-6 md:p-8 mb-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] [&_p]:my-4 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_a]:text-cyan-400 [&_strong]:text-white"
            onMouseMove={onConceptMouseMove}
            onMouseLeave={() => setTooltip(null)}
            onClick={onConceptClick}
            dangerouslySetInnerHTML={{ __html: highlightedLegacyHtml }}
          />
        )}

        {tooltip && conceptMap.get(tooltip.id) && (
          <div
            className="fixed z-[70] max-w-xs rounded-lg border border-cyan-500/30 bg-[#071018]/95 px-3 py-2 text-xs shadow-xl pointer-events-none"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <p className="text-cyan-200 font-medium">
              {(conceptMap.get(tooltip.id)?.title || tooltip.id)} ({tooltip.id})
            </p>
            <p className="text-slate-300 mt-0.5">
              {conceptMap.get(tooltip.id)?.short_description || conceptMap.get(tooltip.id)?.explanation}
            </p>
          </div>
        )}

        {linkedConcepts.length > 0 && (
          <aside className="mb-8 rounded-2xl border border-cyan-500/20 bg-[#071018]/80 p-4">
            <h3 className="text-sm font-semibold text-cyan-100 mb-2">Khái niệm trong bài</h3>
            <div className="flex flex-wrap gap-2">
              {linkedConcepts.map((c) => (
                <button
                  key={`chip-${c.id}`}
                  type="button"
                  onClick={() => {
                    setActiveConceptId(c.id)
                    focusConceptInline(c.id)
                    trackLearningPathBehavior({
                      eventName: 'lp_concept_opened',
                      moduleId: displayModule.id,
                      nodeId: displayNode.id,
                      lessonId: lesson.id,
                      depth,
                      metadata: { conceptId: c.id, source: 'concept-chip' },
                    })
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs border transition-colors ${
                    activeConceptId === c.id
                      ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                      : 'border-white/15 bg-white/5 text-slate-300 hover:border-cyan-500/40'
                  }`}
                >
                  {c.id}
                </button>
              ))}
            </div>
          </aside>
        )}

        <div className="flex flex-wrap gap-3 mb-12">
          <button
            type="button"
            onClick={toggle}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              done
                ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-200'
                : 'bg-white/5 border border-white/15 text-slate-200 hover:bg-white/10'
            }`}
          >
            {done ? '✓ Đã hoàn thành bài này' : 'Đánh dấu đã học xong bài này'}
          </button>
          <Link
            href={`/tutorial/${displayModule.id}/${displayNode.id}`}
            className="rounded-xl px-4 py-2.5 text-sm border border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
          >
            ← Về danh sách chủ đề
          </Link>
        </div>

        <nav className="flex flex-col sm:flex-row gap-4 sm:justify-between">
          {prev ? (
            <Link
              href={`/tutorial/${prev.moduleId}/${prev.nodeId}/${encodeURIComponent(prev.lesson.id)}`}
              className="group flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 hover:border-white/20 hover:bg-white/[0.04] transition-all"
            >
              <span className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> Bài trước
              </span>
              <p className="text-sm font-medium text-slate-200 group-hover:text-cyan-200 mt-1 line-clamp-2">
                {prev.lesson.titleVi}
              </p>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {next ? (
            <Link
              href={`/tutorial/${next.moduleId}/${next.nodeId}/${encodeURIComponent(next.lesson.id)}`}
              className="group flex-1 rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-4 py-3 hover:border-cyan-400/40 hover:bg-cyan-500/10 transition-all text-right"
            >
              <span className="text-[10px] uppercase tracking-wider text-cyan-500/80 flex items-center justify-end gap-1">
                Bài tiếp <ChevronRight className="w-3.5 h-3.5" />
              </span>
              <p className="text-sm font-medium text-cyan-100 group-hover:text-white mt-1 line-clamp-2">
                {next.lesson.titleVi}
              </p>
            </Link>
          ) : (
            <Link
              href="/tutorial"
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-right hover:bg-white/[0.05] transition-all"
            >
              <span className="text-[10px] uppercase tracking-wider text-slate-500">Hết lộ trình</span>
              <p className="text-sm font-medium text-cyan-300 mt-1">Về tổng quan →</p>
            </Link>
          )}
        </nav>
      </main>
      {activeConcept && (
        <>
          <button
            type="button"
            aria-label="Đóng bảng concept"
            className="fixed inset-0 z-[75] bg-black/50 backdrop-blur-[1px] md:hidden"
            onClick={() => setActiveConceptId(null)}
          />
          <aside
            className="fixed z-[80] w-full max-h-[82vh] md:max-h-[calc(100vh-7rem)] overflow-y-auto border border-cyan-500/25 bg-[#06101a]/98 shadow-2xl
            left-0 right-0 bottom-0 rounded-t-2xl p-4 animate-slide-up-fade
            md:left-auto md:right-4 md:top-20 md:bottom-6 md:rounded-2xl md:p-5"
            style={{ width: `min(100vw, ${panelWidth}px)` }}
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết concept"
          >
            <button
              type="button"
              aria-label="Thay đổi kích thước bảng khái niệm"
              className="hidden md:block absolute left-0 top-0 h-full w-2 cursor-ew-resize"
              onMouseDown={(e) => {
                resizeStartRef.current = { x: e.clientX, width: panelWidth }
                setResizingPanel(true)
                e.preventDefault()
              }}
            />
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-cyan-100">
                {activeConcept.title} ({activeConcept.id})
              </h3>
              <button
                type="button"
                onClick={() => setActiveConceptId(null)}
                className="text-xs rounded border border-white/15 px-2 py-1 text-slate-300 hover:bg-white/10"
              >
                Đóng
              </button>
            </div>
            <p className="text-sm text-slate-300 mt-2">{activeConcept.explanation}</p>
            {activeConcept.examples?.length ? (
              <ul className="mt-3 list-disc pl-5 space-y-1">
                {activeConcept.examples.map((ex, i) => (
                  <li key={`${activeConcept.id}-detail-ex-${i}`} className="text-sm text-slate-300">
                    {ex}
                  </li>
                ))}
              </ul>
            ) : null}
            {activeConcept.related?.length ? (
              <div className="mt-4">
                <p className="text-xs text-slate-400 mb-2">Khái niệm liên quan</p>
                <div className="flex flex-wrap gap-2">
                  {activeConcept.related.map((rid) => {
                    const rel = conceptMap.get(rid)
                    return (
                      <button
                        key={`${activeConcept.id}-related-${rid}`}
                        type="button"
                        onClick={() => {
                          if (!rel) return
                          setActiveConceptId(rid)
                          focusConceptInline(rid)
                          trackLearningPathBehavior({
                            eventName: 'lp_concept_opened',
                            moduleId: displayModule.id,
                            nodeId: displayNode.id,
                            lessonId: lesson.id,
                            depth,
                            metadata: { conceptId: rid, source: 'related-concept' },
                          })
                        }}
                        disabled={!rel}
                        className={`rounded-full px-2 py-1 text-xs border ${
                          rel
                            ? 'border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10'
                            : 'border-white/10 text-slate-500'
                        }`}
                      >
                        {rid}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
            <div id="related-lessons-by-concept" className="mt-5 border-t border-white/10 pt-4">
              <p className="text-xs text-slate-400 mb-2">Bài học liên quan</p>
              {relatedLessonsForActiveConcept.length > 0 ? (
                <div className="space-y-2">
                  {relatedLessonsForActiveConcept.map((row) => (
                    <Link
                      key={`${activeConcept.id}-lesson-${row.lessonId}`}
                      href={`/tutorial/${row.moduleId}/${row.nodeId}/${encodeURIComponent(row.lessonId)}`}
                      className="block rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:border-cyan-500/35 hover:bg-cyan-500/10 transition-colors"
                      onClick={() => setActiveConceptId(null)}
                    >
                      <p className="text-sm text-slate-100 line-clamp-2">{row.lessonTitle}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Chưa có bài khác dùng concept này.</p>
              )}
            </div>
            {prerequisiteGuides.length > 0 ? (
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-xs font-medium text-amber-200 mb-2">Nên học trước</p>
                <div className="space-y-2">
                  {prerequisiteGuides.map((p) => (
                    <div key={`${activeConcept.id}-pre-${p.conceptId}`} className="text-xs text-slate-200">
                      <p>• {p.conceptTitle}</p>
                      {p.lessonHref ? (
                        <Link
                          href={p.lessonHref}
                          onClick={() => setActiveConceptId(null)}
                          className="ml-3 inline-block text-cyan-300 hover:text-cyan-100 underline underline-offset-2"
                        >
                          Học trước: {p.lessonTitle}
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </>
      )}
      <style jsx global>{`
        .lp-concept-inline {
          background: rgba(34, 211, 238, 0.14);
          border: 1px solid rgba(34, 211, 238, 0.35);
          color: #a5f3fc;
          border-radius: 6px;
          padding: 0 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .lp-concept-inline:hover {
          background: rgba(34, 211, 238, 0.24);
          color: #ecfeff;
        }
        .lp-concept-focus {
          box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.55);
        }
      `}</style>
    </div>
  )
}
