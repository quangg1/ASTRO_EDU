'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, ChevronRight, Flame, Gem, TrendingUp,
  Star, Users2, Wallet, CheckCircle2,
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import { useLearningPath } from '@/features/learning-path/public'
import {
  computeProgressPercent,
  loadLessonCompletion,
  loadLastLearningPathLessonId,
  syncLearningPathCompletion,
} from '@/features/learning-path/public'
import { loadCompletedMilestoneIds, syncSolarJourneyProgress } from '@/features/rewards/public'
import { getLessonById } from '@/data/learningPathCurriculum'
import { loadGemWallet, syncGemWallet } from '@/features/rewards/public'
import { fetchLearnerTiersWithProgress, type LearnerTierProgress } from '@/features/rewards/public'
import { useLiveClock } from '@/hooks/useLiveClock'
import { DashboardForYouPanel } from '@/components/onboarding/DashboardForYouPanel'
import { DashboardOnboardingWelcome } from '@/components/onboarding/DashboardOnboardingWelcome'

const chamfer = (cut = 18) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function Brackets({ c = '#7ee7ff', s = 14, o = 6 }: { c?: string; s?: number; o?: number }) {
  const b = (ex: React.CSSProperties) => ({
    position: 'absolute' as const, width: s, height: s, opacity: 0.85,
    pointerEvents: 'none' as const, ...ex,
  })
  return (
    <>
      <span style={b({ top: o, left: o, borderTop: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` })} />
      <span style={b({ top: o, right: o, borderTop: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` })} />
      <span style={b({ bottom: o, left: o, borderBottom: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` })} />
      <span style={b({ bottom: o, right: o, borderBottom: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` })} />
    </>
  )
}

function HudPanel({
  children, amber, className, style: extraStyle,
}: {
  children: React.ReactNode
  amber?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const accent = amber ? '#f5a524' : '#7ee7ff'
  const borderColor = amber ? 'rgba(245,165,36,0.35)' : 'rgba(126,231,255,0.2)'
  const bg = amber
    ? 'linear-gradient(135deg,rgba(18,10,2,0.97) 0%,rgba(24,14,3,0.95) 100%)'
    : 'rgba(6,9,26,0.92)'
  const glow = amber ? 'rgba(245,165,36,0.06)' : 'rgba(126,231,255,0.04)'
  return (
    <div
      className={`relative${className ? ' ' + className : ''}`}
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        boxShadow: `inset 0 0 24px ${glow}, 0 4px 32px rgba(0,0,0,0.4)`,
        transition: 'box-shadow 0.2s',
        ...chamfer(18),
        ...extraStyle,
      }}
    >
      <Brackets c={accent} />
      {children}
    </div>
  )
}

export default function DashboardOverviewPage() {
  const { user, checked, loading } = useAuthStore()
  const userId = user?.id ?? null
  const { modules } = useLearningPath()
  const [learningPathPct, setLearningPathPct] = useState(0)
  const [learningPathDoneCount, setLearningPathDoneCount] = useState(0)
  const [solarDoneCount, setSolarDoneCount] = useState(0)
  const [lastLessonId, setLastLessonId] = useState<string | null>(null)
  const [gemBalance, setGemBalance] = useState(0)
  const [tierProgress, setTierProgress] = useState<LearnerTierProgress | null>(null)
  const { time: localTime, zoneLabel } = useLiveClock()

  const gemProgressPct = tierProgress?.progressPct ?? 0
  const gemToNext = tierProgress?.gemsToNext ?? 0
  const tierCurrent = tierProgress?.current ?? null
  const tierNext = tierProgress?.next ?? null

  useEffect(() => {
    const refreshGems = () => setGemBalance(loadGemWallet(userId).balance)
    refreshGems()
    void syncGemWallet(userId).then((w) => setGemBalance(w.balance))
    window.addEventListener('gem-wallet-changed', refreshGems)
    return () => window.removeEventListener('gem-wallet-changed', refreshGems)
  }, [userId])

  useEffect(() => {
    let cancelled = false
    void fetchLearnerTiersWithProgress().then((res) => {
      if (!res || cancelled) return
      setTierProgress(res.progress)
    })
    return () => {
      cancelled = true
    }
  }, [])

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
    let total = 0, done = 0
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
  const pathSubtitle = 'Tiến độ lộ trình học và khóa đã ghi danh'

  if (!checked && loading) {
    return (
      <div
        className="relative p-6 text-sm"
        style={{ ...chamfer(14), border: '1px solid rgba(126,231,255,0.15)', background: 'rgba(6,9,26,0.9)', color: '#9aa8c4' }}
      >
        Đang đồng bộ thông tin học tập...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Head */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p
            className="dash-mono text-[10px] uppercase flex items-center gap-2"
            style={{ color: '#8a9bb8', letterSpacing: '0.18em', marginBottom: 50 }}
          >
            <span style={{ width: 20, height: 1, background: 'rgba(126,231,255,0.25)', display: 'inline-block', verticalAlign: 'middle' }} />
            // 01 · bảng điều khiển / tổng quan
          </p>
          <h1
            className="dash-font font-medium leading-none"
            style={{ fontSize: 'clamp(40px,4vw,56px)', letterSpacing: '-0.03em', color: '#eaf6ff' }}
          >
            Tổng <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#f5a524' }}>quan</em>
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#9aa8c4' }}>
            Theo dõi tiến độ và tiếp tục hành trình học của bạn.
          </p>
        </div>
        <div className="text-right" style={{ alignSelf: 'flex-start', paddingTop: 4 }}>
          <p className="dash-mono text-sm flex items-center justify-end gap-2" style={{ color: '#7ee7ff' }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#6dffb0', boxShadow: '0 0 5px #6dffb0' }} />
            {zoneLabel} {localTime}
          </p>
          <p className="dash-mono text-[11px] mt-0.5" style={{ color: '#5c6886' }}>
            PHIÊN <span style={{ color: '#7ee7ff' }}>#A-7321</span>
          </p>
        </div>
      </header>

      <Suspense fallback={null}>
        <DashboardOnboardingWelcome />
      </Suspense>
      <DashboardForYouPanel />

      {/* Stats Row — 3 cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Card 1 — Cấp độ */}
        <HudPanel style={{ padding: 20 }}>
          <p className="dash-mono text-[10px] uppercase mb-4" style={{ color: '#7ee7ff', letterSpacing: '0.18em' }}>
            // cấp độ
          </p>
          <div className="flex items-center gap-3 mb-5">
            <div
              className="relative flex items-center justify-center"
              style={{
                width: 48, height: 48, flexShrink: 0,
                border: '1.5px solid rgba(245,165,36,0.6)',
                boxShadow: '0 0 14px rgba(245,165,36,0.25)',
                ...chamfer(10),
              }}
            >
              <Star size={22} style={{ color: '#f5a524' }} strokeWidth={1.6} />
            </div>
            <div>
              <p className="text-[22px] font-semibold leading-tight" style={{ color: '#eaf6ff' }}>
                {tierCurrent?.nameVi || 'Mầm non'}
              </p>
              <p className="dash-mono text-[10px] mt-0.5" style={{ color: '#5c6886' }}>
                {tierCurrent ? `Đã kiếm ${tierProgress?.gemsEarned ?? 0} gem` : 'Học tập & khám phá'}
              </p>
            </div>
          </div>
          <div className="flex justify-between mb-1.5">
            <span className="dash-mono text-[10px]" style={{ color: '#5c6886' }}>
              {tierCurrent ? `${tierCurrent.minGemsEarned} Gem` : '0 Gem'}
            </span>
            <span className="dash-mono text-[10px]" style={{ color: '#5c6886' }}>
              {tierNext ? `${tierNext.minGemsEarned} Gem` : 'MAX'}
            </span>
          </div>
          <div
            className="relative overflow-hidden"
            style={{ height: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', ...chamfer(3) }}
          >
            <div
              style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${gemProgressPct}%`,
                background: 'linear-gradient(90deg,#f5a524,#ffd27a)',
                boxShadow: '0 0 8px rgba(245,165,36,0.7)',
                ...chamfer(3),
              }}
            />
            {gemProgressPct > 0 && (
              <span
                style={{
                  position: 'absolute', top: '50%', left: `${gemProgressPct}%`,
                  transform: 'translate(-50%,-50%)',
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 0 6px #fff, 0 0 12px #f5a524',
                }}
              />
            )}
          </div>
          <p className="text-xs mt-2" style={{ color: '#9aa8c4' }}>
            {tierNext ? (
              <>
                <span className="font-semibold" style={{ color: '#f5a524' }}>{gemToNext} Gem</span>
                {' '}đến cấp độ tiếp theo
              </>
            ) : (
              <span className="font-semibold" style={{ color: '#6dffb0' }}>Đã đạt hạng cao nhất</span>
            )}
          </p>
        </HudPanel>

        {/* Card 2 — Chuỗi ngày (amber variant) */}
        <HudPanel amber style={{ padding: 20 }}>
          <p className="dash-mono text-[10px] uppercase mb-4" style={{ color: '#f5a524', letterSpacing: '0.18em' }}>
            // chuỗi ngày hiện tại
          </p>
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center"
              style={{
                width: 64, height: 64, flexShrink: 0,
                border: '1.5px solid rgba(245,165,36,0.5)',
                boxShadow: '0 0 18px rgba(245,165,36,0.3)',
                ...chamfer(12),
              }}
            >
              <Flame size={32} style={{ color: '#f5a524' }} strokeWidth={1.5} />
            </div>
            <div>
              <p
                className="dash-font font-normal leading-none"
                style={{
                  fontSize: 64,
                  background: 'linear-gradient(180deg,#ffd27a 0%,#f5a524 60%,rgba(245,165,36,0.3) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                1
              </p>
              <p className="dash-mono text-[11px] uppercase mt-1" style={{ color: '#f5a524', letterSpacing: '0.15em' }}>
                // ngày
              </p>
            </div>
          </div>
          <div
            className="flex items-center justify-between mt-4 pt-3"
            style={{ borderTop: '1px dashed rgba(245,165,36,0.2)' }}
          >
            <span className="dash-mono text-[10px]" style={{ color: '#5c6886' }}>Chuỗi dài nhất</span>
            <span className="dash-mono text-[11px] font-medium" style={{ color: '#f5a524' }}>1 ngày</span>
          </div>
        </HudPanel>

        {/* Card 3 — Điểm cộng đồng / Gem */}
        <HudPanel style={{ padding: 20 }} className="sm:col-span-2 lg:col-span-1">
          <p className="dash-mono text-[10px] uppercase mb-4" style={{ color: '#7ee7ff', letterSpacing: '0.18em' }}>
            // điểm & phần thưởng
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="dash-mono text-[10px] uppercase mb-1 flex items-center gap-1.5" style={{ color: '#8a9bb8', letterSpacing: '0.12em' }}>
                <Users2 size={10} strokeWidth={1.6} />
                điểm cộng đồng
              </p>
              <p
                className="dash-font text-5xl font-normal leading-none"
                style={{
                  background: 'linear-gradient(180deg,#ffd27a 0%,#f5a524 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}
              >
                0
              </p>
            </div>
            <div>
              <p className="dash-mono text-[10px] uppercase mb-1 flex items-center gap-1.5" style={{ color: '#8a9bb8', letterSpacing: '0.12em' }}>
                <Gem size={10} strokeWidth={1.6} style={{ color: '#7ee7ff' }} />
                gem
              </p>
              <p
                className="dash-font text-5xl font-normal leading-none"
                style={{
                  background: 'linear-gradient(180deg,#ffd27a 0%,#f5a524 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}
              >
                {gemBalance}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { href: '/gem', icon: Wallet, label: 'Ví Gem' },
              { href: '/tutorial', icon: TrendingUp, label: 'Xem lộ trình' },
              { href: '/community', icon: BookOpen, label: 'Cộng đồng' },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 text-xs transition-all"
                style={{
                  padding: '6px 12px',
                  border: '1px solid rgba(126,231,255,0.25)',
                  background: 'rgba(126,231,255,0.06)',
                  color: '#9aa8c4',
                  fontFamily: 'JetBrains Mono, monospace',
                  ...chamfer(8),
                }}
              >
                <Icon size={11} strokeWidth={1.6} />
                {label}
              </Link>
            ))}
          </div>
          <p
            className="dash-mono text-[10px] pt-3"
            style={{ borderTop: '1px dashed rgba(126,231,255,0.1)', color: '#5c6886' }}
          >
            // Mốc Solar đã hoàn thành:{' '}
            <span style={{ color: '#7ee7ff' }}>{solarDoneCount}</span>
          </p>
        </HudPanel>
      </section>

      {/* Bottom Row — 2 panels */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Panel 1 — Khóa học của tôi */}
        <HudPanel style={{ padding: 24 }}>
          <div className="flex items-center justify-between gap-2 mb-5">
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center"
                style={{ width: 30, height: 30, border: '1px solid rgba(126,231,255,0.3)', ...chamfer(6) }}
              >
                <BookOpen size={14} strokeWidth={1.6} style={{ color: '#7ee7ff' }} />
              </div>
              <h2 className="text-sm font-semibold" style={{ color: '#eaf6ff' }}>Khóa học của tôi</h2>
            </div>
            <Link
              href="/my-courses"
              className="dash-mono text-[10px] uppercase flex items-center gap-0.5 transition-colors"
              style={{ color: '#7ee7ff', letterSpacing: '0.12em', textDecoration: 'underline', textDecorationColor: 'rgba(126,231,255,0.3)' }}
            >
              Xem tất cả <ChevronRight size={11} />
            </Link>
          </div>

          {userId && currentLearningPathModule ? (
            <Link
              href={`/tutorial/${currentLearningPathModule.module.id}`}
              className="block transition-all"
              style={{
                border: '1px solid rgba(126,231,255,0.2)',
                background: 'rgba(10,16,36,0.6)',
                padding: 16,
                ...chamfer(12),
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 flex items-center justify-center text-lg font-bold"
                  style={{
                    width: 48, height: 48,
                    border: '1.5px solid rgba(126,231,255,0.4)',
                    background: 'linear-gradient(135deg,rgba(126,231,255,0.15) 0%,rgba(77,210,255,0.08) 100%)',
                    color: '#7ee7ff',
                    boxShadow: '0 0 12px rgba(126,231,255,0.15)',
                    ...chamfer(8),
                  }}
                >
                  {pathTitle.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate" style={{ color: '#eaf6ff' }}>{pathTitle}</p>
                  <p className="text-sm truncate mt-0.5" style={{ color: '#9aa8c4' }}>{pathSubtitle}</p>
                  <div className="mt-3">
                    <div className="flex justify-between mb-1.5">
                      <span className="dash-mono text-[10px] uppercase" style={{ color: '#5c6886', letterSpacing: '0.1em' }}>Tiến độ</span>
                      <span className="dash-mono text-[10px]" style={{ color: '#7ee7ff' }}>{currentModulePct}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(126,231,255,0.08)', border: '1px solid rgba(126,231,255,0.12)', ...chamfer(2) }}>
                      <div
                        style={{
                          height: '100%', width: `${currentModulePct}%`,
                          background: 'linear-gradient(90deg,#7ee7ff,#4dd2ff)',
                          boxShadow: '0 0 6px rgba(126,231,255,0.6)',
                          transition: 'width 0.5s ease',
                          ...chamfer(2),
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div
              className="p-6 text-center"
              style={{ border: '1px dashed rgba(126,231,255,0.15)', background: 'rgba(126,231,255,0.02)', ...chamfer(10) }}
            >
              <p className="text-sm mb-3" style={{ color: '#5c6886' }}>
                {userId ? 'Hoàn thành một bài trong lộ trình học để thấy tiến độ tại đây.' : 'Đăng nhập để đồng bộ tiến độ.'}
              </p>
              <Link href="/tutorial" className="text-sm" style={{ color: '#7ee7ff' }}>
                Mở Lộ trình →
              </Link>
            </div>
          )}
        </HudPanel>

        {/* Panel 2 — Hoạt động gần đây */}
        <HudPanel style={{ padding: 24 }}>
          <div className="flex items-center gap-2.5 mb-5">
            <div
              className="flex items-center justify-center"
              style={{ width: 30, height: 30, border: '1px solid rgba(109,255,176,0.3)', ...chamfer(6) }}
            >
              <TrendingUp size={14} strokeWidth={1.6} style={{ color: '#6dffb0' }} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: '#eaf6ff' }}>Hoạt động gần đây</h2>
          </div>
          <ul className="space-y-3">
            {learningPathDoneCount > 0 ? (
              <li
                className="flex items-start gap-3"
                style={{ border: '1px solid rgba(109,255,176,0.15)', background: 'rgba(109,255,176,0.04)', padding: 12, ...chamfer(10) }}
              >
                <div
                  className="shrink-0 flex items-center justify-center mt-0.5"
                  style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid rgba(109,255,176,0.5)', background: 'rgba(109,255,176,0.1)', boxShadow: '0 0 8px rgba(109,255,176,0.2)' }}
                >
                  <CheckCircle2 size={13} strokeWidth={2} style={{ color: '#6dffb0' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm" style={{ color: '#eaf6ff' }}>
                    Lộ trình học — {learningPathDoneCount} bài đã hoàn thành
                  </p>
                  <p className="dash-mono text-[10px] mt-0.5" style={{ color: '#5c6886' }}>
                    // {learningPathPct}% tổng lộ trình
                  </p>
                </div>
                <span
                  className="dash-mono text-[11px] font-medium shrink-0"
                  style={{ color: '#f5a524', textShadow: '0 0 8px rgba(245,165,36,0.5)' }}
                >
                  +{learningPathDoneCount * 10} XP
                </span>
              </li>
            ) : (
              <li className="text-sm" style={{ color: '#5c6886' }}>
                Chưa có hoạt động. Bắt đầu từ Lộ trình hoặc khóa học.
              </li>
            )}
            {solarDoneCount > 0 && (
              <li
                className="flex items-start gap-3"
                style={{ border: '1px solid rgba(245,165,36,0.15)', background: 'rgba(245,165,36,0.04)', padding: 12, ...chamfer(10) }}
              >
                <div
                  className="shrink-0 flex items-center justify-center mt-0.5"
                  style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid rgba(245,165,36,0.5)', background: 'rgba(245,165,36,0.1)', boxShadow: '0 0 8px rgba(245,165,36,0.2)' }}
                >
                  <CheckCircle2 size={13} strokeWidth={2} style={{ color: '#f5a524' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm" style={{ color: '#eaf6ff' }}>
                    Khám phá — {solarDoneCount} mốc hành trình
                  </p>
                </div>
              </li>
            )}
          </ul>
        </HudPanel>
      </section>

    </div>
  )
}
