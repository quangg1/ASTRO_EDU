'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Layers } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { fetchMyCourses, type MyCourse } from '@/lib/coursesApi'
import { SkeletonList } from '@/components/ui/Skeleton'
import { fetchMyOrders, type Order } from '@/lib/paymentsApi'
import { useLearningPath } from '@/hooks/useLearningPath'
import { getLessonById } from '@/data/learningPathCurriculum'
import {
  loadLessonCompletion,
  loadLastLearningPathLessonId,
  moduleProgressPercent,
  syncLearningPathCompletion,
  countLessonsInLearningModule,
  countCompletedLessonsInModule,
  countFullyCompletedModules,
  computeProgressPercent,
} from '@/lib/learningPathProgress'

export default function MyCoursesPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [courses, setCourses] = useState<MyCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const { modules } = useLearningPath()
  const [lpExpanded, setLpExpanded] = useState(true)
  const [lpSnapshot, setLpSnapshot] = useState<{
    map: Record<string, boolean>
    lastHit: ReturnType<typeof getLessonById> | null
    pathPct: number
    modulesDone: number
    modulesTotal: number
  }>({
    map: {},
    lastHit: null,
    pathPct: 0,
    modulesDone: 0,
    modulesTotal: 0,
  })

  useEffect(() => {
    if (checked && !user) {
      router.replace('/login?redirect=/my-courses')
      return
    }
    if (!user) return
    Promise.all([fetchMyCourses(), fetchMyOrders()])
      .then(([cs, os]) => {
        setCourses(cs)
        setOrders(os)
      })
      .finally(() => setLoading(false))
  }, [checked, user, router])

  useEffect(() => {
    if (!user) return
    const refreshLp = () => {
      const map = loadLessonCompletion(user.id)
      const lastLessonId = loadLastLearningPathLessonId(user.id)
      const lastHit = lastLessonId ? getLessonById(lastLessonId, modules) ?? null : null
      const pathPct = computeProgressPercent(map, modules)
      const modulesTotal = modules.length
      const modulesDone = countFullyCompletedModules(map, modules)
      setLpSnapshot({ map, lastHit, pathPct, modulesDone, modulesTotal })
    }
    refreshLp()
    void syncLearningPathCompletion(user.id).then(() => refreshLp())
    window.addEventListener('lp-progress-changed', refreshLp)
    window.addEventListener('focus', refreshLp)
    return () => {
      window.removeEventListener('lp-progress-changed', refreshLp)
      window.removeEventListener('focus', refreshLp)
    }
  }, [user, modules])

  const currentModule = lpSnapshot.lastHit?.module
  const modulePct = currentModule
    ? moduleProgressPercent(lpSnapshot.map, currentModule.id, modules)
    : 0
  const doneInModule = currentModule
    ? countCompletedLessonsInModule(lpSnapshot.map, currentModule.id, modules)
    : 0
  const totalInModule = currentModule ? countLessonsInLearningModule(currentModule) : 0
  const partLabel = currentModule
    ? `PART ${String(currentModule.order).padStart(2, '0')}`
    : ''

  if (!checked || !user) {
    return <div className="min-h-screen bg-black pt-20 px-4 text-gray-400">Checking...</div>
  }

  return (
    <div className="min-h-screen bg-black">
      <main className="pt-16 px-4 pb-12 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-cyan-400 mt-8 mb-2">Khóa học của tôi</h1>
        <p className="text-gray-400 text-sm mb-8">
          Lộ trình học, tiến độ module và các khóa đã ghi danh.
        </p>

        {/* Learning Path — cha + con (cấu trúc như ảnh) */}
        <section className="mb-10">
          <div className="rounded-2xl border border-violet-500/25 bg-[#12101c] shadow-[0_8px_40px_rgba(0,0,0,0.35)] overflow-hidden">
            <button
              type="button"
              onClick={() => setLpExpanded((e) => !e)}
              className="w-full flex items-start justify-between gap-4 p-5 sm:p-6 text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/30 border border-violet-500/30">
                  <Layers className="w-4 h-4 text-violet-200" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-violet-300/80 mb-1">Learning Path</p>
                  <h2 className="text-lg font-semibold text-white">Cosmo Learn — Lộ trình</h2>
                  <p className="text-sm text-slate-400 mt-1 max-w-xl">
                    Học theo module: thiên văn, Trái Đất, Hệ Mặt Trời… Tiến độ lưu theo tài khoản.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Module đã hoàn thành
                  </p>
                  <p className="text-sm font-semibold text-white tabular-nums">
                    {lpSnapshot.modulesDone} / {lpSnapshot.modulesTotal}
                  </p>
                </div>
                {lpExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-500" />
                )}
              </div>
            </button>
            <div className="h-1.5 mx-5 sm:mx-6 mb-4 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${lpSnapshot.pathPct}%` }}
              />
            </div>

            {lpExpanded && currentModule && lpSnapshot.lastHit ? (
              <div className="relative px-5 sm:px-6 pb-6">
                <div className="absolute left-8 sm:left-9 top-0 bottom-8 w-px bg-gradient-to-b from-cyan-500/40 to-transparent" />
                <div className="relative ml-4 sm:ml-5 pl-6 border-l border-cyan-500/20">
                  <div className="absolute -left-[7px] top-5 h-3 w-3 rounded-full bg-cyan-500 border-2 border-[#12101c]" />
                  <div className="rounded-2xl border border-cyan-500/25 bg-[#0c0a12] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="inline-block text-[10px] uppercase tracking-wider text-cyan-400/90 mb-1">
                          {partLabel}
                        </span>
                        <h3 className="text-base font-semibold text-white">{currentModule.titleVi}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{currentModule.goalVi}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-1 text-[10px] font-medium text-cyan-200">
                        ĐANG HỌC
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-300">
                        beginner
                      </span>
                      <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-slate-400">
                        {totalInModule} bài học
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-4 text-sm">
                      <span className="text-slate-400">
                        <span className="text-white font-medium tabular-nums">{doneInModule}</span>
                        <span className="text-slate-500"> / </span>
                        <span className="tabular-nums">{totalInModule}</span>
                        <span className="text-slate-500 text-xs ml-1 uppercase">bài học</span>
                      </span>
                      <span className="text-cyan-300 font-semibold tabular-nums">{modulePct}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                        style={{ width: `${modulePct}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2 truncate">Gần nhất: {lpSnapshot.lastHit.lesson.titleVi}</p>
                    <Link
                      href={`/tutorial/${currentModule.id}`}
                      className="inline-block mt-4 text-sm text-cyan-400 hover:text-cyan-300"
                    >
                      Tiếp tục module →
                    </Link>
                  </div>
                </div>
              </div>
            ) : lpExpanded ? (
              <div className="px-5 sm:px-6 pb-6">
                <p className="text-sm text-slate-500 pl-2">
                  Hoàn thành ít nhất một bài trong Learning Path để hiển thị module đang học.
                </p>
                <Link href="/tutorial" className="inline-block mt-2 text-sm text-cyan-400 hover:underline pl-2">
                  Mở lộ trình →
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        <h2 className="text-lg font-semibold text-white mb-3">Khóa đã ghi danh</h2>
        {loading ? (
          <SkeletonList count={3} />
        ) : courses.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#0a0f17] p-8 text-center mb-10">
            <p className="text-gray-500 mb-4">Bạn chưa ghi danh khóa học trả phí nào.</p>
            <Link
              href="/courses"
              className="inline-block px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-500 transition-colors"
            >
              Xem khóa học
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 mb-10">
            {courses.map((c) => (
              <Link
                key={c.id}
                href={`/courses/${c.slug}`}
                className="block glass rounded-xl p-5 hover:bg-white/10 transition-colors border border-white/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-white mb-1">{c.title}</h2>
                    <p className="text-sm text-gray-400 line-clamp-2 mb-2">{c.description || 'Course'}</p>
                    <div className="flex items-center gap-3 text-xs text-cyan-400/80">
                      <span>
                        {c.completedCount}/{c.totalLessons} lessons
                      </span>
                      <span>{c.percentComplete}% complete</span>
                    </div>
                  </div>
                  <div className="w-24 shrink-0 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                    <span className="text-lg font-bold text-cyan-400">{c.percentComplete}%</span>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyan-500/80 transition-all"
                    style={{ width: `${c.percentComplete}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Lịch sử đơn hàng</h2>
          {loading ? (
            <SkeletonList count={1} />
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-500">Chưa có đơn thanh toán.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0a0f17]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-500 uppercase">
                    <th className="px-4 py-2 text-left">Course</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o._id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-2">
                        <Link href={`/courses/${o.courseSlug}`} className="text-cyan-400 hover:text-cyan-300">
                          {o.courseSlug}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-gray-200">
                        {o.currency === 'USD'
                          ? `$${o.amount.toFixed(2)}`
                          : `${o.amount.toLocaleString('en-US')} ₫`}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            o.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : o.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-400">
                        {new Date(o.createdAt).toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
