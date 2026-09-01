'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Layers, Lock } from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import { fetchMyCourses, type MyCourse } from '../../api/coursesApi'
import { SkeletonList } from '@/components/ui/Skeleton'
import { fetchMyOrders, orderStatusLabelVi, type Order } from '@/features/payment/public'
import { formatOrderAmount, formatVnd, sumCompletedOrdersVnd } from '@/lib/money'
import { useLiveClock } from '@/hooks/useLiveClock'
import { getLessonById } from '@/data/learningPathCurriculum'
import {
  useLearningPath,
  loadLessonCompletion,
  loadLastLearningPathLessonId,
  moduleProgressPercent,
  syncLearningPathCompletion,
  countLessonsInLearningModule,
  countCompletedLessonsInModule,
  countFullyCompletedModules,
  computeProgressPercent,
} from '@/features/learning-path/public'

// ─── design primitives ───────────────────────────────────────────────────────

const chamfer = (cut = 14) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function Brackets({
  c = 'var(--color-accent)',
  s = 14,
  o = 7,
}: { c?: string; s?: number; o?: number }) {
  const b = (ex: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    width: s,
    height: s,
    opacity: 0.85,
    pointerEvents: 'none',
    ...ex,
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
  children,
  className,
  style: extra,
  cut = 18,
  accent = 'var(--color-accent)',
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  cut?: number
  accent?: string
}) {
  const borderColor = accent === 'var(--color-brand-amber)'
    ? 'rgba(245,165,36,0.28)'
    : accent === '#b76dff'
      ? 'rgba(183,109,255,0.28)'
      : 'var(--color-accent-soft)'
  const glow = accent === 'var(--color-brand-amber)'
    ? 'rgba(245,165,36,0.05)'
    : accent === '#b76dff'
      ? 'rgba(183,109,255,0.05)'
      : 'rgba(126,231,255,0.04)'
  return (
    <div
      className={`relative cosmo-dark-panel rounded-2xl${className ? ` ${className}` : ''}`}
      style={{
        border: `1px solid ${borderColor}`,
        boxShadow: `inset 0 0 28px ${glow}, 0 12px 36px rgba(0,0,0,0.35)`,
        ...chamfer(cut),
        ...extra,
      }}
    >
      <Brackets c={accent} />
      {children}
    </div>
  )
}

// ─── main page ───────────────────────────────────────────────────────────────

export function MyCoursesPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [courses, setCourses] = useState<MyCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const { time: localTime, zoneLabel } = useLiveClock()
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
  }, [checked, user?.id, router])

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
    return () => {
      window.removeEventListener('lp-progress-changed', refreshLp)
    }
  }, [user?.id, modules])

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
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg-base)', fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)', fontSize: 13 }}
      >
        // syncing...
      </div>
    )
  }

  // derived order stats
  const completedOrders = orders.filter((o) => o.status === 'completed').length
  const totalValueVnd = sumCompletedOrdersVnd(orders)

  const amountStr = (o: Order) => formatOrderAmount(o.amount, o.currency)

  return (
    <div
      className="w-full"
      style={{
        fontFamily: 'Space Grotesk, sans-serif',
        color: 'var(--color-text-primary)',
      }}
    >
      <div className="relative z-10 w-full max-w-[1280px] mx-auto">

        {/* ① Page head */}
        <header
          className="flex items-start justify-between gap-4 flex-wrap mb-10"
          style={{ borderBottom: '1px solid rgba(126,231,255,0.08)', paddingBottom: 28 }}
        >
          <div>
            <p
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#8a9bb8',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <span style={{ width: 20, height: 1, background: 'rgba(126,231,255,0.25)', display: 'inline-block' }} />
              // 02 · my courses / learning path
            </p>
            <h1
              style={{
                fontSize: 'clamp(36px,4.5vw,58px)',
                fontWeight: 500,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                color: 'var(--color-text-primary)',
              }}
            >
              Khóa học{' '}
              <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--color-brand-amber)' }}>của tôi</em>
            </h1>
            <p style={{ marginTop: 10, fontSize: 14, color: 'var(--color-text-muted)', maxWidth: 520 }}>
              Lộ trình học, tiến độ module và các khóa đã ghi danh — đồng bộ theo tài khoản, cập nhật theo thời gian thực.
            </p>
          </div>
          <div style={{ textAlign: 'right', paddingTop: 4, flexShrink: 0 }}>
            <p
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13,
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 7,
              }}
            >
              <span
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#6dffb0',
                  boxShadow: '0 0 6px #6dffb0',
                  display: 'inline-block',
                }}
              />
              {zoneLabel} {localTime}
            </p>
            <p
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                color: 'var(--color-text-subtle)',
                marginTop: 4,
              }}
            >
              PHIÊN <span style={{ color: 'var(--color-accent)' }}>#A-7321</span>
            </p>
          </div>
        </header>

        {/* ② Learning Path */}
        <section style={{ marginBottom: 40 }}>
          <HudPanel cut={22} accent="#b76dff" style={{ overflow: 'hidden' }}>
            {/* header row */}
            <div
              className="flex items-start justify-between gap-4 flex-wrap"
              style={{ padding: '24px 28px 0' }}
            >
              {/* icon */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: 64, height: 64, flexShrink: 0,
                    border: '1.5px solid rgba(183,109,255,0.55)',
                    background: 'linear-gradient(135deg,rgba(183,109,255,0.22) 0%,rgba(139,61,255,0.12) 100%)',
                    boxShadow: '0 0 22px rgba(183,109,255,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                    ...chamfer(12),
                  }}
                >
                  <Layers size={26} style={{ color: '#d4a8ff' }} strokeWidth={1.5} />
                  <div
                    style={{
                      position: 'absolute', inset: 4,
                      border: '1px solid rgba(183,109,255,0.2)',
                      ...chamfer(8),
                    }}
                  />
                </div>

                {/* title block */}
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: '#b76dff',
                      marginBottom: 6,
                    }}
                  >
                    // learning path
                  </p>
                  <h2
                    style={{
                      fontSize: 'clamp(20px,2.5vw,26px)',
                      fontWeight: 500,
                      letterSpacing: '-0.025em',
                      color: 'var(--color-text-primary)',
                      lineHeight: 1.1,
                    }}
                  >
                    Cosmo Learn —{' '}
                    <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--color-brand-amber)' }}>Lộ trình</em>
                  </h2>
                  <p style={{ marginTop: 6, fontSize: 13, color: 'var(--color-text-muted)' }}>
                    Học theo module: thiên văn, Trái Đất, Hệ Mặt Trời… Tiến độ lưu theo tài khoản.
                  </p>
                </div>
              </div>

              {/* status + toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div
                  style={{
                    padding: '10px 16px',
                    border: '1px solid rgba(183,109,255,0.3)',
                    background: 'rgba(183,109,255,0.07)',
                    textAlign: 'right',
                    ...chamfer(10),
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: 'var(--color-text-subtle)',
                      marginBottom: 4,
                    }}
                  >
                    module đã hoàn thành
                  </p>
                  <p
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 22,
                      fontWeight: 400,
                      background: 'linear-gradient(180deg,#ffd27a 0%,var(--color-brand-amber) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {lpSnapshot.modulesDone}{' '}
                    <span style={{ fontSize: 14, color: 'var(--color-text-subtle)', WebkitTextFillColor: 'var(--color-text-subtle)' }}>
                      / {lpSnapshot.modulesTotal}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setLpExpanded((e) => !e)}
                  style={{
                    width: 36, height: 36, flexShrink: 0,
                    border: '1px solid rgba(183,109,255,0.3)',
                    background: 'rgba(183,109,255,0.08)',
                    color: '#b76dff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    ...chamfer(8),
                  }}
                >
                  {lpExpanded
                    ? <ChevronUp size={16} strokeWidth={1.8} />
                    : <ChevronDown size={16} strokeWidth={1.8} />}
                </button>
              </div>
            </div>

            {/* master progress bar */}
            <div style={{ padding: '16px 28px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10,
                    color: 'var(--color-text-subtle)',
                    letterSpacing: '0.1em',
                  }}
                >
                  {lpSnapshot.pathPct}%
                </span>
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  1 / 78 bài
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                  ...chamfer(3),
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${lpSnapshot.pathPct}%`,
                    background: 'linear-gradient(90deg,#b76dff,var(--color-accent))',
                    boxShadow: '0 0 8px rgba(183,109,255,0.6)',
                    transition: 'width 0.5s ease',
                    ...chamfer(3),
                  }}
                />
              </div>
            </div>

            {/* timeline */}
            {lpExpanded && (
              <div style={{ padding: '20px 28px 28px', position: 'relative' }}>
                {/* vertical timeline line */}
                <div
                  style={{
                    position: 'absolute',
                    left: 48,
                    top: 32,
                    bottom: 40,
                    width: 1,
                    background: 'linear-gradient(180deg,rgba(183,109,255,0.5) 0%,var(--color-accent-soft) 100%)',
                  }}
                />

                {/* PART 01 active */}
                {currentModule && lpSnapshot.lastHit ? (
                  <div style={{ position: 'relative', marginBottom: 16, paddingLeft: 36 }}>
                    {/* dot */}
                    <div
                      style={{
                        position: 'absolute', left: -8, top: 20,
                        width: 12, height: 12, borderRadius: '50%',
                        background: 'var(--color-accent)',
                        border: '2px solid var(--color-panel-solid)',
                        boxShadow: '0 0 8px var(--color-accent)',
                      }}
                    />
                    <div
                      style={{
                        border: '1px solid rgba(126,231,255,0.28)',
                        background: 'rgba(10,16,36,0.7)',
                        padding: '18px 20px',
                        position: 'relative',
                        ...chamfer(14),
                      }}
                    >
                      {/* live badge */}
                      <div
                        style={{
                          position: 'absolute', top: 14, right: 16,
                          padding: '4px 10px',
                          border: '1px solid var(--color-accent-strong)',
                          background: 'rgba(126,231,255,0.1)',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 9,
                          letterSpacing: '0.15em',
                          color: 'var(--color-accent)',
                          display: 'flex', alignItems: 'center', gap: 5,
                          ...chamfer(6),
                        }}
                      >
                        <span
                          style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: 'var(--color-accent)',
                            boxShadow: '0 0 5px var(--color-accent)',
                          }}
                        />
                        ĐANG HỌC
                      </div>

                      <p
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 9,
                          letterSpacing: '0.15em',
                          color: 'var(--color-text-subtle)',
                          textTransform: 'uppercase',
                          marginBottom: 6,
                        }}
                      >
                        {partLabel}
                      </p>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                        {currentModule.titleVi}
                      </h3>
                      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                        {currentModule.goalVi}
                      </p>

                      {/* badges */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            border: '1px solid rgba(109,255,176,0.4)',
                            background: 'rgba(109,255,176,0.1)',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 9,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: '#6dffb0',
                            ...chamfer(5),
                          }}
                        >
                          BEGINNER
                        </span>
                        <span
                          style={{
                            padding: '3px 10px',
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.05)',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 9,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: 'var(--color-text-muted)',
                            ...chamfer(5),
                          }}
                        >
                          {totalInModule} BÀI HỌC
                        </span>
                      </div>

                      {/* progress */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 10,
                            color: 'var(--color-text-subtle)',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {doneInModule} / {totalInModule} bài học
                        </span>
                        <span
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 10,
                            color: 'var(--color-accent)',
                          }}
                        >
                          {modulePct}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: 5,
                          background: 'rgba(126,231,255,0.08)',
                          border: '1px solid var(--color-border)',
                          overflow: 'hidden',
                          marginBottom: 10,
                          ...chamfer(2),
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${modulePct}%`,
                            background: 'linear-gradient(90deg,var(--color-accent),#4dd2ff)',
                            boxShadow: '0 0 6px rgba(126,231,255,0.6)',
                            transition: 'width 0.5s ease',
                            ...chamfer(2),
                          }}
                        />
                      </div>

                      <p
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 10,
                          color: 'var(--color-text-subtle)',
                          marginBottom: 16,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        // gần nhất · {lpSnapshot.lastHit.lesson.titleVi}
                      </p>

                      <Link
                        href={`/tutorial/${currentModule.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '9px 20px',
                          border: '1px solid var(--color-accent-strong)',
                          background: 'rgba(126,231,255,0.08)',
                          color: 'var(--color-accent)',
                          fontSize: 12,
                          fontFamily: 'JetBrains Mono, monospace',
                          letterSpacing: '0.1em',
                          textDecoration: 'none',
                          textTransform: 'uppercase',
                          transition: 'background 0.2s, box-shadow 0.2s',
                          ...chamfer(8),
                        }}
                      >
                        Tiếp tục module →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div style={{ position: 'relative', marginBottom: 16, paddingLeft: 36 }}>
                    <div
                      style={{
                        position: 'absolute', left: -8, top: 20,
                        width: 12, height: 12, borderRadius: '50%',
                        background: '#b76dff',
                        border: '2px solid var(--color-panel-solid)',
                        boxShadow: '0 0 8px #b76dff',
                      }}
                    />
                    <div
                      style={{
                        border: '1px dashed var(--color-accent-soft)',
                        background: 'rgba(126,231,255,0.02)',
                        padding: '16px 20px',
                        ...chamfer(12),
                      }}
                    >
                      <p style={{ fontSize: 13, color: 'var(--color-text-subtle)', marginBottom: 10 }}>
                        Hoàn thành ít nhất một bài trong Learning Path để hiển thị module đang học.
                      </p>
                      <Link
                        href="/tutorial"
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 11,
                          color: 'var(--color-accent)',
                          textDecoration: 'none',
                          letterSpacing: '0.1em',
                        }}
                      >
                        // mở lộ trình →
                      </Link>
                    </div>
                  </div>
                )}

                {/* locked parts — real data from modules */}
                {modules
                  .filter((m) => m.id !== currentModule?.id)
                  .sort((a, b) => a.order - b.order)
                  .map((m) => {
                    const lessonCount = countLessonsInLearningModule(m)
                    const partNo = String(m.order).padStart(2, '0')
                    return (
                      <div
                        key={m.id}
                        style={{
                          position: 'relative',
                          marginBottom: 10,
                          paddingLeft: 36,
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute', left: -5, top: '50%', transform: 'translateY(-50%)',
                            width: 8, height: 8, borderRadius: '50%',
                            background: 'rgba(92,104,134,0.5)',
                            border: '1px solid rgba(92,104,134,0.4)',
                          }}
                        />
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            padding: '10px 16px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            background: 'rgba(255,255,255,0.02)',
                            ...chamfer(8),
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 10,
                              letterSpacing: '0.15em',
                              color: 'var(--color-text-subtle)',
                              textTransform: 'uppercase',
                              flexShrink: 0,
                            }}
                          >
                            PART {partNo}
                          </span>
                          <span style={{ fontSize: 14, color: 'var(--color-text-muted)', flex: 1 }}>{m.titleVi}</span>
                          <span
                            style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 10,
                              color: 'var(--color-text-subtle)',
                              flexShrink: 0,
                            }}
                          >
                            {lessonCount} bài học
                          </span>
                          <Lock size={13} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} strokeWidth={1.5} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </HudPanel>
        </section>

        {/* ③ Khóa đã ghi danh */}
        <section style={{ marginBottom: 40 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 20,
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span style={{ width: 20, height: 1, background: 'rgba(126,231,255,0.25)', display: 'inline-block' }} />
                // 03 · enrolled · live sync
              </p>
              <h2
                style={{
                  fontSize: 'clamp(22px,3vw,32px)',
                  fontWeight: 500,
                  letterSpacing: '-0.025em',
                  color: 'var(--color-text-primary)',
                }}
              >
                Khóa{' '}
                <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--color-brand-amber)' }}>đã ghi danh</em>
              </h2>
            </div>
            {!loading && (
              <p
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  color: 'var(--color-text-subtle)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                total{' '}
                <span style={{ color: 'var(--color-text-muted)' }}>{courses.length}</span>
                {' · '}in progress{' '}
                <span style={{ color: 'var(--color-accent)' }}>{courses.filter((c) => c.percentComplete > 0 && c.percentComplete < 100).length}</span>
              </p>
            )}
          </div>

          {loading ? (
            <SkeletonList count={3} />
          ) : courses.length === 0 ? (
            <HudPanel style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-subtle)', marginBottom: 16 }}>
                Bạn chưa ghi danh khóa học trả phí nào.
              </p>
              <Link
                href="/courses"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '9px 20px',
                  border: '1px solid rgba(126,231,255,0.4)',
                  background: 'rgba(126,231,255,0.08)',
                  color: 'var(--color-accent)',
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.1em',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  ...chamfer(8),
                }}
              >
                Xem khóa học →
              </Link>
            </HudPanel>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                gap: 16,
              }}
            >
              {courses.map((c) => (
                <Link
                  key={c.id}
                  href={`/courses/${c.slug}`}
                  style={{ textDecoration: 'none' }}
                >
                  <HudPanel
                    style={{ padding: 20, cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                  >
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      {/* thumb */}
                      <div
                        style={{
                          width: 52, height: 52, flexShrink: 0,
                          border: '1.5px solid var(--color-accent-strong)',
                          background: 'linear-gradient(135deg,var(--color-accent-soft) 0%,rgba(77,210,255,0.08) 100%)',
                          color: 'var(--color-accent)',
                          fontSize: 20, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 0 14px rgba(126,231,255,0.2)',
                          ...chamfer(10),
                        }}
                      >
                        {c.title.slice(0, 1).toUpperCase()}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 9,
                            letterSpacing: '0.15em',
                            color: 'var(--color-text-subtle)',
                            textTransform: 'uppercase',
                            marginBottom: 4,
                          }}
                        >
                          // galaxy.{c.slug}
                        </p>
                        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                          {c.title}
                        </h3>
                        <p
                          style={{
                            fontSize: 12,
                            color: 'var(--color-text-muted)',
                            marginBottom: 14,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {c.description || 'Khám phá nội dung khóa học.'}
                        </p>

                        {/* progress meta */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 10,
                              color: 'var(--color-text-subtle)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                            }}
                          >
                            {c.completedCount}/{c.totalLessons} lessons · {c.percentComplete}% complete
                          </span>
                          <div
                            style={{
                              width: 52, height: 44, flexShrink: 0,
                              border: '1px solid var(--color-border)',
                              background: 'var(--color-accent-soft)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              ...chamfer(8),
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: 15,
                                fontWeight: 600,
                                color: 'var(--color-accent)',
                              }}
                            >
                              {c.percentComplete}%
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            height: 4,
                            background: 'rgba(126,231,255,0.08)',
                            border: '1px solid rgba(126,231,255,0.1)',
                            overflow: 'hidden',
                            ...chamfer(2),
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${c.percentComplete}%`,
                              background: 'linear-gradient(90deg,var(--color-accent),#4dd2ff)',
                              boxShadow: '0 0 6px var(--color-accent-strong)',
                              transition: 'width 0.5s ease',
                              ...chamfer(2),
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </HudPanel>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ④ Thanh toán — xem đầy đủ tại /my-orders */}
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 20,
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span style={{ width: 20, height: 1, background: 'rgba(126,231,255,0.25)', display: 'inline-block' }} />
                // 04 · transactions
              </p>
              <h2
                style={{
                  fontSize: 'clamp(22px,3vw,32px)',
                  fontWeight: 500,
                  letterSpacing: '-0.025em',
                  color: 'var(--color-text-primary)',
                }}
              >
                Lịch sử{' '}
                <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--color-brand-amber)' }}>thanh toán</em>
              </h2>
            </div>
            <Link
              href="/my-orders"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.1em',
                color: 'var(--color-brand-amber)',
                textDecoration: 'none',
              }}
            >
              Xem tất cả →
            </Link>
          </div>

          {loading ? (
            <SkeletonList count={1} />
          ) : orders.length === 0 ? (
            <HudPanel style={{ padding: '20px 24px' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--color-text-subtle)' }}>
                Chưa có đơn thanh toán.{' '}
                <Link href="/courses" style={{ color: 'var(--color-accent)' }}>
                  Khám phá khóa học
                </Link>
              </p>
            </HudPanel>
          ) : (
            <HudPanel style={{ padding: '16px 20px' }}>
              <p
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  color: 'var(--color-text-subtle)',
                  marginBottom: 12,
                  letterSpacing: '0.1em',
                }}
              >
                {orders.length} đơn · {completedOrders} đã thanh toán · tổng {formatVnd(totalValueVnd)}
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {orders.slice(0, 3).map((o) => (
                  <li
                    key={o._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '8px 0',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {o.courseSlug}
                    </span>
                    <span style={{ color: 'var(--color-brand-amber)', flexShrink: 0 }}>{amountStr(o)}</span>
                    <span style={{ color: '#6dffb0', flexShrink: 0, fontSize: 10 }}>
                      {orderStatusLabelVi(o.status)}
                    </span>
                  </li>
                ))}
              </ul>
              {orders.length > 3 && (
                <p style={{ marginTop: 12, fontSize: 11, color: 'var(--color-text-subtle)' }}>
                  +{orders.length - 3} đơn khác —{' '}
                  <Link href="/my-orders" style={{ color: 'var(--color-brand-amber)' }}>
                    mở lịch sử đầy đủ
                  </Link>
                </p>
              )}
            </HudPanel>
          )}
        </section>

      </div>
    </div>
  )
}
