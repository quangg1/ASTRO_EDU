'use client'

import { Clock, ThumbsUp, TrendingUp } from 'lucide-react'
import { useT } from '@/i18n/public'

type Sort = 'newest' | 'hot' | 'top'

type Option = { value: Sort; labelKey: string; icon: typeof Clock }

type Props = {
  sort: Sort
  onSortChange: (sort: Sort) => void
  variant?: 'news' | 'discussion'
}

export function PostSortBar({ sort, onSortChange, variant = 'discussion' }: Props) {
  const { t } = useT()

  const options: Option[] =
    variant === 'news'
      ? [
          { value: 'newest', labelKey: 'community.sortNewest', icon: Clock },
          { value: 'hot', labelKey: 'community.sortHot', icon: TrendingUp },
          { value: 'top', labelKey: 'community.sortEngagement', icon: ThumbsUp },
        ]
      : [
          { value: 'newest', labelKey: 'community.sortNewest', icon: Clock },
          { value: 'hot', labelKey: 'community.sortFeatured', icon: TrendingUp },
          { value: 'top', labelKey: 'community.sortTopVote', icon: ThumbsUp },
        ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-ds-subtle">{t('community.sortLabel')}</span>
      {options.map((option) => {
        const Icon = option.icon
        const active = sort === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSortChange(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              active
                ? 'border border-cyan-300/40 bg-cyan-500/25 text-cyan-200'
                : 'border border-ds-border bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {t(option.labelKey)}
          </button>
        )
      })}
    </div>
  )
}
