'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { BookOpen, Check, ChevronDown, MessageCircle, Route, Sparkles } from 'lucide-react'
import type { ExploreStepId, ExploreStepView } from '../hooks/useExplorePanelLearning'

const STEP_ICON: Record<ExploreStepId, typeof BookOpen> = {
  read: BookOpen,
  quiz: Sparkles,
  lessons: Route,
  cosmo: MessageCircle,
}

type Props = {
  steps: ExploreStepView[]
  onStepAction: (id: ExploreStepId) => void
  loggedIn: boolean
}

export function ExploreLearningSteps({ steps, onStepAction, loggedIn }: Props) {
  const [expanded, setExpanded] = useState(false)
  const doneCount = steps.filter((s) => s.status === 'done').length
  const current = steps.find((s) => s.status === 'current') ?? steps[0]

  return (
    <div
      data-explore-tour="explore-learning-steps"
      className="border-b border-white/[0.06] pb-3"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg py-1 text-left transition hover:bg-white/[0.04]"
        aria-expanded={expanded}
      >
        <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-ds-accent shrink-0">
          Bước học
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1">
          {steps.map((step) => (
            <span
              key={step.id}
              className={clsx(
                'h-1 flex-1 rounded-full',
                step.status === 'done'
                  ? 'bg-emerald-400/70'
                  : step.status === 'current'
                    ? 'bg-ds-accent'
                    : 'bg-white/12',
              )}
              title={step.label}
            />
          ))}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums text-white/45">
          {doneCount}/{steps.length}
        </span>
        <ChevronDown
          className={clsx('h-3.5 w-3.5 shrink-0 text-white/40 transition', expanded && 'rotate-180')}
        />
      </button>

      {!expanded && current ? (
        <div className="mt-1 space-y-1">
          <p className="truncate text-[10px] text-white/50">
            Tiếp theo: <span className="text-white/75">{current.label}</span>
            {!loggedIn ? <span className="text-white/35"> · đăng nhập để lưu mastery</span> : null}
          </p>
          {current.id === 'read' && current.status === 'current' ? (
            <button
              type="button"
              onClick={() => onStepAction('read')}
              className="w-full rounded-lg border border-ds-accent-strong/45 bg-ds-accent-soft/80 px-2 py-1.5 text-[10px] font-semibold text-ds-accent transition hover:bg-ds-accent-soft"
            >
              Đánh dấu đã đọc panel
            </button>
          ) : null}
        </div>
      ) : null}

      {expanded ? (
        <ol className="mt-2 max-h-[9.5rem] space-y-1 overflow-y-auto pr-0.5">
          {steps.map((step) => {
            const Icon = STEP_ICON[step.id]
            const isDone = step.status === 'done'
            const isCurrent = step.status === 'current'
            const actionable =
              step.id === 'read' ||
              step.id === 'quiz' ||
              step.id === 'lessons' ||
              step.id === 'cosmo'

            return (
              <li key={step.id}>
                <button
                  type="button"
                  disabled={!actionable && !isCurrent}
                  onClick={() => {
                    if (actionable || isCurrent) onStepAction(step.id)
                  }}
                  className={clsx(
                    'flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition',
                    isCurrent
                      ? 'border-ds-accent-strong/50 bg-ds-accent-soft/70'
                      : isDone
                        ? 'border-emerald-400/20 bg-emerald-500/6'
                        : 'border-white/[0.06] bg-white/[0.02]',
                    !actionable && !isCurrent && 'cursor-default opacity-75',
                  )}
                >
                  <span
                    className={clsx(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      isDone
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                        : isCurrent
                          ? 'border-ds-accent-strong/60 text-ds-accent'
                          : 'border-white/12 text-white/35',
                    )}
                  >
                    {isDone ? (
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    ) : (
                      <Icon className="h-2.5 w-2.5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-white/85">
                    {step.label}
                  </span>
                  {actionable && isCurrent && !isDone ? (
                    <span className="shrink-0 text-[9px] font-semibold uppercase text-ds-accent">
                      {step.id === 'read' ? 'Xong' : 'Làm'}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ol>
      ) : null}
    </div>
  )
}
