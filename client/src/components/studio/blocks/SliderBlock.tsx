'use client'

import { useState, useEffect } from 'react'
import type { LessonSection } from '@/features/courses/public'

function evalFormula(formula: string, x: number): string {
  if (!formula?.trim()) return String(x)
  try {
    const expr = formula.replace(/\^/g, '**')
    const fn = new Function('x', `return (${expr})`)
    const result = fn(x)
    return typeof result === 'number' ? result.toFixed(4) : String(result)
  } catch {
    return String(x)
  }
}

interface Props {
  section: LessonSection
  update: (p: Partial<LessonSection>) => void
  editMode?: boolean
}

export default function SliderBlock({ section, update, editMode }: Props) {
  const min = section.sliderMin ?? 0
  const max = section.sliderMax ?? 100
  const step = section.sliderStep ?? 1
  const formula = section.sliderFormula ?? 'x'
  const label = section.sliderLabel ?? 'x'
  const unit = section.sliderUnit ?? ''

  const [value, setValue] = useState(min)
  useEffect(() => {
    if (value < min) setValue(min)
    if (value > max) setValue(max)
  }, [min, max, value])

  const result = evalFormula(formula, value)

  if (editMode) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] text-ds-subtle block mb-1">Min</label>
            <input
              type="number"
              value={min}
              onChange={(e) => update({ sliderMin: Number(e.target.value) })}
              className="studio-field"
            />
          </div>
          <div>
            <label className="text-[10px] text-ds-subtle block mb-1">Max</label>
            <input
              type="number"
              value={max}
              onChange={(e) => update({ sliderMax: Number(e.target.value) })}
              className="studio-field"
            />
          </div>
          <div>
            <label className="text-[10px] text-ds-subtle block mb-1">Step</label>
            <input
              type="number"
              value={step}
              onChange={(e) => update({ sliderStep: Number(e.target.value) || 1 })}
              className="studio-field"
            />
          </div>
          <div>
            <label className="text-[10px] text-ds-subtle block mb-1">Unit</label>
            <input
              value={unit}
              onChange={(e) => update({ sliderUnit: e.target.value })}
              placeholder="Ma, km, %"
              className="studio-field"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-ds-subtle block mb-1">Formula (use x)</label>
          <input
            value={formula}
            onChange={(e) => update({ sliderFormula: e.target.value })}
            placeholder="x^2, x*2+1, Math.sin(x)"
            className="studio-field"
          />
        </div>
        <div>
          <label className="text-[10px] text-ds-subtle block mb-1">Label</label>
          <input
            value={label}
            onChange={(e) => update({ sliderLabel: e.target.value })}
            placeholder="x"
            className="studio-field"
          />
        </div>
        <div className="rounded-xl border border-ds-accent-strong bg-black/30 p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ds-accent">{label} = {value}{unit ? ` ${unit}` : ''}</span>
            <span className="text-white font-mono">f(x) = {result}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none bg-white/10 accent-cyan-500"
          />
          {formula && (
            <div className="pt-2 border-t border-ds-border text-center text-sm text-gray-300 font-mono">
              {formula.replace(/x/g, String(value))} = {result}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-ds-accent-strong bg-black/30 p-5 space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ds-accent font-medium">
          {label} = {value}{unit ? ` ${unit}` : ''}
        </span>
        <span className="text-white font-mono bg-white/5 px-2 py-1 rounded">f(x) = {result}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full h-3 rounded-lg appearance-none bg-white/10 accent-cyan-500 cursor-pointer"
      />
      {formula && (
        <div className="pt-3 border-t border-ds-border text-center text-gray-300 font-mono text-sm">
          {formula.replace(/x/g, String(value))} = {result}
        </div>
      )}
    </div>
  )
}
