'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { LessonSection } from '@/lib/coursesApi'

const CHART_TYPES = ['line', 'bar', 'area', 'pie'] as const

function parseChartData(raw: unknown): Array<{ name: string; value: number } | { x: number | string; y: number }> {
  if (!Array.isArray(raw)) return [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 4 }]
  return raw.map((item) => {
    if (item && typeof item === 'object') {
      if ('name' in item && 'value' in item) return { name: String(item.name), value: Number(item.value) }
      if ('x' in item && 'y' in item) return { x: item.x, y: Number(item.y) }
    }
    return { x: 0, y: 0 }
  })
}

const lineColor = '#06b6d4'
const tooltipStyle = { background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }

function ChartRenderer({ chartType, chartData }: { chartType: string; chartData: unknown }) {
  const data = useMemo(() => parseChartData(chartData), [chartData])

  if (chartType === 'pie') {
    const pieData = data.map((d) => ('name' in d ? d : { name: String((d as { x: unknown }).x), value: (d as { y: number }).y }))
    return (
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill={lineColor} label />
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const common = { margin: { top: 5, right: 5, left: 5, bottom: 5 } }
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
  const xAxis = <XAxis dataKey="x" stroke="#94a3b8" fontSize={11} />
  const yAxis = <YAxis stroke="#94a3b8" fontSize={11} />
  const tooltip = <Tooltip contentStyle={tooltipStyle} />

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'line' && (
          <LineChart data={data} {...common}>
            {grid}{xAxis}{yAxis}{tooltip}
            <Line type="monotone" dataKey="y" stroke={lineColor} strokeWidth={2} dot={{ fill: lineColor }} />
          </LineChart>
        )}
        {chartType === 'bar' && (
          <BarChart data={data} {...common}>
            {grid}{xAxis}{yAxis}{tooltip}
            <Bar dataKey="y" fill={lineColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
        {chartType === 'area' && (
          <AreaChart data={data} {...common}>
            {grid}{xAxis}{yAxis}{tooltip}
            <Area type="monotone" dataKey="y" stroke={lineColor} fill={lineColor} fillOpacity={0.3} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

const inputCls = 'w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none'

interface Props {
  section: LessonSection
  update: (p: Partial<LessonSection>) => void
  editMode?: boolean
}

export default function ChartBlock({ section, update, editMode }: Props) {
  const chartType = section.chartType || 'line'
  const chartData = section.chartData || [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 4 }]
  const dataStr = JSON.stringify(chartData, null, 2)

  const setDataFromStr = (s: string) => {
    try {
      const parsed = JSON.parse(s)
      if (Array.isArray(parsed)) update({ chartData: parsed })
    } catch {
      // ignore
    }
  }

  if (editMode) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          {CHART_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update({ chartType: t })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                chartType === t ? 'bg-cyan-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <textarea
          value={dataStr}
          onChange={(e) => setDataFromStr(e.target.value)}
          rows={6}
          placeholder='[{"x": 0, "y": 0}, {"x": 1, "y": 2}] or [{"name": "A", "value": 10}] for pie'
          className={`${inputCls} font-mono text-xs`}
          spellCheck={false}
        />
        <div className="rounded-xl border border-cyan-500/20 bg-black/30 p-4">
          <ChartRenderer chartType={chartType} chartData={chartData} />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <ChartRenderer chartType={chartType} chartData={chartData} />
    </div>
  )
}
