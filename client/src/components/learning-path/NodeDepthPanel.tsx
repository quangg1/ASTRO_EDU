'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import type { DepthLevel, LearningModule, LearningNode } from '@/data/learningPathCurriculum'
import { DEPTH_META, DEPTH_ORDER } from '@/data/learningPathCurriculum'
import {
  loadLessonCompletion,
  loadLessonMastery,
  loadLessonVisited3D,
  syncLearningPathCompletion,
  isLessonComplete,
  isLessonMastered,
  type LessonCompletionMap,
  type LessonMasteryMap,
  type LessonVisited3DMap,
} from '@/lib/learningPathProgress'
import { trackLearningPathBehavior } from '@/lib/learningPathBehavior'
import { Award, CheckCircle2, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { suggestShowcaseTargetForLesson } from '@/lib/showcaseLearningBridge'

type Props = {
  module: LearningModule
  node: LearningNode
}

export default function NodeDepthPanel({ module, node }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const depths = useMemo(() => DEPTH_ORDER.filter((d) => (node.depths[d]?.length ?? 0) > 0), [node])
  const [active, setActive] = useState<DepthLevel>(depths[0] ?? 'beginner')
  const [completion, setCompletion] = useState<LessonCompletionMap>({})
  const [mastery, setMastery] = useState<LessonMasteryMap>({})
  const [visited3D, setVisited3D] = useState<LessonVisited3DMap>({})

  useEffect(() => {
    const refresh = () => {
      setCompletion(loadLessonCompletion(userId))
      setMastery(loadLessonMastery(userId))
      setVisited3D(loadLessonVisited3D(userId))
    }
    const refreshAndSync = () => {
      refresh()
      void syncLearningPathCompletion(userId).then((synced) => {
        setCompletion(synced)
        setMastery(loadLessonMastery(userId))
        setVisited3D(loadLessonVisited3D(userId))
      })
    }
    refreshAndSync()
    window.addEventListener('focus', refreshAndSync)
    window.addEventListener('storage', refreshAndSync)
    window.addEventListener('lp-progress-changed', refreshAndSync)
    return () => {
      window.removeEventListener('focus', refreshAndSync)
      window.removeEventListener('storage', refreshAndSync)
      window.removeEventListener('lp-progress-changed', refreshAndSync)
    }
  }, [userId])

  useEffect(() => {
    if (depths.length && !depths.includes(active)) setActive(depths[0])
  }, [depths, active])

  const lessons = node.depths[active] ?? []

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap gap-2 p-1 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md"
        role="tablist"
      >
        {depths.map((d) => {
          const meta = DEPTH_META[d]
          const isOn = active === d
          const count = node.depths[d]?.length ?? 0
          const doneCount = (node.depths[d] ?? []).filter((l) => isLessonComplete(completion, l.id)).length
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={isOn}
              onClick={() => {
                if (d !== active) {
                  trackLearningPathBehavior({
                    eventName: 'lp_depth_switched',
                    moduleId: module.id,
                    nodeId: node.id,
                    depth: d,
                    metadata: { fromDepth: active, toDepth: d },
                  })
                }
                setActive(d)
              }}
              className={`relative flex-1 min-w-[140px] rounded-xl px-4 py-3 text-left transition-all duration-300 ${
                isOn
                  ? `bg-gradient-to-br ${meta.gradient} border border-white/20 shadow-[0_0_24px_rgba(56,189,248,0.15)]`
                  : 'border border-transparent hover:bg-white/5'
              }`}
            >
              <span className="text-lg mr-1">{meta.short}</span>
              <span className={`text-sm font-semibold ${isOn ? 'text-white' : 'text-slate-400'}`}>
                {meta.label}
              </span>
              <span className={`ml-2 text-[10px] uppercase tracking-wider ${meta.color}`}>
                {meta.labelVi}
              </span>
              <span className="absolute top-2 right-2 text-[10px] text-slate-500 tabular-nums">
                {doneCount}/{count}
              </span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-white/10 bg-[#070b14]/90 p-4 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          <p className="text-xs text-slate-500 mb-4">
            Chọn một bài để đọc nội dung chi tiết — mỗi dòng là một trang học riêng.
          </p>
          <ul className="space-y-2">
            {lessons.map((lesson, i) => {
              const done = isLessonComplete(completion, lesson.id)
              const mast = isLessonMastered(mastery, lesson.id)
              const href = `/tutorial/${encodeURIComponent(module.id)}/${encodeURIComponent(node.id)}/${encodeURIComponent(lesson.id)}`
              const showcaseJump = suggestShowcaseTargetForLesson(lesson)
              const visitedScene = !!visited3D[lesson.id]
              return (
                <motion.li
                  key={lesson.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <Link
                      href={href}
                      className="group flex items-center gap-3 hover:text-white"
                    >
                      {mast ? (
                        <Award className="w-5 h-5 shrink-0 text-violet-300" aria-label="Đã nắm" />
                      ) : done ? (
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" aria-hidden />
                      ) : (
                        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                      )}
                      <span className="flex-1 text-slate-200 text-sm md:text-base group-hover:text-white">
                        {lesson.titleVi}
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 shrink-0 transition-colors" />
                    </Link>
                    {showcaseJump ? (
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
                        <p className={`text-[11px] ${visitedScene ? 'text-emerald-300' : 'text-amber-200'}`}>
                          {visitedScene ? 'Đã khám phá 3D liên quan' : 'Bạn chưa khám phá entity 3D liên quan'}
                        </p>
                        {!visitedScene ? (
                          <Link
                            href={showcaseJump.href}
                            onClick={() =>
                              trackLearningPathBehavior({
                                eventName: 'lp_lesson_opened',
                                moduleId: module.id,
                                nodeId: node.id,
                                lessonId: lesson.id,
                                depth: active,
                                metadata: { source: 'learning-cta-to-showcase', entityId: showcaseJump.entityId },
                              })
                            }
                            className="rounded-md border border-cyan-400/40 bg-cyan-500/20 px-2 py-1 text-[11px] font-medium text-cyan-100 hover:bg-cyan-500/30"
                          >
                            Khám phá 3D
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </motion.li>
              )
            })}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
