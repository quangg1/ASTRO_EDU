'use client'

import { useMemo, useState } from 'react'
import { CopyPlus, Trash2 } from 'lucide-react'
import type { LearningConcept } from '@/data/learningPathCurriculum'
import { NASA_SHOWCASE_ITEMS } from '@/lib/showcaseEntities'
import type { BridgeRuleAction, BridgeRuleEvent, LearningPathBridgeRule } from '@/lib/learningPathApi'

type Props = {
  rules: LearningPathBridgeRule[]
  concepts: LearningConcept[]
  onChange: (rules: LearningPathBridgeRule[]) => void
}

const EVENT_OPTIONS: Array<{ value: BridgeRuleEvent; label: string }> = [
  { value: 'entity_focus_stable', label: 'Focus ổn định' },
  { value: 'entity_clicked', label: 'Click entity' },
  { value: 'entity_discovered_first_time', label: 'Lần đầu khám phá' },
  { value: 'entity_focus_duration', label: 'Focus theo thời gian' },
]

const ACTION_OPTIONS: Array<{ value: BridgeRuleAction; label: string }> = [
  { value: 'show_concept_overlay', label: 'Hiển thị concept overlay' },
  { value: 'mark_lessons_visited3d', label: 'Mark lesson visited_3d' },
  { value: 'trigger_contextual_quiz', label: 'Trigger quiz ngữ cảnh' },
  { value: 'unlock_discovery_badge', label: 'Unlock discovery badge' },
]

function uid() {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function createRuleTemplate(kind: 'overlay' | 'progress' | 'quiz' | 'discovery', entityId: string, conceptId: string): LearningPathBridgeRule {
  if (kind === 'progress') {
    return {
      id: uid(),
      entityId,
      event: 'entity_focus_duration',
      action: 'mark_lessons_visited3d',
      thresholdSec: 3,
      active: true,
    }
  }
  if (kind === 'quiz') {
    return {
      id: uid(),
      entityId,
      event: 'entity_focus_duration',
      action: 'trigger_contextual_quiz',
      thresholdSec: 5,
      active: true,
    }
  }
  if (kind === 'discovery') {
    return {
      id: uid(),
      entityId,
      event: 'entity_discovered_first_time',
      action: 'unlock_discovery_badge',
      active: true,
    }
  }
  return {
    id: uid(),
    entityId,
    event: 'entity_focus_duration',
    action: 'show_concept_overlay',
    conceptId,
    thresholdSec: 3,
    active: true,
  }
}

export function BridgeRuleBuilder({ rules, concepts, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(rules[0]?.id ?? null)
  const selectedRule = useMemo(() => rules.find((r) => r.id === selectedId) ?? null, [rules, selectedId])
  const conceptOptions = useMemo(
    () =>
      concepts
        .map((c) => ({ id: c.id, label: c.title || c.id }))
        .sort((a, b) => a.label.localeCompare(b.label, 'vi')),
    [concepts],
  )

  const patchRule = (id: string, patch: Partial<LearningPathBridgeRule>) => {
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0c1018] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Content Bridge Studio</p>
          <h3 className="text-sm font-semibold text-white">Trigger Rule Builder</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            const next: LearningPathBridgeRule = {
              id: uid(),
              entityId: NASA_SHOWCASE_ITEMS[0]?.id || '',
              event: 'entity_clicked',
              action: 'show_concept_overlay',
              conceptId: conceptOptions[0]?.id || '',
              thresholdSec: 3,
              active: true,
            }
            onChange([next, ...rules])
            setSelectedId(next.id)
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20"
        >
          <CopyPlus className="h-3.5 w-3.5" />
          Thêm rule
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-2.5 max-h-60 overflow-y-auto space-y-1.5">
          {rules.length === 0 ? (
            <p className="text-xs text-slate-500">Chưa có rule nào.</p>
          ) : (
            rules.map((r, idx) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-left rounded-lg border px-2.5 py-2 text-xs ${
                  selectedId === r.id
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100'
                    : 'border-white/10 bg-black/20 text-slate-300 hover:border-white/20'
                }`}
              >
                <p className="font-medium">
                  #{idx + 1} {r.entityId}
                </p>
                <p className="text-[11px] text-slate-400">
                  {r.event} → {r.action}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-3 rounded-lg border border-cyan-500/25 bg-cyan-500/10 p-2.5">
            <p className="text-[11px] font-medium text-cyan-100">Tạo nhanh theo mục tiêu</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { id: 'overlay', label: 'Hiện thẻ kiến thức' },
                { id: 'progress', label: 'Đánh dấu đã khám phá' },
                { id: 'quiz', label: 'Bật quiz ngữ cảnh' },
                { id: 'discovery', label: 'Mở badge' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    const next = createRuleTemplate(
                      item.id as 'overlay' | 'progress' | 'quiz' | 'discovery',
                      selectedRule?.entityId || NASA_SHOWCASE_ITEMS[0]?.id || '',
                      selectedRule?.conceptId || conceptOptions[0]?.id || '',
                    )
                    onChange([next, ...rules])
                    setSelectedId(next.id)
                  }}
                  className="rounded-md border border-cyan-300/35 px-2 py-1 text-[11px] text-cyan-100 hover:bg-cyan-500/20"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {!selectedRule ? (
            <p className="text-xs text-slate-500">Chọn một rule để chỉnh sửa.</p>
          ) : (
            <div className="space-y-2.5">
              <label className="block text-[11px] text-slate-400">
                Entity
                <select
                  value={selectedRule.entityId}
                  onChange={(e) => patchRule(selectedRule.id, { entityId: e.target.value })}
                  className="mt-1 w-full rounded-lg bg-black/50 border border-white/15 px-2.5 py-2 text-xs text-white"
                >
                  {NASA_SHOWCASE_ITEMS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.id})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[11px] text-slate-400">
                Event
                <select
                  value={selectedRule.event}
                  onChange={(e) => patchRule(selectedRule.id, { event: e.target.value as BridgeRuleEvent })}
                  className="mt-1 w-full rounded-lg bg-black/50 border border-white/15 px-2.5 py-2 text-xs text-white"
                >
                  {EVENT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[11px] text-slate-400">
                Action
                <select
                  value={selectedRule.action}
                  onChange={(e) => patchRule(selectedRule.id, { action: e.target.value as BridgeRuleAction })}
                  className="mt-1 w-full rounded-lg bg-black/50 border border-white/15 px-2.5 py-2 text-xs text-white"
                >
                  {ACTION_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[11px] text-slate-400">
                Concept (optional)
                <select
                  value={selectedRule.conceptId || ''}
                  onChange={(e) => patchRule(selectedRule.id, { conceptId: e.target.value })}
                  className="mt-1 w-full rounded-lg bg-black/50 border border-white/15 px-2.5 py-2 text-xs text-white"
                >
                  <option value="">— Không chọn —</option>
                  {conceptOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} ({c.id})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[11px] text-slate-400">
                Threshold (sec, optional)
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={selectedRule.thresholdSec ?? ''}
                  onChange={(e) =>
                    patchRule(selectedRule.id, {
                      thresholdSec: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg bg-black/50 border border-white/15 px-2.5 py-2 text-xs text-white"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={selectedRule.active !== false}
                  onChange={(e) => patchRule(selectedRule.id, { active: e.target.checked })}
                />
                Rule đang active
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = rules.filter((x) => x.id !== selectedRule.id)
                  onChange(next)
                  setSelectedId(next[0]?.id ?? null)
                }}
                className="inline-flex items-center gap-1 rounded-md border border-red-500/35 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Xóa rule
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">
        <p className="text-[11px] text-slate-400 mb-1">Shared Data Layer: JSON Output</p>
        <pre className="text-[11px] text-slate-300 overflow-auto max-h-48">{JSON.stringify(rules, null, 2)}</pre>
      </div>
    </section>
  )
}
