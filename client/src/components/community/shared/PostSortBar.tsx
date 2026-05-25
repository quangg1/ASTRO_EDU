'use client'

type Sort = 'newest' | 'hot' | 'top'

type Option = { value: Sort; label: string }

type Props = {
  sort: Sort
  onSortChange: (sort: Sort) => void
  variant?: 'news' | 'discussion'
}

export function PostSortBar({ sort, onSortChange, variant = 'discussion' }: Props) {
  const options: Option[] =
    variant === 'news'
      ? [
          { value: 'newest', label: 'Mới nhất' },
          { value: 'hot', label: 'Đang được xem' },
          { value: 'top', label: 'Nhiều tương tác' },
        ]
      : [
          { value: 'newest', label: 'Mới nhất' },
          { value: 'hot', label: 'Nổi bật' },
          { value: 'top', label: 'Top vote' },
        ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-gray-500">Sắp xếp:</span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSortChange(option.value)}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            sort === option.value
              ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-300/40'
              : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
