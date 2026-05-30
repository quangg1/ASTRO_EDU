'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/features/auth/public'
import {
  fetchLearnerTiersWithProgress,
  GEM_REWARD_LEARNING_PATH_LESSON,
  gemActivityDirection,
  gemActivityDirectionLabel,
  labelGemActivityVi,
  loadGemWallet,
  syncGemWallet,
  type GemWalletState,
  type LearnerTierProgress,
} from '@/features/rewards/public'
import { fetchPublicLearningPath } from '@/features/learning-path/public'
import { fetchPublicShowcaseCatalogBundle } from '@/features/content3d/showcase/public'
import { useLiveClock } from '@/hooks/useLiveClock'
import { getLessonById, type LearningModule } from '@/data/learningPathCurriculum'

function formatTransactionDate(input: string) {
  const date = new Date(input)
  if (Number.isNaN(+date)) return ''
  return date.toLocaleDateString('vi-VN')
}

function formatRelativeDate(input: string) {
  const date = new Date(input)
  if (Number.isNaN(+date)) return ''
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (diffDays === 0) return 'hôm nay'
  if (diffDays === 1) return 'hôm qua'
  return `${diffDays} ngày trước`
}

const chamfer = (cut = 14) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function Brackets({ c = '#7ee7ff', s = 12, o = 6 }: { c?: string; s?: number; o?: number }) {
  const b = (ex: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', width: s, height: s, opacity: 0.65, pointerEvents: 'none', ...ex,
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

const NODE_CONFIGS = [
  { cx: 80,  cy: 155, r: 12, color: '#7ee7ff', shortLabel: 'BÀI HỌC' },
  { cx: 290, cy: 115, r: 12, color: '#7ee7ff', shortLabel: 'DIỄN ĐÀN' },
  { cx: 560, cy: 60,  r: 12, color: '#f5a524', shortLabel: 'KHÓA HỌC' },
  { cx: 800, cy: 105, r: 12, color: '#f5a524', shortLabel: 'STREAK 7D' },
]

export default function GemPage() {
  const { user } = useAuthStore()
  const userId = user?.id ?? null
  const [wallet, setWallet] = useState<GemWalletState>({ balance: 0, transactions: [] })
  const { time: localTime, zoneLabel } = useLiveClock()
  const [tierProgress, setTierProgress] = useState<LearnerTierProgress | null>(null)
  const [tierPolicy, setTierPolicy] = useState('')
  const [lessonTitleById, setLessonTitleById] = useState<Record<string, string>>({})
  const [entityNameById, setEntityNameById] = useState<Record<string, string>>({})

  useEffect(() => {
    const refresh = () => setWallet(loadGemWallet(userId))
    refresh()
    void syncGemWallet(userId).then((next) => setWallet(next))
    window.addEventListener('gem-wallet-changed', refresh)
    return () => {
      window.removeEventListener('gem-wallet-changed', refresh)
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    void fetchLearnerTiersWithProgress().then((res) => {
      if (!res || cancelled) return
      setTierProgress(res.progress)
      setTierPolicy(res.catalog.policyVi || '')
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.all([fetchPublicLearningPath(), fetchPublicShowcaseCatalogBundle()]).then(
      ([learningModules, showcaseBundle]) => {
        if (cancelled) return

        const lessonMap: Record<string, string> = {}
        const modules = Array.isArray(learningModules) ? (learningModules as LearningModule[]) : []
        for (const tx of wallet.transactions) {
          const lessonId = String(tx.meta?.lessonId || '').trim()
          if (!lessonId || lessonMap[lessonId]) continue
          const lessonRef = getLessonById(lessonId, modules)
          const title = lessonRef?.lesson?.titleVi || lessonRef?.lesson?.title || lessonId
          lessonMap[lessonId] = title
        }
        setLessonTitleById(lessonMap)

        const entityMap: Record<string, string> = {}
        const catalog = Array.isArray(showcaseBundle?.catalog) ? showcaseBundle.catalog : []
        const orbits = Array.isArray(showcaseBundle?.orbits) ? showcaseBundle.orbits : []
        for (const item of catalog) {
          if (item?.id && item?.name) entityMap[item.id] = item.name
        }
        for (const orbit of orbits) {
          if (orbit?.id && orbit?.name && !entityMap[orbit.id]) entityMap[orbit.id] = orbit.name
        }
        setEntityNameById(entityMap)
      },
    )
    return () => {
      cancelled = true
    }
  }, [wallet.transactions])

  const earnWays = useMemo(
    () => [
      { label: 'Hoàn thành một bài trong lộ trình', reward: `+${GEM_REWARD_LEARNING_PATH_LESSON} Gem` },
      { label: 'Trả lời câu hỏi trong diễn đàn', reward: '+5 Gem' },
      { label: 'Hoàn thành khóa học', reward: '+50 Gem' },
      { label: 'Duy trì chuỗi 7 ngày', reward: '+20 Gem' },
    ],
    [],
  )

  const groupedTransactions = useMemo(() => {
    const map = new Map<string, Array<{ tx: GemWalletState['transactions'][0]; idx: number }>>()
    wallet.transactions.slice(0, 8).forEach((tx, i) => {
      const key = formatTransactionDate(tx.createdAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push({ tx, idx: i + 1 })
    })
    return [...map.entries()]
  }, [wallet.transactions])

  const resolveGemActivityDetail = (
    tx: GemWalletState['transactions'][number],
  ): { label: string; detail: string | null } => {
    const base = labelGemActivityVi(tx)
    const reason = String(tx.reason || tx.type || '').trim()
    const lessonId = String(tx.meta?.lessonId || '').trim()
    const entityId = String(tx.meta?.entityId || '').trim()

    if (
      lessonId &&
      (reason === 'lp_complete_dwell' ||
        reason === 'depth_complete' ||
        reason === 'recall_quiz_first' ||
        reason === 'recall_quiz_retry' ||
        reason === 'lesson_complete')
    ) {
      return { label: base, detail: lessonTitleById[lessonId] || `Bài: ${lessonId}` }
    }

    if (entityId && reason === 'scene_entity_discovered') {
      return { label: base, detail: entityNameById[entityId] || `Vật thể: ${entityId}` }
    }

    return { label: base, detail: null }
  }

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

  return (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* HUD header strip */}
      <div
        className="relative flex items-center justify-between px-4 py-2.5 mb-5"
        style={{
          background: 'rgba(10,16,36,0.6)',
          border: '1px solid rgba(126,231,255,0.14)',
          borderBottom: '1px solid rgba(126,231,255,0.25)',
          ...chamfer(10),
        }}
      >
        <span style={{ ...mono, fontSize: 10, letterSpacing: '0.18em', color: '#7ee7ff', textTransform: 'uppercase' }}>
          // 04 · gem · constellation
        </span>
        <div className="flex items-center gap-5" style={{ ...mono, fontSize: 10, letterSpacing: '0.12em', color: '#5c6886' }}>
          <span>Wallet · <span style={{ color: '#f5a524' }}>{wallet.balance} GEM</span></span>
          <span>Sync · <span style={{ color: '#6dffb0' }}>●</span></span>
            <span className="hidden sm:inline">
              {zoneLabel} · <span style={{ color: '#9aa8c4' }}>{localTime}</span>
            </span>
        </div>
      </div>

      {/* Main grid: left hero + right balance */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 260px' }}>

        {/* Left: H1 + Constellation map */}
        <div
          className="relative p-7"
          style={{
            background: 'rgba(6,9,26,0.72)',
            border: '1px solid rgba(126,231,255,0.13)',
            ...chamfer(18),
          }}
        >
          <Brackets c="#7ee7ff" s={14} o={8} />

          <div style={{ ...mono, fontSize: 9, letterSpacing: '0.22em', color: '#5c6886', marginBottom: 20, textTransform: 'uppercase' }}>
            {String(earnWays.length).padStart(2, '0')} Paths · {tierProgress?.current?.nameVi || 'Starter'}
          </div>

          <h1 style={{ fontSize: 'clamp(28px, 3.5vw, 50px)', fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#eaf6ff', marginBottom: 10 }}>
            Mỗi việc bạn làm thắp sáng{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#f5a524' }}>một ngôi sao.</em>
          </h1>
          <p style={{ fontSize: 14, color: '#9aa8c4', lineHeight: 1.65, maxWidth: 460, marginBottom: 36 }}>
            Bốn cách kiếm Gem, mỗi cách là một node trong chòm sao tiến bộ của bạn. Đổi thưởng tại Cửa hàng Gem khi đã sẵn sàng.
          </p>

          {/* Constellation SVG */}
          <div style={{ width: '100%', height: 210, position: 'relative' }}>
            <svg viewBox="0 0 920 195" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {/* Background stars */}
              {Array.from({ length: 36 }, (_, i) => (
                <circle
                  key={i}
                  cx={10 + (i * 25) % 900}
                  cy={5 + (i * 17) % 185}
                  r={0.7 + (i % 3) * 0.35}
                  fill="white"
                  opacity={0.06 + (i % 5) * 0.04}
                />
              ))}

              {/* Connection lines */}
              <line x1="80"  y1="155" x2="290" y2="115" stroke="rgba(126,231,255,0.2)" strokeWidth="1" strokeDasharray="5 6" />
              <line x1="290" y1="115" x2="560" y2="60"  stroke="rgba(126,231,255,0.2)" strokeWidth="1" strokeDasharray="5 6" />
              <line x1="560" y1="60"  x2="800" y2="105" stroke="rgba(126,231,255,0.2)" strokeWidth="1" strokeDasharray="5 6" />

              {/* Nodes from earnWays */}
              {earnWays.map((way, i) => {
                const cfg = NODE_CONFIGS[i]
                const rewardNum = way.reward.replace(' Gem', '')
                return (
                  <g key={i}>
                    {/* Glow halo */}
                    <circle cx={cfg.cx} cy={cfg.cy} r={cfg.r + 5} fill={cfg.color} opacity={0.08} />
                    {/* Main dot */}
                    <circle
                      cx={cfg.cx} cy={cfg.cy} r={cfg.r}
                      fill={cfg.color} opacity={0.92}
                      style={{ filter: `drop-shadow(0 0 ${cfg.r - 2}px ${cfg.color})` }}
                    />
                    {/* Short label above */}
                    <text
                      x={cfg.cx} y={cfg.cy - cfg.r - 10}
                      textAnchor="middle" fill="#9aa8c4"
                      fontSize="8.5" fontFamily="JetBrains Mono, monospace" letterSpacing="0.12em"
                    >
                      {cfg.shortLabel}
                    </text>
                    {/* Reward amount below */}
                    <text
                      x={cfg.cx} y={cfg.cy + cfg.r + 14}
                      textAnchor="middle" fill={cfg.color}
                      fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600"
                    >
                      {rewardNum}
                    </text>
                    <text
                      x={cfg.cx} y={cfg.cy + cfg.r + 25}
                      textAnchor="middle" fill="#5c6886"
                      fontSize="7.5" fontFamily="JetBrains Mono, monospace"
                    >
                      GEM
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Right: Balance panel + CTA */}
        <div className="flex flex-col gap-4">
          <div
            className="relative flex flex-col items-center justify-center text-center p-6 flex-1"
            style={{
              background: 'rgba(6,9,26,0.72)',
              border: '1px solid rgba(126,231,255,0.13)',
              minHeight: 220,
              ...chamfer(16),
            }}
          >
            <Brackets c="#7ee7ff" s={12} o={7} />
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.28em', color: '#5c6886', marginBottom: 10, textTransform: 'uppercase' }}>
              — Tổng số GEM
            </div>
            <div
              style={{
                fontSize: 'clamp(80px, 7vw, 120px)',
                fontWeight: 400,
                lineHeight: 1,
                color: '#f5a524',
                textShadow: '0 0 40px rgba(245,165,36,0.45), 0 0 80px rgba(245,165,36,0.18)',
                letterSpacing: '-0.04em',
                marginBottom: 14,
              }}
            >
              {wallet.balance}
            </div>
            <div style={{ ...mono, fontSize: 9.5, letterSpacing: '0.22em', color: '#9aa8c4', textTransform: 'uppercase' }}>
              GEM · {tierProgress?.current?.nameVi || 'ASTEROID'} TIER
            </div>
          </div>

          {/* CTA button */}
          <Link
            href="/gem-shop"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #f5a524 0%, #e8950f 100%)',
              color: '#1a0e00',
              padding: '14px 18px',
              ...mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              boxShadow: '0 0 28px rgba(245,165,36,0.4), 0 4px 20px rgba(245,165,36,0.25)',
              ...chamfer(12),
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Vào cửa hàng GEM
          </Link>
        </div>
      </div>

      {(tierPolicy || tierProgress?.next) && (
        <div
          className="relative mt-4 p-4"
          style={{
            background: 'rgba(6,9,26,0.72)',
            border: '1px solid rgba(126,231,255,0.13)',
            ...chamfer(12),
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p style={{ fontSize: 13, color: '#9aa8c4', lineHeight: 1.5 }}>
              {tierPolicy || 'Hạng Learner tăng theo tổng gem đã kiếm, không giảm khi tiêu gem.'}
            </p>
            {tierProgress?.next ? (
              <span style={{ ...mono, fontSize: 10, color: '#7ee7ff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Next · {tierProgress.next.nameVi} · {tierProgress.gemsToNext} gem
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* Gem activity log */}
      <div
        className="relative mt-4 p-6"
        style={{
          background: 'rgba(6,9,26,0.72)',
          border: '1px solid rgba(126,231,255,0.13)',
          ...chamfer(16),
        }}
      >
        <Brackets c="#7ee7ff" s={12} o={7} />

        {/* Section header */}
        <div className="flex items-baseline justify-between mb-1">
          <h2 style={{ fontSize: 'clamp(22px, 2.8vw, 32px)', fontWeight: 500, letterSpacing: '-0.025em', color: '#eaf6ff' }}>
            Gem bạn{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#7ee7ff' }}>đã kiếm & tiêu</em>
          </h2>
          <span style={{ ...mono, fontSize: 9.5, letterSpacing: '0.18em', color: '#5c6886', textTransform: 'uppercase' }}>
            {String(Math.min(wallet.transactions.length, 8)).padStart(2, '0')} mục · theo ngày
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#9aa8c4', lineHeight: 1.5, marginBottom: 16 }}>
          Mỗi dòng là một lần bạn nhận Gem khi học, khám phá 3D, làm quiz — hoặc tiêu Gem tại cửa hàng.
        </p>

        {/* Cyan accent line */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(126,231,255,0.35) 0%, rgba(126,231,255,0.04) 80%)', marginBottom: 20 }} />

        {wallet.transactions.length === 0 ? (
          <p style={{ ...mono, fontSize: 12, color: '#5c6886', letterSpacing: '0.12em' }}>
            // CHƯA CÓ HOẠT ĐỘNG GEM
          </p>
        ) : (
          <div className="space-y-5">
            {groupedTransactions.map(([date, entries]) => (
              <div key={date} className="flex gap-5">
                {/* Date label column */}
                <div style={{ width: 96, flexShrink: 0 }}>
                  <div style={{ ...mono, fontSize: 11, color: '#f5a524', letterSpacing: '0.06em' }}>
                    {date}
                  </div>
                  <div style={{ ...mono, fontSize: 9.5, color: '#5c6886', letterSpacing: '0.06em', marginTop: 3 }}>
                    {formatRelativeDate(entries[0].tx.createdAt)}
                  </div>
                </div>

                {/* Activity entries in this date group */}
                <div className="flex-1 space-y-1.5">
                  {entries.map(({ tx }) => {
                    const direction = gemActivityDirection(tx)
                    const isEarn = direction === 'earn'
                    const accent = isEarn ? '#6dffb0' : '#f5a524'
                    const accentBg = isEarn ? 'rgba(109,255,176,0.07)' : 'rgba(245,165,36,0.08)'
                    const accentBorder = isEarn ? 'rgba(109,255,176,0.28)' : 'rgba(245,165,36,0.28)'

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3"
                        style={{
                          padding: '9px 14px',
                          background: 'rgba(126,231,255,0.018)',
                          border: '1px solid rgba(126,231,255,0.07)',
                          ...chamfer(8),
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: accent,
                            flexShrink: 0,
                            boxShadow: `0 0 5px ${accent}`,
                            opacity: 0.7,
                          }}
                        />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          {(() => {
                            const activity = resolveGemActivityDetail(tx)
                            return (
                              <>
                                <span style={{ display: 'block', fontSize: 13.5, color: '#eaf6ff', lineHeight: 1.35 }}>
                                  {activity.label}
                                </span>
                                {activity.detail ? (
                                  <span
                                    style={{
                                      display: 'block',
                                      fontSize: 11.5,
                                      color: '#9aa8c4',
                                      lineHeight: 1.3,
                                      marginTop: 2,
                                    }}
                                  >
                                    {activity.detail}
                                  </span>
                                ) : null}
                              </>
                            )
                          })()}
                        </span>
                        <span
                          style={{
                            ...mono,
                            fontSize: 9,
                            fontWeight: 600,
                            color: accent,
                            background: accentBg,
                            border: `1px solid ${accentBorder}`,
                            padding: '2px 8px',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            flexShrink: 0,
                            ...chamfer(4),
                          }}
                        >
                          {gemActivityDirectionLabel(tx)}
                        </span>
                        <span
                          style={{
                            ...mono,
                            fontSize: 11,
                            fontWeight: 600,
                            color: accent,
                            background: accentBg,
                            border: `1px solid ${accentBorder}`,
                            padding: '2px 9px',
                            letterSpacing: '0.04em',
                            flexShrink: 0,
                            ...chamfer(4),
                          }}
                        >
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer meta */}
        <div
          style={{
            marginTop: 18,
            paddingTop: 12,
            borderTop: '1px dashed rgba(126,231,255,0.1)',
            ...mono,
            fontSize: 9.5,
            color: '#5c6886',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          <span>
            Hiển thị {String(Math.min(wallet.transactions.length, 8)).padStart(2, '0')} / {String(wallet.transactions.length).padStart(2, '0')} mục gần nhất
          </span>
        </div>
      </div>

      {/* FAB */}
      <button
        aria-label="AI tutor"
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f5a524 0%, #e8950f 100%)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px rgba(245,165,36,0.5), 0 4px 20px rgba(0,0,0,0.4)',
          zIndex: 50,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a0e00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </div>
  )
}
