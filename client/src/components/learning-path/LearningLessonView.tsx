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
  modules?: LearningModule[]
  concepts?: LearningConcept[]
  module: LearningModule
  node: LearningNode
  depth: DepthLevel
  lesson: LessonItem
}

// ── Design tokens ─────────────────────────────────────────────────
const CYAN = '#7ee7ff'
const AMBER = '#f5a524'

function pr(seed: number) { const x = Math.sin(seed + 1) * 10000; return x - Math.floor(x) }
const STARS = Array.from({ length: 130 }, (_, i) => ({
  x: pr(i * 7 + 1) * 100, y: pr(i * 7 + 2) * 100,
  r: pr(i * 7 + 3) * 1.1 + 0.4,
  o: pr(i * 7 + 4) * 0.5 + 0.15,
  d: pr(i * 7 + 5) * 4 + 2.2,
  c: pr(i * 7 + 6) > 0.9 ? CYAN : pr(i * 7 + 1) > 0.88 ? AMBER : '#ffffff',
}))

function CornerBrackets({ color, size = 12, thickness = 1.5 }: { color: string; size?: number; thickness?: number }) {
  const base: React.CSSProperties = { position: 'absolute', width: size, height: size, pointerEvents: 'none' }
  const b = `${thickness}px solid ${color}`
  return (
    <>
      <span style={{ ...base, top: 0, left: 0, borderTop: b, borderLeft: b }} />
      <span style={{ ...base, top: 0, right: 0, borderTop: b, borderRight: b }} />
      <span style={{ ...base, bottom: 0, left: 0, borderBottom: b, borderLeft: b }} />
      <span style={{ ...base, bottom: 0, right: 0, borderBottom: b, borderRight: b }} />
    </>
  )
}

function escapeHtmlTitle(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function placeholderBody(lesson: LessonItem) {
  return `<p class="text-slate-300 leading-relaxed">Nội dung bài học đang được biên soạn. Tiêu đề: <strong>${escapeHtmlTitle(lesson.titleVi)}</strong></p><p class="text-slate-500 text-sm mt-4">Giáo viên có thể thêm nội dung trong Studio → Lộ trình học.</p>`
}

// depth color map
const DEPTH_DOT: Record<DepthLevel, string> = {
  beginner: '#6dffb0',
  explorer: '#3b82f6',
  researcher: '#ef4444',
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
  const [hoveredAction, setHoveredAction] = useState<'done' | 'back' | null>(null)
  const [hoveredNav, setHoveredNav] = useState<'prev' | 'next' | null>(null)
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
    trackEvent('concept_panel_opened', { concept_id: id, lesson_id: lesson.id })
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
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveConceptId(null) }
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
    const onUp = () => { setResizingPanel(false); resizeStartRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
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
      sectionNavItems.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => !!el)
    const updateFromScroll = () => {
      const els = sectionEls()
      if (els.length === 0) { ticking = false; return }
      const probeY = window.scrollY + SCROLL_OFFSET
      let currentIdx = 0
      for (let i = 0; i < els.length; i += 1) {
        const curTop = els[i].offsetTop
        const nextTop = i < els.length - 1 ? els[i + 1].offsetTop : Number.POSITIVE_INFINITY
        if (probeY >= curTop && probeY < nextTop) { currentIdx = i; break }
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
    const onScroll = () => { if (ticking) return; ticking = true; window.requestAnimationFrame(updateFromScroll) }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
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
    if (elTop < cTop + 20 || elBottom > cBottom - 20) {
      activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeSectionId])

  const mainRightOffset = isConceptPanelOpen ? panelWidth + 32 : 0

  return (
    <div style={{ minHeight: '100vh', background: '#03060f', position: 'relative', overflowX: 'hidden', fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes llv-scan { from { transform: translateY(-4px) } to { transform: translateY(100vh) } }

        .llv-toc-btn { transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease !important; cursor: pointer; }
        .llv-toc-btn:hover { background: rgba(126,231,255,0.06) !important; color: #eaf6ff !important; }

        .llv-section-card { transition: border-color 0.22s ease, box-shadow 0.25s ease !important; }
        .llv-section-card:hover { border-color: rgba(126,231,255,0.32) !important; box-shadow: 0 0 24px rgba(126,231,255,0.08) !important; }

        .llv-nav-card { transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.2s ease, background 0.2s ease !important; }
        .llv-nav-card:hover { border-color: rgba(126,231,255,0.45) !important; box-shadow: 0 0 20px rgba(126,231,255,0.12) !important; transform: translateY(-2px) !important; }

        .llv-concept-chip { transition: background 0.15s ease, border-color 0.15s ease !important; cursor: pointer; }
        .llv-concept-chip:hover { background: rgba(126,231,255,0.1) !important; border-color: rgba(126,231,255,0.45) !important; }

        @media (max-width: 1100px) { .llv-edge { display: none !important; } .llv-toc { display: none !important; } }
        @media (max-width: 760px) {
          .llv-main { padding-left: 16px !important; padding-right: 16px !important; }
          .llv-h1 { font-size: 26px !important; }
          .llv-nav-row { flex-direction: column !important; }
          .llv-action-row { flex-direction: column !important; }
        }
      `}</style>

      {/* ── Starfield ── */}
      <svg aria-hidden style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
        {STARS.map((s, i) => (
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
        background: `linear-gradient(90deg,transparent,${CYAN},transparent)`,
        boxShadow: `0 0 8px ${CYAN}`, opacity: 0.4,
        animation: 'llv-scan 12s linear infinite',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* ── Ambient glow ── */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 55% 35% at 6% 68%,rgba(245,165,36,0.04) 0%,transparent 60%),radial-gradient(ellipse 55% 35% at 94% 32%,rgba(126,231,255,0.05) 0%,transparent 60%)',
      }} />

      {/* ── Edge labels ── */}
      <div className="llv-edge" style={{ position: 'fixed', left: 6, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#8a9bb8', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          COSMOLEARN · V2.6 · {displayNode.title?.toLowerCase() ?? 'lesson'} · {depth}
        </span>
      </div>
      <div className="llv-edge" style={{ position: 'fixed', right: 6, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <span style={{ writingMode: 'vertical-rl', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', color: '#8a9bb8', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          Lat 21.0285° N — Lon 105.8542° E — Alt 12m
        </span>
      </div>

      {/* ══════════════════════════════════════
          TOC Sidebar (fixed left)
      ══════════════════════════════════════ */}
      {sections.length > 0 && (
        <aside
          className="llv-toc"
          style={{ position: 'fixed', top: 92, left: 20, width: 260, zIndex: 20, maxHeight: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{
            position: 'relative',
            clipPath: 'polygon(14px 0%,100% 0%,100% calc(100% - 14px),calc(100% - 14px) 100%,0% 100%,0% 14px)',
            background: 'rgba(4,7,18,0.94)',
            border: `1px solid rgba(126,231,255,0.22)`,
            boxShadow: '0 0 40px rgba(126,231,255,0.06)',
            padding: '18px 16px 14px',
            display: 'flex', flexDirection: 'column', gap: 0,
            maxHeight: 'calc(100vh - 110px)', overflow: 'hidden',
          }}>
            <CornerBrackets color={CYAN} size={10} thickness={1.5} />

            {/* Eyebrow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8a9bb8' }}>
              <span style={{ width: 14, height: 1, background: CYAN, display: 'inline-block', boxShadow: `0 0 4px ${CYAN}`, flexShrink: 0 }} />
              Mục lục bài học
            </div>

            {/* Progress row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#9aa8c4' }}>
                {Math.min(activeSectionIndex + 1, Math.max(sectionNavItems.length, 1))} / {sectionNavItems.length}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: CYAN, textShadow: `0 0 8px rgba(126,231,255,0.5)` }}>
                {readingProgress}%
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 3, background: 'rgba(126,231,255,0.08)', marginBottom: 14, clipPath: 'polygon(3px 0%,100% 0%,calc(100% - 3px) 100%,0% 100%)' }}>
              <div style={{
                height: '100%',
                width: `${readingProgress}%`,
                background: `linear-gradient(90deg,rgba(126,231,255,0.4),${CYAN})`,
                boxShadow: `0 0 8px rgba(126,231,255,0.5)`,
                transition: 'width 0.25s ease',
              }} />
            </div>

            <div style={{ height: 1, background: 'rgba(126,231,255,0.1)', marginBottom: 10 }} />

            {/* Section list */}
            <div ref={tocListRef} style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {tocGroups.map((group) => {
                const parentActive =
                  activeSectionId === group.parent.id ||
                  group.children.some((child) => child.id === activeSectionId)
                return (
                  <div key={`group-${group.parent.id}`}>
                    <button
                      data-toc-id={group.parent.id}
                      type="button"
                      className="llv-toc-btn"
                      onClick={() => {
                        document.getElementById(group.parent.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '8px 10px',
                        clipPath: 'polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px)',
                        background: parentActive
                          ? 'linear-gradient(90deg,rgba(126,231,255,0.12),rgba(126,231,255,0.04))'
                          : 'transparent',
                        border: parentActive
                          ? `1px solid rgba(126,231,255,0.35)`
                          : '1px solid transparent',
                        borderLeft: parentActive ? `2px solid ${CYAN}` : `2px solid transparent`,
                        boxShadow: parentActive ? '0 0 12px rgba(126,231,255,0.07)' : 'none',
                        fontFamily: "'Space Grotesk',sans-serif",
                        fontSize: 13, fontWeight: parentActive ? 600 : 400,
                        color: parentActive ? '#eaf6ff' : '#9aa8c4',
                        lineHeight: 1.4,
                        cursor: 'pointer',
                      }}
                    >
                      {group.parent.title}
                    </button>
                    {group.children.length > 0 && (
                      <div style={{ marginLeft: 10, paddingLeft: 10, borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                        {group.children.map((child) => (
                          <button
                            key={child.id}
                            data-toc-id={child.id}
                            type="button"
                            className="llv-toc-btn"
                            onClick={() => {
                              document.getElementById(child.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            style={{
                              width: '100%', textAlign: 'left',
                              padding: '5px 8px',
                              background: activeSectionId === child.id ? 'rgba(126,231,255,0.08)' : 'transparent',
                              border: activeSectionId === child.id ? `1px solid rgba(126,231,255,0.25)` : '1px solid transparent',
                              fontFamily: "'Space Grotesk',sans-serif",
                              fontSize: 12,
                              color: activeSectionId === child.id ? '#a5d8e8' : '#8a9bb8',
                              lineHeight: 1.4,
                              cursor: 'pointer',
                            }}
                          >
                            {child.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </aside>
      )}

      {/* ══════════════════════════════════════
          Main content
      ══════════════════════════════════════ */}
      <main
        className="llv-main"
        style={{
          position: 'relative', zIndex: 10,
          paddingTop: 96, paddingBottom: 80,
          paddingLeft: sections.length > 0 ? 308 : 'clamp(40px,5vw,100px)',
          paddingRight: isConceptPanelOpen ? mainRightOffset + 32 : 'clamp(32px,4vw,80px)',
          transition: 'padding-right 0.3s ease',
        }}
      >
        {/* ── Breadcrumb ── */}
        <nav style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
          marginBottom: 24,
          fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          <Link href="/tutorial" style={{ color: '#8a9bb8', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = CYAN)}
            onMouseLeave={e => (e.currentTarget.style.color = '#8a9bb8')}>
            Lộ trình học
          </Link>
          <span style={{ color: '#8a9bb8' }}>—</span>
          <Link href={`/tutorial/${displayModule.id}`}
            style={{ color: '#8a9bb8', textDecoration: 'none', maxWidth: '28vw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            onMouseEnter={e => (e.currentTarget.style.color = CYAN)}
            onMouseLeave={e => (e.currentTarget.style.color = '#8a9bb8')}>
            {displayModule.titleVi}
          </Link>
          <span style={{ color: '#8a9bb8' }}>—</span>
          <Link href={`/tutorial/${displayModule.id}/${displayNode.id}`}
            style={{ color: '#8a9bb8', textDecoration: 'none', maxWidth: '28vw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            onMouseEnter={e => (e.currentTarget.style.color = CYAN)}
            onMouseLeave={e => (e.currentTarget.style.color = '#8a9bb8')}>
            {displayNode.titleVi}
          </Link>
          <span style={{ color: '#8a9bb8' }}>—</span>
          <span style={{ color: CYAN, textShadow: `0 0 8px rgba(126,231,255,0.4)` }}>Bài học</span>
        </nav>

        {/* ── Head Card ── */}
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: 0.06 }}
          style={{ marginBottom: 16 }}
        >
          <div style={{
            position: 'relative',
            clipPath: 'polygon(16px 0%,100% 0%,100% calc(100% - 16px),calc(100% - 16px) 100%,0% 100%,0% 16px)',
            background: [
              'radial-gradient(ellipse 55% 50% at 100% 0%, rgba(126,231,255,0.1) 0%, transparent 60%)',
              'radial-gradient(ellipse 45% 40% at 0% 100%, rgba(245,165,36,0.05) 0%, transparent 55%)',
              'rgba(6,9,26,0.75)',
            ].join(','),
            border: `1px solid rgba(126,231,255,0.38)`,
            boxShadow: '0 0 40px rgba(126,231,255,0.1)',
            padding: '24px 28px',
          }}>
            <CornerBrackets color={CYAN} size={12} thickness={1.5} />

            {/* Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '4px 13px',
                clipPath: 'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
                background: `rgba(${depth === 'beginner' ? '61,220,132' : depth === 'explorer' ? '59,130,246' : '239,68,68'},0.1)`,
                border: `1px solid rgba(${depth === 'beginner' ? '61,220,132' : depth === 'explorer' ? '59,130,246' : '239,68,68'},0.4)`,
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                color: DEPTH_DOT[depth],
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: DEPTH_DOT[depth], boxShadow: `0 0 6px ${DEPTH_DOT[depth]}`, flexShrink: 0 }} />
                {meta.labelVi}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '4px 13px',
                clipPath: 'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
                background: 'rgba(126,231,255,0.06)',
                border: '1px solid rgba(126,231,255,0.3)',
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: CYAN,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: CYAN, boxShadow: `0 0 6px ${CYAN}`, flexShrink: 0 }} />
                {displayModule.emoji} Mô-đun {displayModule.order}
              </div>
            </div>

            {/* Title */}
            <h1 className="llv-h1" style={{
              fontSize: 'clamp(26px,4vw,44px)',
              fontFamily: "'Space Grotesk',sans-serif",
              fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.025em',
              color: '#eaf6ff', margin: '0 0 8px',
            }}>
              {lesson.titleVi}
            </h1>
            {lesson.title && (
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8a9bb8', marginBottom: 20 }}>
                // {lesson.title}
              </div>
            )}

            {/* Reading progress */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8a9bb8' }}>
                  // Tiến độ đọc
                </span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: CYAN, textShadow: `0 0 8px rgba(126,231,255,0.5)` }}>
                  {readingProgress}%
                </span>
              </div>
              <div style={{ position: 'relative', height: 5, background: 'rgba(255,255,255,0.04)', clipPath: 'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${readingProgress}%`,
                    background: `linear-gradient(90deg,rgba(126,231,255,0.3),${CYAN})`,
                    position: 'relative',
                    transition: 'width 0.2s ease',
                  }}
                >
                  {readingProgress > 1 && (
                    <span style={{ position: 'absolute', right: 0, top: -1, bottom: -1, width: 3, background: CYAN, boxShadow: `0 0 6px ${CYAN}` }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        {/* ── Sections or legacy body ── */}
        {sections.length > 0 ? (
          <div
            style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 12 }}
            onMouseMove={onConceptMouseMove}
            onMouseLeave={() => setTooltip(null)}
            onClick={onConceptClick}
          >
            {highlightedSections.map((sec, i) => {
              const isWarning = (sec as { type?: string }).type === 'warning'
              return (
                <div
                  key={i}
                  id={`lesson-section-${i}`}
                  className="llv-section-card"
                  style={{
                    position: 'relative',
                    scrollMarginTop: 110,
                    clipPath: 'polygon(14px 0%,100% 0%,100% calc(100% - 14px),calc(100% - 14px) 100%,0% 100%,0% 14px)',
                    background: isWarning
                      ? [
                          'radial-gradient(ellipse 55% 45% at 0% 0%, rgba(245,165,36,0.1) 0%, transparent 60%)',
                          'rgba(20,12,2,0.58)',
                        ].join(',')
                      : 'rgba(6,9,26,0.6)',
                    border: isWarning
                      ? `1px solid rgba(245,165,36,0.38)`
                      : `1px solid rgba(126,231,255,0.14)`,
                    boxShadow: isWarning
                      ? '0 0 28px rgba(245,165,36,0.08)'
                      : 'none',
                    padding: '22px 26px',
                  }}
                >
                  <CornerBrackets
                    color={isWarning ? 'rgba(245,165,36,0.4)' : 'rgba(126,231,255,0.32)'}
                    size={10} thickness={1}
                  />

                  {/* Section header */}
                  {isWarning ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{
                        width: 32, height: 32, flexShrink: 0,
                        clipPath: 'polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px)',
                        background: 'rgba(245,165,36,0.12)',
                        border: `1px solid rgba(245,165,36,0.4)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8 2L14 13H2L8 2Z" stroke="#f5a524" strokeWidth="1.5" strokeLinejoin="round" />
                          <line x1="8" y1="7" x2="8" y2="10" stroke="#f5a524" strokeWidth="1.5" strokeLinecap="round" />
                          <circle cx="8" cy="11.5" r="0.75" fill="#f5a524" />
                        </svg>
                      </div>
                      <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600, color: '#ffd27a' }}>
                        {sec.title}
                      </span>
                    </div>
                  ) : sec.title ? (
                    <h2 style={{ margin: '0 0 14px', fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 600, color: '#eaf6ff', lineHeight: 1.3 }}>
                      {sec.title}
                    </h2>
                  ) : null}

                  {/* Section content */}
                  <div style={{ color: '#9aa8c4', lineHeight: 1.7 }}>
                    <SectionPreview sec={sec} index={i} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <article
            style={{
              position: 'relative',
              clipPath: 'polygon(14px 0%,100% 0%,100% calc(100% - 14px),calc(100% - 14px) 100%,0% 100%,0% 14px)',
              background: 'rgba(6,9,26,0.6)',
              border: `1px solid rgba(126,231,255,0.14)`,
              padding: '24px 28px',
              marginBottom: 28,
              color: '#9aa8c4', lineHeight: 1.7, fontSize: 15,
            }}
            onMouseMove={onConceptMouseMove}
            onMouseLeave={() => setTooltip(null)}
            onClick={onConceptClick}
            dangerouslySetInnerHTML={{ __html: highlightedLegacyHtml }}
          />
        )}

        {/* ── Concept hover tooltip ── */}
        {tooltip && conceptMap.get(tooltip.id) && (
          <div style={{
            position: 'fixed', zIndex: 70,
            left: tooltip.x, top: tooltip.y,
            maxWidth: 280,
            clipPath: 'polygon(8px 0%,100% 0%,100% calc(100% - 8px),calc(100% - 8px) 100%,0% 100%,0% 8px)',
            background: 'rgba(4,10,22,0.97)',
            border: `1px solid rgba(126,231,255,0.32)`,
            boxShadow: '0 0 20px rgba(126,231,255,0.1)',
            padding: '10px 14px',
            pointerEvents: 'none',
          }}>
            <p style={{ margin: '0 0 4px', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: CYAN, fontWeight: 500 }}>
              {conceptMap.get(tooltip.id)?.title || tooltip.id}
            </p>
            <p style={{ margin: 0, fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: '#9aa8c4', lineHeight: 1.5 }}>
              {conceptMap.get(tooltip.id)?.short_description || conceptMap.get(tooltip.id)?.explanation}
            </p>
          </div>
        )}

        {/* ── Concept chips ── */}
        {linkedConcepts.length > 0 && (
          <aside style={{
            position: 'relative',
            marginBottom: 20,
            clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
            background: 'rgba(6,9,26,0.5)',
            border: `1px solid rgba(126,231,255,0.18)`,
            padding: '16px 20px',
          }}>
            <h3 style={{ margin: '0 0 12px', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: CYAN }}>
              // Khái niệm trong bài
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {linkedConcepts.map((c) => (
                <button
                  key={`chip-${c.id}`}
                  type="button"
                  className="llv-concept-chip"
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
                  style={{
                    padding: '5px 14px',
                    clipPath: 'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
                    background: activeConceptId === c.id ? 'rgba(126,231,255,0.14)' : 'rgba(126,231,255,0.04)',
                    border: activeConceptId === c.id ? `1px solid rgba(126,231,255,0.5)` : `1px solid rgba(126,231,255,0.2)`,
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 11, letterSpacing: '0.1em',
                    color: activeConceptId === c.id ? CYAN : '#9aa8c4',
                    cursor: 'pointer',
                  }}
                >
                  {c.id}
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* ── Action buttons ── */}
        <div className="llv-action-row" style={{ display: 'flex', gap: 12, marginBottom: 36 }}>
          <button
            type="button"
            onClick={toggle}
            onMouseEnter={() => setHoveredAction('done')}
            onMouseLeave={() => setHoveredAction(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 22px',
              clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
              background: done ? 'rgba(109,255,176,0.12)' : AMBER,
              border: done ? '1px solid rgba(109,255,176,0.45)' : `1px solid rgba(245,165,36,0.5)`,
              boxShadow: done ? '0 0 18px rgba(109,255,176,0.12)' : `0 0 18px rgba(245,165,36,0.3)`,
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: 14, fontWeight: 600,
              color: done ? '#6dffb0' : '#1a0e00',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s ease, transform 0.15s ease',
              transform: hoveredAction === 'done' ? 'translateY(-1px)' : 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              {done ? (
                <>
                  <circle cx="8" cy="8" r="7" stroke="#6dffb0" strokeWidth="1.5" />
                  <path d="M5 8L7 10L11 6" stroke="#6dffb0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </>
              ) : (
                <>
                  <circle cx="8" cy="8" r="7" stroke="#1a0e00" strokeWidth="1.5" />
                  <path d="M5 8L7 10L11 6" stroke="#1a0e00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}
            </svg>
            {done ? 'Đã hoàn thành bài này' : 'Đánh dấu đã học xong bài này'}
          </button>
          <Link
            href={`/tutorial/${displayModule.id}/${displayNode.id}`}
            onMouseEnter={() => setHoveredAction('back')}
            onMouseLeave={() => setHoveredAction(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '12px 20px',
              clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
              background: hoveredAction === 'back' ? 'rgba(126,231,255,0.06)' : 'rgba(126,231,255,0.03)',
              border: `1px solid rgba(126,231,255,${hoveredAction === 'back' ? '0.35' : '0.15'})`,
              boxShadow: hoveredAction === 'back' ? '0 0 16px rgba(126,231,255,0.08)' : 'none',
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: 14, fontWeight: 500,
              color: hoveredAction === 'back' ? '#eaf6ff' : '#9aa8c4',
              textDecoration: 'none',
              transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
            }}
          >
            ← Về danh sách chủ đề
          </Link>
        </div>

        {/* ── Prev / Next nav ── */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8a9bb8', whiteSpace: 'nowrap' }}>
              // Điều hướng bài học
            </span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,rgba(126,231,255,0.18),transparent)' }} />
          </div>

          <div className="llv-nav-row" style={{ display: 'flex', gap: 14 }}>
            {prev ? (
              <Link
                href={`/tutorial/${prev.moduleId}/${prev.nodeId}/${encodeURIComponent(prev.lesson.id)}`}
                onMouseEnter={() => setHoveredNav('prev')}
                onMouseLeave={() => setHoveredNav(null)}
                style={{ flex: 1, textDecoration: 'none' }}
              >
                <div
                  className="llv-nav-card"
                  style={{
                    position: 'relative', minHeight: 90, padding: '16px 20px',
                    clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
                    background: hoveredNav === 'prev' ? 'rgba(126,231,255,0.04)' : 'rgba(6,9,26,0.7)',
                    border: `1px solid rgba(126,231,255,${hoveredNav === 'prev' ? '0.4' : '0.12'})`,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: hoveredNav === 'prev' ? CYAN : '#8a9bb8', marginBottom: 8 }}>
                    <ChevronLeft size={12} /> Bài trước
                  </span>
                  <span style={{ display: 'block', fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 500, color: hoveredNav === 'prev' ? '#eaf6ff' : '#9aa8c4', lineHeight: 1.4 }}>
                    {prev.lesson.titleVi}
                  </span>
                </div>
              </Link>
            ) : (
              <div style={{ flex: 1 }} />
            )}

            {next ? (
              <Link
                href={`/tutorial/${next.moduleId}/${next.nodeId}/${encodeURIComponent(next.lesson.id)}`}
                onMouseEnter={() => setHoveredNav('next')}
                onMouseLeave={() => setHoveredNav(null)}
                style={{ flex: 1, textDecoration: 'none' }}
              >
                <div
                  className="llv-nav-card"
                  style={{
                    position: 'relative', minHeight: 90, padding: '16px 20px',
                    clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
                    background: hoveredNav === 'next' ? 'rgba(126,231,255,0.04)' : 'rgba(6,9,26,0.7)',
                    border: `1px solid rgba(126,231,255,${hoveredNav === 'next' ? '0.4' : '0.22'})`,
                    textAlign: 'right',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: CYAN, marginBottom: 8, opacity: 0.85 }}>
                    Bài tiếp <ChevronRight size={12} />
                  </span>
                  <span style={{ display: 'block', fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 500, color: hoveredNav === 'next' ? '#eaf6ff' : '#9aa8c4', lineHeight: 1.4 }}>
                    {next.lesson.titleVi}
                  </span>
                </div>
              </Link>
            ) : (
              <Link
                href="/tutorial"
                onMouseEnter={() => setHoveredNav('next')}
                onMouseLeave={() => setHoveredNav(null)}
                style={{ flex: 1, textDecoration: 'none' }}
              >
                <div
                  className="llv-nav-card"
                  style={{
                    position: 'relative', minHeight: 90, padding: '16px 20px',
                    clipPath: 'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)',
                    background: hoveredNav === 'next' ? 'rgba(126,231,255,0.04)' : 'rgba(6,9,26,0.7)',
                    border: `1px solid rgba(126,231,255,${hoveredNav === 'next' ? '0.4' : '0.22'})`,
                    textAlign: 'right',
                  }}
                >
                  <span style={{ display: 'block', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: CYAN, marginBottom: 8, opacity: 0.85 }}>
                    Hết lộ trình
                  </span>
                  <span style={{ display: 'block', fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 500, color: CYAN, lineHeight: 1.4 }}>
                    Về tổng quan →
                  </span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════
          Concept panel (slide-out right)
      ══════════════════════════════════════ */}
      {activeConcept && (
        <>
          <button
            type="button"
            aria-label="Đóng bảng concept"
            style={{ position: 'fixed', inset: 0, zIndex: 75, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(1px)', display: 'block' }}
            className="md:hidden"
            onClick={() => setActiveConceptId(null)}
          />
          <aside
            style={{
              position: 'fixed', zIndex: 80,
              width: `min(100vw, ${panelWidth}px)`,
              maxHeight: 'calc(100vh - 7rem)', overflowY: 'auto',
              background: 'rgba(4,10,22,0.98)',
              border: `1px solid rgba(126,231,255,0.25)`,
              boxShadow: `0 0 48px rgba(126,231,255,0.12)`,
              padding: '20px',
              left: 'auto', right: 16, top: 88, bottom: 24,
              clipPath: 'polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0% 100%,0% 12px)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết concept"
          >
            {/* Resize handle */}
            <button
              type="button"
              aria-label="Thay đổi kích thước bảng khái niệm"
              style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: 6, cursor: 'ew-resize', background: 'transparent', border: 'none' }}
              onMouseDown={(e) => {
                resizeStartRef.current = { x: e.clientX, width: panelWidth }
                setResizingPanel(true)
                e.preventDefault()
              }}
            />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: CYAN, marginBottom: 6 }}>
                  // Khái niệm
                </div>
                <h3 style={{ margin: 0, fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, color: '#eaf6ff', lineHeight: 1.3 }}>
                  {activeConcept.title}{' '}
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8a9bb8', fontWeight: 400 }}>({activeConcept.id})</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveConceptId(null)}
                style={{
                  flexShrink: 0, padding: '4px 10px',
                  clipPath: 'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)',
                  background: 'rgba(126,231,255,0.05)',
                  border: '1px solid rgba(126,231,255,0.25)',
                  fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#9aa8c4',
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>

            <div style={{ height: 1, background: 'rgba(126,231,255,0.1)', marginBottom: 14 }} />

            <p style={{ margin: '0 0 14px', fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, color: '#9aa8c4', lineHeight: 1.65 }}>
              {activeConcept.explanation}
            </p>

            {activeConcept.examples?.length ? (
              <ul style={{ margin: '0 0 14px', paddingLeft: 18 }}>
                {activeConcept.examples.map((ex, i) => (
                  <li key={`${activeConcept.id}-detail-ex-${i}`} style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: '#9aa8c4', lineHeight: 1.6, marginBottom: 4 }}>
                    {ex}
                  </li>
                ))}
              </ul>
            ) : null}

            {activeConcept.related?.length ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8a9bb8', marginBottom: 8 }}>
                  // Khái niệm liên quan
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
                        style={{
                          padding: '4px 12px',
                          clipPath: 'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)',
                          background: rel ? 'rgba(126,231,255,0.06)' : 'rgba(255,255,255,0.03)',
                          border: rel ? `1px solid rgba(126,231,255,0.3)` : '1px solid rgba(255,255,255,0.08)',
                          fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                          color: rel ? CYAN : '#8a9bb8',
                          cursor: rel ? 'pointer' : 'default',
                        }}
                      >
                        {rid}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {/* Related lessons */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, marginBottom: 10 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8a9bb8', marginBottom: 8 }}>
                // Bài học liên quan
              </div>
              {relatedLessonsForActiveConcept.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {relatedLessonsForActiveConcept.map((row) => (
                    <Link
                      key={`${activeConcept.id}-lesson-${row.lessonId}`}
                      href={`/tutorial/${row.moduleId}/${row.nodeId}/${encodeURIComponent(row.lessonId)}`}
                      onClick={() => setActiveConceptId(null)}
                      style={{
                        display: 'block',
                        padding: '9px 14px',
                        clipPath: 'polygon(8px 0%,100% 0%,100% calc(100% - 8px),calc(100% - 8px) 100%,0% 100%,0% 8px)',
                        background: 'rgba(126,231,255,0.03)',
                        border: `1px solid rgba(126,231,255,0.15)`,
                        fontFamily: "'Space Grotesk',sans-serif",
                        fontSize: 13, color: '#9aa8c4', textDecoration: 'none', lineHeight: 1.4,
                      }}
                    >
                      {row.lessonTitle}
                    </Link>
                  ))}
                </div>
              ) : (
                <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8a9bb8' }}>
                  Chưa có bài khác dùng concept này.
                </p>
              )}
            </div>

            {/* Prerequisites */}
            {prerequisiteGuides.length > 0 && (
              <div style={{
                marginTop: 12,
                clipPath: 'polygon(8px 0%,100% 0%,100% calc(100% - 8px),calc(100% - 8px) 100%,0% 100%,0% 8px)',
                background: 'rgba(245,165,36,0.08)',
                border: `1px solid rgba(245,165,36,0.3)`,
                padding: '12px 14px',
              }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: AMBER, marginBottom: 8 }}>
                  // Nên học trước
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {prerequisiteGuides.map((p) => (
                    <div key={`${activeConcept.id}-pre-${p.conceptId}`}>
                      <p style={{ margin: '0 0 4px', fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: '#ffd27a' }}>
                        {p.conceptTitle}
                      </p>
                      {p.lessonHref && (
                        <Link
                          href={p.lessonHref}
                          onClick={() => setActiveConceptId(null)}
                          style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: CYAN, textDecoration: 'underline', textUnderlineOffset: 3 }}
                        >
                          Học trước: {p.lessonTitle}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </>
      )}

      {/* ── Concept inline styles ── */}
      <style jsx global>{`
        .lp-concept-inline {
          background: rgba(126,231,255,0.12);
          border: 1px solid rgba(126,231,255,0.32);
          color: #a5f3fc;
          padding: 0 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .lp-concept-inline:hover {
          background: rgba(126,231,255,0.22);
          color: #eaf6ff;
        }
        .lp-concept-focus {
          box-shadow: 0 0 0 2px rgba(126,231,255,0.55);
        }
      `}</style>
    </div>
  )
}
