'use client'

import { useState } from 'react'
import { earthHistoryData } from '@/features/content3d/earth/public'

interface Props {
  value: number | null
  onChange: (stageTime: number | null) => void
}

export default function StageTimePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const stages = earthHistoryData
  const current = value != null ? stages.find((s) => s.time === value) : null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex-1 rounded-lg border border-ds-border-strong bg-black/50 px-3 py-2 text-left text-sm transition-colors hover:border-ds-accent-strong"
        >
          {current ? (
            <span className="flex items-center gap-2">
              <span className="text-base">{current.icon}</span>
              <span className="text-white">{current.name}</span>
              <span className="text-ds-subtle text-xs ml-auto">{current.timeDisplay}</span>
            </span>
          ) : value != null ? (
            <span className="text-ds-muted">Custom: {value} Ma</span>
          ) : (
            <span className="text-ds-subtle">Select Earth History stage...</span>
          )}
        </button>
        {value != null && (
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false) }}
            className="text-xs text-red-400/60 hover:text-red-400 px-2"
          >
            Clear
          </button>
        )}
      </div>

      {open && (
        <div className="rounded-xl border border-ds-accent-strong bg-ds-surface max-h-[400px] overflow-auto shadow-2xl shadow-cyan-500/5">
          <div className="sticky top-0 px-3 py-2 border-b border-ds-border bg-ds-surface">
            <p className="text-[10px] uppercase tracking-wider text-ds-subtle">Earth History Timeline</p>
          </div>
          <div className="p-1">
            {stages.map((stage) => {
              const isActive = value === stage.time
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => { onChange(stage.time); setOpen(false) }}
                  className={`w-full text-left rounded-lg px-3 py-2.5 transition-all flex items-start gap-3 group ${
                    isActive
                      ? 'bg-ds-accent-soft border border-ds-accent-strong'
                      : 'border border-transparent hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl mt-0.5 group-hover:scale-110 transition-transform">{stage.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isActive ? 'text-ds-accent' : 'text-white'}`}>
                        {stage.name}
                      </span>
                      <span className="text-[10px] text-ds-subtle ml-auto shrink-0">
                        {stage.timeDisplay}
                      </span>
                    </div>
                    <p className="text-[11px] text-ds-subtle leading-tight mt-0.5 line-clamp-1">{stage.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-ds-subtle">
                      <span>{stage.eon}</span>
                      {stage.era && <><span>-</span><span>{stage.era}</span></>}
                      {stage.period && <><span>-</span><span>{stage.period}</span></>}
                      <span className="ml-auto">O2: {stage.o2}% | CO2: {stage.co2}ppm</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
