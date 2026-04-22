'use client'

import { useEffect, useRef } from 'react'
import 'katex/dist/katex.min.css'

interface Props {
  latex: string
  displayMode?: boolean
}

function escapeLatexText(value: string): string {
  return value
    .replace(/\\/g, '\\textbackslash ')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
}

function normalizeMathInput(raw: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return lines
    .map((line) => {
      const looksLikeMath = /[=^_\\{}+\-*/()[\]<>]/.test(line)
      if (looksLikeMath) return line
      return `\\text{${escapeLatexText(line)}}`
    })
    .join(' \\\\ ')
}

export default function MathBlock({ latex, displayMode = true }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const normalizedLatex = normalizeMathInput(latex)

  useEffect(() => {
    if (!normalizedLatex?.trim() || typeof window === 'undefined') return
    import('katex').then((katex) => {
      if (!ref.current) return
      try {
        katex.default.render(normalizedLatex, ref.current, {
          displayMode,
          throwOnError: false,
          errorColor: '#ef4444',
          output: 'html',
        })
      } catch {
        ref.current.innerHTML = `<span class="text-red-400">LaTeX error</span>`
      }
    })
  }, [normalizedLatex, displayMode])

  if (!normalizedLatex?.trim()) return null
  return <div ref={ref} className="text-white text-center [&_.katex]:text-lg" />
}
