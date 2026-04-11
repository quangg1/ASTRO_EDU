'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookOpen, ChevronRight, Flame, Gem, Sparkles, TrendingUp } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useLearningPath } from '@/hooks/useLearningPath'
import {
  computeProgressPercent,
  loadLessonCompletion,
  loadLastLearningPathLessonId,
  syncLearningPathCompletion,
} from '@/lib/learningPathProgress'
import { loadCompletedMilestoneIds, syncSolarJourneyProgress } from '@/lib/solarJourneyProgress'
import { getLessonById } from '@/data/learningPathCurriculum'
import { loadGemWallet, syncGemWallet } from '@/lib/gemWallet'

/** Tổng quan: chỉ số chung + 2 cột Khóa học / Hoạt động (cấu trúc giống ảnh). */
export default function DashboardOverviewPage() {
  const { user } = useAuthStore()
  const userId = user?.id ?? null
  const { modules } = useLearningPath()
  const [learningPathPct, setLearningPathPct] = useState(0)
  const [learningPathDoneCount, setLearningPathDoneCount] = useState(0)
  const [solarDoneCount, setSolarDoneCount] = useState(0)
  const [lastLessonId, setLastLessonId] = useState<string | null>(null)
  const [gemBalance, setGemBalance] = useState(0)

  const gemNextMilestone = 100
  const gemProgressPct = Math.min(100, Math.round((gemBalance / gemNextMilestone) * 100))
  const gemToNext = Math.max(0, gemNextMilestone - gemBalance)

  useEffect(() => {
    const refreshGems = () => setGemBalance(loadGemWallet(userId).balance)
    refreshGems()
    void syncGemWallet(userId).then((w) => setGemBalance(w.balance))
    window.addEventListener('gem-wallet-changed', refreshGems)
    return () => window.removeEventListener('gem-wallet-changed', refreshGems)
  }, [userId])

  useEffect(() => {
    const localMap = loadLessonCompletion(userId)
    setLearningPathPct(computeProgressPercent(localMap, modules))
    setLearningPathDoneCount(Object.keys(localMap).filter((id) => !!localMap[id]).length)
    setLastLessonId(loadLastLearningPathLessonId(userId))
    void syncLearningPathCompletion(userId).then((synced) => {
      setLearningPathPct(computeProgressPercent(synced, modules))
      setLearningPathDoneCount(Object.keys(synced).filter((id) => !!synced[id]).length)
      setLastLessonId(loadLastLearningPathLessonId(userId))
    })

    const localMilestones = loadCompletedMilestoneIds(userId)
    setSolarDoneCount(localMilestones.size)
    void syncSolarJourneyProgress(userId).then((synced) => setSolarDoneCount(synced.size))
  }, [userId, modules])

  const currentLearningPathModule = useMemo(() => {
    if (!lastLessonId) return null
    return getLessonById(lastLessonId, modules) ?? null
  }, [lastLessonId, modules])

  const currentModulePct = useMemo(() => {
    if (!currentLearningPathModule) return 0
    const local = loadLessonCompletion(userId)
    const mod = currentLearningPathModule.module
    let total = 0
    let done = 0
    for (const node of mod.nodes) {
      for (const d of ['beginner', 'explorer', 'researcher'] as const) {
        for (const le of node.depths[d] ?? []) {
          total += 1
          if (local[le.id]) done += 1
        }
      }
    }
    return total ? Math.round((done / total) * 100) : 0
  }, [currentLearningPathModule, userId])

  const pathTitle = currentLearningPathModule?.module.titleVi ?? 'Lộ trình học'
  const pathSubtitle = 'Tiến độ Learning Path & khóa đã ghi danh'

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Tổng quan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Check your progress and resume your learning journeys.
        </p>
      </header>

      {/* Hàng chỉ số chung — giữ card hiện tại, chỉ bố cục 3 cột */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <article className="rounded-2xl border border-violet-500/25 bg-[#12101c] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Cấp độ</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600/40 to-fuchsia-600/30 border border-white/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-violet-200" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Mầm non</p>
              <p className="text-xs text-slate-500">Học tập & khám phá</p>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>10 Gem</span>
            <span>100 Gem</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
            <div className="h-full w-[10%] rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" />
          </div>
          <p className="text-xs text-slate-500 mt-2">90 Gem đến cấp độ tiếp theo</p>
        </article>

        <article className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-950/40 to-[#12101c] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Chuỗi ngày hiện tại</p>
          <div className="flex items-center gap-3">
            <Flame className="w-10 h-10 text-orange-400" />
            <div>
              <p className="text-3xl font-bold text-orange-200 tabular-nums">1</p>
              <p className="text-sm text-orange-200/80">ngày</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 border-t border-white/10 pt-3">Chuỗi dài nhất: 1 ngày</p>
        </article>

        <article className="rounded-2xl border border-cyan-500/25 bg-[#12101c] p-5 sm:col-span-2 lg:col-span-1 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Điểm cộng đồng</p>
              <p className="text-2xl font-semibold text-white tabular-nums">0</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <Gem className="w-3.5 h-3.5 text-cyan-400" /> Gem
              </p>
              <p className="text-2xl font-semibold text-cyan-200 tabular-nums">{gemBalance}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/gem"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20"
            >
              <Gem className="w-3.5 h-3.5" /> Gem Wallet
            </Link>
            <Link
              href="/tutorial"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
            >
              <BookOpen className="w-3.5 h-3.5" /> Browse Paths
            </Link>
            <Link
              href="/community"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
            >
              <TrendingUp className="w-3.5 h-3.5" /> Community
            </Link>
          </div>
          <p className="text-[10px] text-slate-600 mt-3">Solar milestones: {solarDoneCount}</p>
        </article>
      </section>

      {/* Hai cột: Khóa học của tôi | Hoạt động gần đây */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article className="rounded-2xl border border-white/10 bg-[#0c0a12] p-5 sm:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400/80" />
              <h2 className="text-sm font-semibold text-white">Khóa học của tôi</h2>
            </div>
            <Link href="/my-courses" className="text-xs text-cyan-400/90 hover:text-cyan-300 flex items-center gap-0.5">
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {userId && currentLearningPathModule ? (
            <Link
              href={`/tutorial/${currentLearningPathModule.module.id}`}
              className="block rounded-xl border border-cyan-500/20 bg-[#12101c] p-4 hover:border-cyan-500/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-cyan-600/30 to-blue-600/20 border border-white/10 flex items-center justify-center text-lg font-bold text-cyan-200">
                  {pathTitle.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white truncate">{pathTitle}</p>
                  <p className="text-sm text-slate-400 truncate">{pathSubtitle}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Progress</span>
                      <span className="text-cyan-300 tabular-nums">{currentModulePct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500/90 transition-all"
                        style={{ width: `${currentModulePct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
              <p className="text-sm text-slate-500 mb-3">
                {userId
                  ? 'Hoàn thành một bài trong Learning Path để thấy tiến độ tại đây.'
                  : 'Đăng nhập để đồng bộ tiến độ.'}
              </p>
              <Link href="/tutorial" className="text-sm text-cyan-400 hover:underline">
                Mở Lộ trình →
              </Link>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#0c0a12] p-5 sm:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400/80" />
            <h2 className="text-sm font-semibold text-white">Hoạt động gần đây</h2>
          </div>
          <ul className="space-y-3">
            {learningPathDoneCount > 0 ? (
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                  ✓
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200">Learning Path — {learningPathDoneCount} bài đã hoàn thành</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{learningPathPct}% tổng lộ trình</p>
                </div>
                <span className="text-xs text-emerald-400/90 tabular-nums">+{learningPathDoneCount * 10} XP</span>
              </li>
            ) : (
              <li className="text-sm text-slate-500">Chưa có hoạt động. Bắt đầu từ Lộ trình hoặc khóa học.</li>
            )}
            {solarDoneCount > 0 && (
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-300 text-xs">
                  ✓
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200">Explore — {solarDoneCount} mốc hành trình</p>
                </div>
              </li>
            )}
          </ul>
        </article>
      </section>
    </div>
  )
}
