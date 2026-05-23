'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { LearningModule, LearningNode } from '@/data/learningPathCurriculum'
import { getLearningPathNeighbors } from '@/data/learningPathCurriculum'
import NodeDepthPanel from '@/components/learning-path/NodeDepthPanel'
import { trackLearningPathBehavior, useLearningPath } from '@/features/learning-path/public'

type Props = {
  module: LearningModule
  node: LearningNode
}

export default function LearningNodeView({ module, node }: Props) {
  const { modules } = useLearningPath()
  const m = modules.find((x) => x.id === module.id) ?? module
  const n = m.nodes.find((x) => x.id === node.id) ?? node
  const { prev, next } = getLearningPathNeighbors(m.id, n.id, modules)

  useEffect(() => {
    trackLearningPathBehavior({
      eventName: 'lp_node_viewed',
      moduleId: m.id,
      nodeId: n.id,
    })
  }, [m.id, n.id])

  return (
    <div className="min-h-screen bg-ds-base relative overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 opacity-25"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 80% 20%, rgba(236,72,153,0.12), transparent), radial-gradient(ellipse 50% 50% at 10% 60%, rgba(34,211,238,0.08), transparent)',
        }}
      />

      <main className="relative z-10 pt-20 pb-20 px-4 max-w-3xl mx-auto">
        <nav className="text-xs text-ds-subtle mb-6 flex flex-wrap items-center gap-2">
          <Link href="/tutorial" className="hover:text-ds-accent transition-colors">
            Learning Path
          </Link>
          <span className="opacity-50">/</span>
          <Link href={`/tutorial/${module.id}`} className="hover:text-ds-accent transition-colors truncate max-w-[40vw]">
            {module.titleVi}
          </Link>
          <span className="opacity-50">/</span>
          <span className="text-slate-300 truncate">{node.titleVi}</span>
        </nav>

        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-[10px] uppercase tracking-widest text-ds-subtle mb-2">
            {m.emoji} Module {m.order}
          </p>
          <h1
            className="text-2xl md:text-3xl font-bold text-ds-text mb-2"
            style={{ fontFamily: 'var(--font-heading), Space Grotesk, sans-serif' }}
          >
            {n.titleVi}
          </h1>
          <p className="text-ds-subtle text-sm">{n.title}</p>
        </motion.header>

        <NodeDepthPanel module={m} node={n} />

        <nav className="mt-12 flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-stretch">
          {prev ? (
            <Link
              href={`/tutorial/${prev.moduleId}/${prev.nodeId}`}
              className="group flex-1 rounded-xl border border-ds-border bg-white/[0.02] px-4 py-3 hover:border-ds-border-strong hover:bg-white/[0.04] transition-all"
            >
              <span className="text-[10px] uppercase tracking-wider text-ds-subtle flex items-center gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> Trước
              </span>
              <p className="text-sm font-medium text-slate-200 group-hover:text-cyan-200 mt-1 line-clamp-2">
                {prev.titleVi}
              </p>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {next ? (
            <Link
              href={`/tutorial/${next.moduleId}/${next.nodeId}`}
              className="group flex-1 rounded-xl border border-ds-accent-strong bg-ds-accent-soft px-4 py-3 hover:border-ds-accent hover:bg-ds-accent-strong transition-all text-right sm:text-right"
            >
              <span className="text-[10px] uppercase tracking-wider text-ds-accent flex items-center justify-end gap-1">
                Tiếp <ChevronRight className="w-3.5 h-3.5" />
              </span>
              <p className="text-sm font-medium text-cyan-100 group-hover:text-ds-text mt-1 line-clamp-2">
                {next.titleVi}
              </p>
            </Link>
          ) : (
            <Link
              href="/tutorial"
              className="flex-1 rounded-xl border border-ds-border bg-white/[0.02] px-4 py-3 text-center sm:text-right hover:bg-white/[0.05] transition-all"
            >
              <span className="text-[10px] uppercase tracking-wider text-ds-subtle">Hoàn thành lộ trình</span>
              <p className="text-sm font-medium text-ds-accent mt-1">Về tổng quan →</p>
            </Link>
          )}
        </nav>
      </main>
    </div>
  )
}
