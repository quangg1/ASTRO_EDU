'use client'

import { useEffect, useRef } from 'react'
import 'katex/dist/katex.min.css'

interface Props {
  latex: string
  displayMode?: boolean
}

export default function MathBlock({ latex, displayMode = true }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!latex?.trim() || typeof window === 'undefined') return
    import('katex').then((katex) => {
      if (!ref.current) return
      try {
        katex.default.render(latex, ref.current, {
          displayMode,
          throwOnError: false,
          errorColor: '#ef4444',
          output: 'html',
        })
      } catch {
        ref.current.innerHTML = `<span class="text-red-400">LaTeX error</span>`
      }
    })
  }, [latex, displayMode])

  if (!latex?.trim()) return null
  return <div ref={ref} className="text-white text-center [&_.katex]:text-lg" />
}
