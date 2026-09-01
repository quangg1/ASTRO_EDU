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
      className="relative cosmo-dark-panel rounded-2xl p-5 md:p-6"
      style={{
        background: 'var(--color-panel-glass)',
        border: '1px solid var(--color-accent-soft)',
      }}
    >
      <CornerBrackets />
      <div className="flex flex-wrap gap-2">
        {list.map((c) => (
          <Link
            key={c}
            href={`/community/tin-thien-van?category=${encodeURIComponent(c)}`}
            className="cosmo-dark-panel rounded-xl hud-mono hud-mono-sm inline-flex items-center gap-1.5 px-3.5 py-1.5 transition-all hover:shadow-[0_0_12px_rgba(126,231,255,0.2)]"
            style={{
              background: 'var(--color-accent-soft)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: 'var(--color-accent)', opacity: 0.6 }}
              aria-hidden
            />
            {c}
          </Link>
        ))}
      </div>
    </div>
  )
}
