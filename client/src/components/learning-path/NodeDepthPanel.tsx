'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import type { DepthLevel, LearningModule, LearningNode } from '@/data/learningPathCurriculum'
import { DEPTH_ORDER } from '@/data/learningPathCurriculum'
import {
  loadLessonCompletion,
  syncLearningPathCompletion,
  isLessonComplete,
  type LessonCompletionMap,
} from '@/lib/learningPathProgress'
import { trackLearningPathBehavior } from '@/lib/learningPathBehavior'
import { useAuthStore } from '@/store/useAuthStore'

type Props = {
  module: LearningModule
  node: LearningNode
}

const CYAN = '#7ee7ff'

const DEPTH_STYLE: Record<DepthLevel, { label: string; labelVi: string; orbColor: string }> = {
  beginner:   { label: 'Beginner',   labelVi: 'Cơ bản', orbColor: '#3ddc84' },
  explorer:   { label: 'Explorer',   labelVi: 'Cơ chế', orbColor: '#3b82f6' },
  researcher: { label: 'Researcher', labelVi: 'Sâu',    orbColor: '#ef4444' },
}

// RGB tuples for CSS custom property (used inside rgba())
const LEVEL_RGB: Record<DepthLevel, string> = {
  beginner:   '61,220,132',
  explorer:   '59,130,246',
  researcher: '239,68,68',
}

function CornerBrackets({ color, size = 10, thickness = 1, glow }: {
  color: string; size?: number; thickness?: number; glow?: string
}) {
  const base: React.CSSProperties = {
    position: 'absolute', width: size, height: size, pointerEvents: 'none',
    filter: glow ? `drop-shadow(0 0 3px ${glow}) drop-shadow(0 0 7px ${glow})` : undefined,
  }
  const b = `${thickness}px solid ${color}`
  return (
    <>
      <span style={{ ...base, top: 0, left: 0, borderTop: b, borderLeft: b }} />
      <span style={{ ...base, top: 0, right: 0, borderTop: b, borderRight: b }} />
      <span style={{ ...base, bottom: 0, left: 0, borderBottom: b, borderLeft: b }} />
      <span style={{ ...base, bottom: 0, right: 0, borderBottom: b, borderRight: b }} />
    </>
  )
}

export default function NodeDepthPanel({ module, node }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const depths = useMemo(() => DEPTH_ORDER.filter((d) => (node.depths[d]?.length ?? 0) > 0), [node])
  const [active, setActive] = useState<DepthLevel>(depths[0] ?? 'beginner')
  const [completion, setCompletion] = useState<LessonCompletionMap>({})
  const [hoveredLesson, setHoveredLesson] = useState<string | null>(null)
  const [hoveredTab, setHoveredTab] = useState<DepthLevel | null>(null)

  useEffect(() => {
    const refresh = () => setCompletion(loadLessonCompletion(userId))
    const refreshAndSync = () => {
      refresh()
      void syncLearningPathCompletion(userId).then((synced) => setCompletion(synced))
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Level tabs ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }} role="tablist">
        {depths.map((d) => {
          const ds = DEPTH_STYLE[d]
          const isOn = active === d
          const isHov = hoveredTab === d && !isOn
          const count = node.depths[d]?.length ?? 0
          const doneCount = (node.depths[d] ?? []).filter((l) => isLessonComplete(completion, l.id)).length
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={isOn}
              onMouseEnter={() => setHoveredTab(d)}
              onMouseLeave={() => setHoveredTab(null)}
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
              style={{
                flex: '1 1 140px',
                position: 'relative',
                padding: '12px 18px',
                clipPath: 'polygon(8px 0%,100% 0%,100% calc(100% - 8px),calc(100% - 8px) 100%,0% 100%,0% 8px)',
                background: isOn
                  ? 'rgba(126,231,255,0.07)'
                  : isHov
                  ? 'rgba(126,231,255,0.04)'
                  : 'rgba(6,9,26,0.6)',
                border: isOn
                  ? '1px solid rgba(126,231,255,0.45)'
                  : isHov
                  ? '1px solid rgba(126,231,255,0.2)'
                  : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isOn ? '0 0 22px rgba(126,231,255,0.12), inset 0 0 14px rgba(126,231,255,0.04)' : 'none',
                textAlign: 'left',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease',
              }}
            >
              <span style={{
                display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                background: ds.orbColor,
                boxShadow: isOn ? `0 0 8px ${ds.orbColor}, 0 0 16px ${ds.orbColor}55` : `0 0 5px ${ds.orbColor}88`,
                verticalAlign: 'middle', marginRight: 10, flexShrink: 0,
                transition: 'box-shadow 0.22s ease',
              }} />
              <span style={{
                fontFamily: "'Space Grotesk',sans-serif",
                fontSize: 14, fontWeight: 600,
                color: isOn ? '#eaf6ff' : '#9aa8c4',
                verticalAlign: 'middle', marginRight: 8,
              }}>
                {ds.label}
              </span>
              <span style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: isOn ? CYAN : '#3a4a6a',
                verticalAlign: 'middle',
              }}>
                {ds.labelVi}
              </span>
              <span style={{
                position: 'absolute', top: 8, right: 10,
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10, letterSpacing: '0.1em',
                color: isOn ? CYAN : '#3a4a6a',
              }}>
                {doneCount}/{count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Lesson panel ── */}
      <AnimatePresence mode="wait">
        {/* motion.div: animation + CSS variable --lv-bleed-rgb + 3-layer drop-shadow */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          style={{
            '--lv-bleed-rgb': LEVEL_RGB[active],
            filter: [
              'drop-shadow(0 0 1px rgba(var(--lv-bleed-rgb),0.6))',
              'drop-shadow(0 0 10px rgba(var(--lv-bleed-rgb),0.28))',
              'drop-shadow(0 0 36px rgba(var(--lv-bleed-rgb),0.12))',
            ].join(' '),
          } as React.CSSProperties}
        >
          {/* Inner div: clip-path + 3-layer radial gradient bleed + border */}
          <div style={{
            position: 'relative',
            clipPath: 'polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0% 100%,0% 12px)',
            background: [
              'radial-gradient(ellipse 60% 50% at 100% 0%,   rgba(var(--lv-bleed-rgb),0.13) 0%, transparent 65%)',
              'radial-gradient(ellipse 50% 55% at 0%   100%, rgba(var(--lv-bleed-rgb),0.09) 0%, transparent 65%)',
              'radial-gradient(ellipse 70% 35% at 50%  0%,   rgba(var(--lv-bleed-rgb),0.05) 0%, transparent 55%)',
              'rgba(4,7,18,0.95)',
            ].join(','),
            border: '1px solid rgba(var(--lv-bleed-rgb),0.35)',
            padding: '20px 22px',
          }}>
          <CornerBrackets
            color="rgba(var(--lv-bleed-rgb),0.85)"
            size={14}
            thickness={1.5}
            glow="rgba(var(--lv-bleed-rgb),0.65)"
          />

          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, gap: 12 }}>
            <p style={{
              margin: 0, flex: 1,
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: 13, color: '#5c6886', lineHeight: 1.6,
            }}>
              Chọn một bài để đọc nội dung chi tiết — mỗi dòng là một{' '}
              <span style={{ color: CYAN, fontWeight: 500 }}>trang học riêng</span>.
            </p>
            <span style={{
              flexShrink: 0,
              padding: '4px 12px',
              clipPath: 'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
              background: 'rgba(var(--lv-bleed-rgb),0.07)',
              border: '1px solid rgba(var(--lv-bleed-rgb),0.35)',
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'rgba(var(--lv-bleed-rgb),1)',
            }}>
              Level · {DEPTH_STYLE[active].label}
            </span>
          </div>

          <div style={{ height: 1, background: 'rgba(126,231,255,0.1)', marginBottom: 14 }} />

          {/* Lesson rows */}
          <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lessons.map((lesson, i) => {
              const done = isLessonComplete(completion, lesson.id)
              const href = `/tutorial/${encodeURIComponent(module.id)}/${encodeURIComponent(node.id)}/${encodeURIComponent(lesson.id)}`
              const lessonNum = String(i + 1).padStart(2, '0')
              const isHov = hoveredLesson === lesson.id
              return (
                <motion.li
                  key={lesson.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.045 }}
                >
                  <Link
                    href={href}
                    onMouseEnter={() => setHoveredLesson(lesson.id)}
                    onMouseLeave={() => setHoveredLesson(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px',
                      clipPath: 'polygon(8px 0%,100% 0%,100% calc(100% - 8px),calc(100% - 8px) 100%,0% 100%,0% 8px)',
                      background: isHov ? 'rgba(var(--lv-bleed-rgb),0.06)' : 'rgba(var(--lv-bleed-rgb),0.02)',
                      border: isHov ? '1px solid rgba(var(--lv-bleed-rgb),0.45)' : '1px solid rgba(var(--lv-bleed-rgb),0.15)',
                      boxShadow: isHov ? '0 0 14px rgba(var(--lv-bleed-rgb),0.1)' : 'none',
                      textDecoration: 'none',
                      transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                    }}
                  >
                    {done ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="7" cy="7" r="6" stroke="#3ddc84" strokeWidth="1.5" />
                        <path d="M4.5 7L6.5 9L9.5 5.5" stroke="#3ddc84" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(var(--lv-bleed-rgb),1)',
                        boxShadow: '0 0 7px rgba(var(--lv-bleed-rgb),0.6)',
                      }} />
                    )}

                    <span style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: '#3a4a6a', flexShrink: 0, whiteSpace: 'nowrap',
                    }}>
                      L · {lessonNum}
                    </span>

                    <span style={{ color: '#263042', fontSize: 10, flexShrink: 0 }}>·</span>

                    <span style={{
                      flex: 1, minWidth: 0,
                      fontFamily: "'Space Grotesk',sans-serif",
                      fontSize: 15, fontWeight: 500,
                      color: done ? '#5c6886' : '#c8d8f0',
                      lineHeight: 1.4,
                    }}>
                      {lesson.titleVi}
                    </span>

                    <div style={{
                      flexShrink: 0, width: 32, height: 28,
                      clipPath: 'polygon(5px 0%,100% 0%,100% calc(100% - 5px),calc(100% - 5px) 100%,0% 100%,0% 5px)',
                      background: isHov ? 'rgba(var(--lv-bleed-rgb),0.18)' : 'rgba(var(--lv-bleed-rgb),0.07)',
                      border: `1px solid rgba(var(--lv-bleed-rgb),${isHov ? '0.55' : '0.28'})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(var(--lv-bleed-rgb),1)',
                      fontFamily: "'JetBrains Mono',monospace", fontSize: 14,
                      transition: 'background 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
                      transform: isHov ? 'translateX(3px)' : 'none',
                    }}>
                      →
                    </div>
                  </Link>
                </motion.li>
              )
            })}
          </ul>
          </div>{/* end inner clip-path div */}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
