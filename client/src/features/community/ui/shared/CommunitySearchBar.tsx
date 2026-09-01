'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'

type Props = {
  initialQuery?: string
  scope?: 'all' | 'news' | 'discussion'
  placeholder?: string
  /** Nếu true — submit chuyển tới /community/search */
  global?: boolean
  className?: string
  onLocalSearch?: (q: string) => void
  compact?: boolean
}

export function CommunitySearchBar({
  initialQuery = '',
  scope = 'all',
  placeholder = 'Tìm tin thiên văn, thảo luận…',
  global = true,
  className = '',
  onLocalSearch,
  compact = false,
}: Props) {
  const router = useRouter()
  const [value, setValue] = useState(initialQuery)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = value.trim()
    if (q.length < 2) return
    if (onLocalSearch) {
      onLocalSearch(q)
      return
    }
    if (global) {
      const params = new URLSearchParams({ q, scope })
      router.push(`/community/search?${params.toString()}`)
    }
  }

  return (
    <form onSubmit={submit} className={className}>
      <div
        className={`cosmo-dark-panel flex items-center gap-2 rounded-xl border border-cyan-400/15 bg-[#060a14]/80 ${
          compact ? 'px-3 py-2' : 'px-4 py-2.5'
        }`}
      >
        <Search className="h-4 w-4 shrink-0 text-cyan-400/70" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (onLocalSearch && e.target.value.trim().length < 2) onLocalSearch('')
          }}
          placeholder={placeholder}
          className="cosmo-field min-w-0 flex-1 border-0 bg-transparent px-0 py-1 text-sm shadow-none focus:border-0 focus:shadow-none"
        />
        <button
          type="submit"
          disabled={value.trim().length < 2}
          className="shrink-0 rounded-lg bg-cyan-500/90 px-3 py-1.5 text-xs font-medium text-[#042028] disabled:opacity-35 hover:bg-cyan-400"
        >
          Tìm
        </button>
      </div>
      {global && !compact ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ds-subtle">
          <span>Gợi ý: hành tinh, NASA, lộ trình học</span>
          <Link href="/search" className="text-cyan-400/90 hover:text-ds-text">
            Tìm khóa học →
          </Link>
          <Link href={`/community/search?scope=${scope}`} className="text-cyan-400/90 hover:text-ds-text">
            Lọc nâng cao →
          </Link>
        </div>
      ) : null}
    </form>
  )
}
