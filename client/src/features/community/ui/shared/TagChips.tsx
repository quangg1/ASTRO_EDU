'use client'

import Link from 'next/link'
import type { CommunityTagCount } from '@/features/community/public'
import { useT } from '@/i18n/public'

type Props = {
  tags: CommunityTagCount[]
  activeTag?: string
  onSelect?: (tag: string) => void
  title?: string
}

export function TagChips({ tags, activeTag = '', onSelect, title }: Props) {
  const { t } = useT()
  const heading = title ?? t('community.hashtagTitle')

  if (!tags.length) return null

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-ds-subtle">{heading}</p>
      <div className="flex flex-wrap gap-2">
        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect('')}
            className={`rounded-full px-3 py-1 text-xs border transition-colors ${
              !activeTag
                ? 'border-violet-400/50 bg-violet-500/20 text-violet-100'
                : 'border-ds-border bg-white/5 text-ds-muted hover:border-white/25'
            }`}
          >
            {t('community.all')}
          </button>
        )}
        {tags.map((tagItem) => {
          const active = activeTag === tagItem.tag
          const label = `#${tagItem.tag}`
          const className = `rounded-full px-3 py-1 text-xs border transition-colors ${
            active
              ? 'border-violet-400/50 bg-violet-500/20 text-violet-100'
              : 'border-ds-border bg-white/5 text-ds-muted hover:border-white/25'
          }`
          if (onSelect) {
            return (
              <button key={tagItem.tag} type="button" onClick={() => onSelect(tagItem.tag)} className={className}>
                {label} <span className="text-ds-subtle">({tagItem.count})</span>
              </button>
            )
          }
          return (
            <Link key={tagItem.tag} href={`/community/tags/${encodeURIComponent(tagItem.tag)}`} className={className}>
              {label} <span className="text-ds-subtle">({tagItem.count})</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
