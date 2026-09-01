'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Compass, Map, PlayCircle, Sparkles } from 'lucide-react'
import { useLearnerNextAction } from '@/features/learning-path/public'
import { saveEduJourneyContext } from '@/lib/eduJourney'
import type { LearnerNextAction } from '@/features/learning-path/public'

const chamfer = (cut = 16) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

type LearningStartGuideProps = {
  compact?: boolean
  /** Override primary from hook (Explore entity → lesson). */
  lessonHref?: string
  lessonTitle?: string
  lessonSubtitle?: string
  entityLabel?: string
  exploreHref?: string
  context?: 'dashboard' | 'tutorial' | 'explore'
  /** When true, only render primary (+ optional secondary) — no step grid. */
  primaryOnly?: boolean
  /** Injected next-action (skip hook) — for post-lesson panel. */
  forcedAction?: LearnerNextAction | null
  hideKnowledgeMap?: boolean
}

function Step({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-ds-subtle">{description}</p>
    </div>
  )
}

export function LearningStartGuide({
  compact = false,
  lessonHref,
  lessonTitle,
  lessonSubtitle,
  entityLabel,
  exploreHref,
  context = 'dashboard',
  primaryOnly = false,
  forcedAction = null,
  hideKnowledgeMap = false,
}: LearningStartGuideProps) {
  const { nextAction } = useLearnerNextAction()
  const action = forcedAction ?? nextAction

  const primaryHref = lessonHref || action.href
  const resolvedTitle = lessonTitle || action.title
  const resolvedDescription = lessonSubtitle || action.reason
  const ctaLabel = lessonHref
    ? action.hasProgress
      ? 'Tiếp tục học'
      : 'Bắt đầu ngay'
    : action.ctaLabel
  const secondary = action.secondary
  const secondaryHref = exploreHref || secondary?.href
  const contextBadge =
    context === 'explore'
      ? '3D → Lộ trình'
      : context === 'tutorial'
        ? 'Lộ trình học'
        : 'Bước tiếp theo'

  useEffect(() => {
    if (context !== 'explore' && !entityLabel && !lessonTitle && !lessonHref) return
    saveEduJourneyContext({
      entityId: entityLabel ? entityLabel.toLowerCase().replace(/\s+/g, '-') : undefined,
      entityLabel,
      lessonHref: lessonHref || primaryHref,
      lessonTitle: lessonTitle || action.lessonTitle || resolvedTitle,
      exploreHref: exploreHref || secondaryHref,
      view: context === 'explore' ? 'showcase' : undefined,
    })
  }, [
    entityLabel,
    lessonTitle,
    lessonHref,
    primaryHref,
    exploreHref,
    secondaryHref,
    context,
    action.lessonTitle,
    resolvedTitle,
  ])

  return (
    <section
      className={`relative overflow-hidden border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.12] via-slate-900/70 to-amber-500/[0.08] ${compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'}`}
      style={{
        ...chamfer(18),
        boxShadow: '0 0 30px rgba(126,231,255,0.08)',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(126,231,255,0.15),transparent_45%)]" />
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              {contextBadge}
            </div>
            <h2 className="text-lg font-semibold text-white">{resolvedTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-ds-subtle">{resolvedDescription}</p>
            {entityLabel ? (
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-cyan-200/80">
                Đang nối từ {entityLabel} sang lộ trình học
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium text-slate-900 transition hover:bg-white/90"
            >
              <PlayCircle className="h-4 w-4" />
              {ctaLabel}
            </Link>
            {secondaryHref && secondary ? (
              <Link
                href={secondaryHref}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-2 text-sm text-white transition hover:bg-white/[0.08]"
              >
                <Compass className="h-4 w-4" />
                {secondary.ctaLabel || secondary.title}
              </Link>
            ) : null}
            {!hideKnowledgeMap && !primaryOnly ? (
              <Link
                href="/tutorial/knowledge-map"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-2 text-sm text-white transition hover:bg-white/[0.08]"
              >
                <Map className="h-4 w-4" />
                Bản đồ tri thức
              </Link>
            ) : null}
          </div>
        </div>

        {!primaryOnly && !compact ? (
          <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Lối vào chính</p>
              <p className="mt-2 text-base font-semibold text-white">
                {action.lessonTitle || resolvedTitle}
              </p>
              <p className="mt-1 text-sm text-ds-subtle">{action.reason}</p>
              <Link
                href={primaryHref}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-amber-300 transition hover:text-amber-200"
              >
                {ctaLabel}
                <span aria-hidden>→</span>
              </Link>
            </div>

            <div className="space-y-2">
              <Step
                title="1. Học theo lộ trình"
                description="Một bước chính tại một thời điểm — hoàn thành bài trước khi nhảy sang chủ đề khác."
              />
              <Step
                title="2. Củng cố trên Explore 3D"
                description="Sau mỗi bài, mở thiên thể liên quan để thấy khái niệm trong không gian."
              />
              <Step
                title="3. Tiếp tục bài kế tiếp"
                description="Dashboard và Lộ trình luôn chỉ một nút “tiếp theo” để bạn không lạc hướng."
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
