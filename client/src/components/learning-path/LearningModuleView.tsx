'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { LearningModule } from '@/data/learningPathCurriculum'
import { DEPTH_ORDER } from '@/data/learningPathCurriculum'
import { ChevronRight, Layers } from 'lucide-react'
import { loadLessonCompletion, moduleProgressPercent, syncLearningPathCompletion } from '@/lib/learningPathProgress'
import { useLearningPath } from '@/hooks/useLearningPath'
import { useAuthStore } from '@/store/useAuthStore'

type Props = { module: LearningModule }

function lessonCountForNode(node: LearningModule['nodes'][0]) {
  return DEPTH_ORDER.reduce((acc, d) => acc + (node.depths[d]?.length ?? 0), 0)
}

export default function LearningModuleView({ module }: Props) {
  const { modules } = useLearningPath()
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const m = modules.find((x) => x.id === module.id) ?? module
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const refresh = () =>
      setPct(moduleProgressPercent(loadLessonCompletion(userId), m.id, modules))
    const refreshAndSync = () => {
      refresh()
      void syncLearningPathCompletion(userId).then((synced) => {
        setPct(moduleProgressPercent(synced, m.id, modules))
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
  }, [m.id, modules, userId])

  return (
    <div className="min-h-screen bg-[#02040a] relative overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.2), transparent 55%)',
        }}
      />

      <main className="relative z-10 pt-20 pb-16 px-4 max-w-4xl mx-auto">
        <nav className="text-xs text-slate-500 mb-6 flex flex-wrap items-center gap-2">
          <Link href="/tutorial" className="hover:text-cyan-400 transition-colors">
            Learning Path
          </Link>
          <ChevronRight className="w-3 h-3 opacity-60" />
          <span className="text-slate-300">{m.titleVi}</span>
        </nav>

        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="text-4xl md:text-5xl">{module.emoji}</span>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                Module {module.order}
              </p>
              <h1
                className="text-2xl md:text-3xl font-bold text-white"
                style={{ fontFamily: 'var(--font-heading), Space Grotesk, sans-serif' }}
              >
                {module.titleVi}
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">{module.title}</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl border-l-2 border-cyan-500/40 pl-4">
            {module.goalVi}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Tiến độ module</span>
                <span className="text-cyan-300 tabular-nums">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500/90 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          </div>

          {m.connections.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {m.connections.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400"
                >
                  <Layers className="w-3 h-3 text-cyan-500/80" />
                  {c}
                </span>
              ))}
            </div>
          )}
        </motion.header>

        <motion.ul
          className="space-y-3"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        >
          <li className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
            Các chủ đề (nodes)
          </li>
          {m.nodes.map((node, i) => {
            const nLessons = lessonCountForNode(node)
            return (
              <motion.li
                key={node.id}
                variants={{
                  hidden: { opacity: 0, x: -6 },
                  show: { opacity: 1, x: 0 },
                }}
              >
                <Link
                  href={`/tutorial/${m.id}/${node.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-cyan-500/30 px-4 py-4 transition-all duration-300"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/10 border border-white/10 text-sm font-semibold text-cyan-200">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white group-hover:text-cyan-100 transition-colors">
                      {node.titleVi}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{node.title}</p>
                  </div>
                  <p className="hidden sm:block text-[10px] text-slate-500 uppercase tracking-wide shrink-0">
                    {nLessons} bài
                  </p>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              </motion.li>
            )
          })}
        </motion.ul>

        <div className="mt-10 pt-8 border-t border-white/10 flex flex-wrap justify-between gap-4">
          {m.order > 1 ? (
            <Link
              href={`/tutorial/${modules.find((x) => x.order === m.order - 1)?.id ?? ''}`}
              className="text-sm text-slate-400 hover:text-cyan-400 transition-colors"
            >
              ← Module trước
            </Link>
          ) : (
            <span />
          )}
          {m.order < 6 ? (
            <Link
              href={`/tutorial/${modules.find((x) => x.order === m.order + 1)?.id ?? ''}`}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Module tiếp theo →
            </Link>
          ) : (
            <Link href="/tutorial" className="text-sm text-cyan-400 hover:text-cyan-300">
              Về tổng quan →
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
