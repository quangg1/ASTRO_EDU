'use client'

import { useEffect, useMemo, useState } from 'react'
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
  return `<p class="text-slate-300 leading-relaxed">Nội dung bài học đang được biên soạn. Tiêu đề: <strong>${escapeHtmlTitle(lesson.titleVi)}</strong></p><p class="text-slate-500 text-sm mt-4">Giáo viên có thể thêm nội dung trong Studio → Learning Path.</p>`
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
  }

  return (
    <div className="min-h-screen bg-[#02040a] relative overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 opacity-25"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 80% 20%, rgba(236,72,153,0.12), transparent), radial-gradient(ellipse 50% 50% at 10% 60%, rgba(34,211,238,0.08), transparent)',
        }}
      />

      <main className="relative z-10 pt-20 pb-24 px-4 max-w-3xl mx-auto">
        <nav className="text-xs text-slate-500 mb-6 flex flex-wrap items-center gap-2">
          <Link href="/tutorial" className="hover:text-cyan-400 transition-colors">
            Learning Path
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
          className="mb-6"
        >
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-lg border border-white/10 bg-gradient-to-br ${meta.gradient}`}>
              {meta.short} {meta.labelVi}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500">
              {displayModule.emoji} Module {displayModule.order}
            </span>
          </div>
          <h1
            className="text-2xl md:text-3xl font-bold text-white mb-1"
            style={{ fontFamily: 'var(--font-heading), Space Grotesk, sans-serif' }}
          >
            {lesson.titleVi}
          </h1>
          {lesson.title ? <p className="text-slate-500 text-sm">{lesson.title}</p> : null}
        </motion.header>

        {sections.length > 0 ? (
          <div className="space-y-4 mb-8" onMouseMove={onConceptMouseMove} onMouseLeave={() => setTooltip(null)} onClick={onConceptClick}>
            {highlightedSections.map((sec, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-[#070b14]/90 p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                <SectionPreview sec={sec} index={i} />
              </div>
            ))}
          </div>
        ) : (
          <article
            className="prose prose-invert prose-sm md:prose-base max-w-none rounded-2xl border border-white/10 bg-[#070b14]/90 p-6 md:p-8 mb-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] [&_a]:text-cyan-400 [&_strong]:text-white"
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
            <h3 className="text-sm font-semibold text-cyan-100 mb-2">Concepts trong bài</h3>
            <div className="flex flex-wrap gap-2">
              {linkedConcepts.map((c) => (
                <button
                  key={`chip-${c.id}`}
                  type="button"
                  onClick={() => {
                    setActiveConceptId(c.id)
                    focusConceptInline(c.id)
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

        {activeConcept && (
          <section className="mb-8 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
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
            <p className="text-sm text-slate-300 mt-1">{activeConcept.explanation}</p>
            {activeConcept.examples?.length ? (
              <ul className="mt-2 list-disc pl-5">
                {activeConcept.examples.map((ex, i) => (
                  <li key={`${activeConcept.id}-detail-ex-${i}`} className="text-sm text-slate-300">
                    {ex}
                  </li>
                ))}
              </ul>
            ) : null}
            {activeConcept.related?.length ? (
              <div className="mt-3">
                <p className="text-xs text-slate-400 mb-1">Liên quan</p>
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
          </section>
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
