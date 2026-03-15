'use client'

import { useState } from 'react'
import { earthHistoryData } from '@/lib/earthHistoryData'

interface Props {
  value: number | null
  onChange: (stageTime: number | null) => void
}

export default function StageTimePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const current = value != null ? earthHistoryData.find((s) => s.time === value) : null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex-1 rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-left text-sm transition-colors hover:border-cyan-500/40"
        >
          {current ? (
            <span className="flex items-center gap-2">
              <span className="text-base">{current.icon}</span>
              <span className="text-white">{current.name}</span>
              <span className="text-gray-500 text-xs ml-auto">{current.timeDisplay}</span>
            </span>
          ) : value != null ? (
            <span className="text-gray-400">Custom: {value} Ma</span>
          ) : (
            <span className="text-gray-600">Select Earth History stage...</span>
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
        <div className="rounded-xl border border-cyan-500/20 bg-[#060b14] max-h-[400px] overflow-auto shadow-2xl shadow-cyan-500/5">
          <div className="sticky top-0 px-3 py-2 border-b border-white/10 bg-[#060b14]">
            <p className="text-[10px] uppercase tracking-wider text-gray-600">Earth History Timeline</p>
          </div>
          <div className="p-1">
            {earthHistoryData.map((stage) => {
              const isActive = value === stage.time
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => { onChange(stage.time); setOpen(false) }}
                  className={`w-full text-left rounded-lg px-3 py-2.5 transition-all flex items-start gap-3 group ${
                    isActive
                      ? 'bg-cyan-500/15 border border-cyan-500/30'
                      : 'border border-transparent hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl mt-0.5 group-hover:scale-110 transition-transform">{stage.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isActive ? 'text-cyan-300' : 'text-white'}`}>
                        {stage.name}
                      </span>
                      <span className="text-[10px] text-gray-600 ml-auto shrink-0">
                        {stage.timeDisplay}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5 line-clamp-1">{stage.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-600">
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
