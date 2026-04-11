'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  computeProgressPercent,
  loadLessonCompletion,
  moduleProgressPercent,
  syncLearningPathCompletion,
} from '@/lib/learningPathProgress'
import { Sparkles, Orbit } from 'lucide-react'
import { useLearningPath } from '@/hooks/useLearningPath'
import { useAuthStore } from '@/store/useAuthStore'

export default function LearningPathHub() {
  const { modules } = useLearningPath()
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const [pct, setPct] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [progressTick, setProgressTick] = useState(0)

  useEffect(() => {
    setMounted(true)
    const local = loadLessonCompletion(userId)
    setPct(computeProgressPercent(local, modules))
    void syncLearningPathCompletion(userId).then((synced) => {
      setPct(computeProgressPercent(synced, modules))
    })
  }, [progressTick, modules, userId])

  useEffect(() => {
    const bump = () => setProgressTick((t) => t + 1)
    const onVis = () => {
      if (document.visibilityState === 'visible') bump()
    }
    window.addEventListener('focus', bump)
    window.addEventListener('storage', bump)
    window.addEventListener('lp-progress-changed', bump)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', bump)
      window.removeEventListener('storage', bump)
      window.removeEventListener('lp-progress-changed', bump)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const modulePcts = useMemo(() => {
    if (!mounted) return {} as Record<string, number>
    const map = loadLessonCompletion(userId)
    const o: Record<string, number> = {}
    for (const m of modules) {
      o[m.id] = moduleProgressPercent(map, m.id, modules)
    }
    return o
  }, [mounted, progressTick, modules, userId, pct])

  return (
    <div className="min-h-screen bg-[#02040a] relative overflow-hidden">
      {/* ambient */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56,189,248,0.25), transparent 50%), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(139,92,246,0.12), transparent), radial-gradient(ellipse 50% 30% at 0% 80%, rgba(34,211,238,0.08), transparent)',
        }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />

      <main className="relative z-10 pt-20 pb-16 px-4 max-w-6xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-200/90 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Lộ trình 6 module
            <Orbit className="w-3.5 h-3.5 opacity-80" />
          </div>
          <h1
            className="text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight"
            style={{ fontFamily: 'var(--font-heading), Space Grotesk, sans-serif' }}
          >
            Learning Path
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Mỗi chủ đề có ba tầng (Beginner → Explorer → Researcher); trong mỗi tầng, từng ý nhỏ là một{' '}
            <strong className="text-slate-300">bài học riêng</strong>. Tiến độ theo từng bài, lưu trên trình duyệt.
          </p>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mt-8 flex flex-col items-center gap-3"
          >
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>Tổng tiến độ</span>
              <span className="text-cyan-300 font-semibold tabular-nums">{mounted ? pct : '—'}%</span>
            </div>
            <div className="w-full max-w-md h-2.5 rounded-full bg-white/5 border border-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-violet-500"
                initial={{ width: 0 }}
                animate={{ width: mounted ? `${pct}%` : '0%' }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </motion.div>
        </motion.header>

        <motion.ul
          className="grid gap-6 grid-cols-1 md:grid-cols-2"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {modules.map((m) => {
            const mp = modulePcts[m.id] ?? 0
            return (
              <motion.li
                key={m.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                }}
              >
                <Link
                  href={`/tutorial/${m.id}`}
                  className="group block h-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-6 md:p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] hover:border-cyan-500/35 hover:shadow-[0_20px_50px_-20px_rgba(34,211,238,0.25)] transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl md:text-4xl drop-shadow-lg" aria-hidden>
                        {m.emoji}
                      </span>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
                          Module {m.order}
                        </p>
                        <h2 className="text-lg md:text-xl font-semibold text-white group-hover:text-cyan-100 transition-colors">
                          {m.titleVi}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">{m.title}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-cyan-500/10 border border-cyan-500/25 px-2.5 py-1 text-xs font-medium text-cyan-200/90 tabular-nums">
                      {mp}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4 line-clamp-2">{m.goalVi}</p>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-4">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-cyan-400/90 transition-all duration-500"
                      style={{ width: `${mp}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500">{m.nodes.length} chủ đề</span>
                    <span className="text-cyan-400/90 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                      Mở module
                      <span aria-hidden>→</span>
                    </span>
                  </div>
                </Link>
              </motion.li>
            )
          })}
        </motion.ul>
      </main>
    </div>
  )
}
