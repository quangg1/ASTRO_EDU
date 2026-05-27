'use client'

import Link from 'next/link'
import { CornerBrackets } from '@/components/landing/CornerBrackets'

type Props = {
  categories: string[]
}

export function NewsTopicChips({ categories }: Props) {
  const list = categories.slice(0, 16)
  if (!list.length) return null

  return (
    <div
      className="relative hud-chamfer-md p-5 md:p-6"
      style={{
        background: 'rgba(6,9,26,0.85)',
        border: '1px solid rgba(126,231,255,0.15)',
      }}
    >
      <CornerBrackets />
      <div className="flex flex-wrap gap-2">
        {list.map((c) => (
          <Link
            key={c}
            href={`/community/tin-thien-van?category=${encodeURIComponent(c)}`}
            className="hud-chamfer-sm hud-mono hud-mono-sm inline-flex items-center gap-1.5 px-3.5 py-1.5 transition-all hover:shadow-[0_0_12px_rgba(126,231,255,0.2)]"
            style={{
              background: 'rgba(126,231,255,0.05)',
              border: '1px solid rgba(126,231,255,0.18)',
              color: 'var(--hud-ink-2)',
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: 'var(--hud-plasma)', opacity: 0.6 }}
              aria-hidden
            />
            {c}
          </Link>
        ))}
      </div>
    </div>
  )
}
