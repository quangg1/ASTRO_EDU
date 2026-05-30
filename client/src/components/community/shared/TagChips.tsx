'use client'

import Link from 'next/link'
import type { CommunityTagCount } from '@/features/community/api/communityApi'

type Props = {
  tags: CommunityTagCount[]
  activeTag?: string
  onSelect?: (tag: string) => void
  title?: string
}

export function TagChips({ tags, activeTag = '', onSelect, title = 'Hashtag' }: Props) {
  if (!tags.length) return null

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
      <div className="flex flex-wrap gap-2">
        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect('')}
            className={`rounded-full px-3 py-1 text-xs border transition-colors ${
              !activeTag
                ? 'border-violet-400/50 bg-violet-500/20 text-violet-100'
                : 'border-white/15 bg-white/5 text-gray-400 hover:border-white/25'
            }`}
          >
            Tất cả
          </button>
        )}
        {tags.map((t) => {
          const active = activeTag === t.tag
          const label = `#${t.tag}`
          const className = `rounded-full px-3 py-1 text-xs border transition-colors ${
            active
              ? 'border-violet-400/50 bg-violet-500/20 text-violet-100'
              : 'border-white/15 bg-white/5 text-gray-400 hover:border-white/25'
          }`
          if (onSelect) {
            return (
              <button key={t.tag} type="button" onClick={() => onSelect(t.tag)} className={className}>
                {label} <span className="text-gray-500">({t.count})</span>
              </button>
            )
          }
          return (
            <Link key={t.tag} href={`/community/tags/${encodeURIComponent(t.tag)}`} className={className}>
              {label} <span className="text-gray-500">({t.count})</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
