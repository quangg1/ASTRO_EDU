'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  initialQuery?: string
  scope?: 'all' | 'news' | 'discussion'
  placeholder?: string
  /** Nếu true — submit chuyển tới /community/search */
  global?: boolean
  className?: string
  onLocalSearch?: (q: string) => void
}

export function CommunitySearchBar({
  initialQuery = '',
  scope = 'all',
  placeholder = 'Tìm bài viết (tối thiểu 2 ký tự)…',
  global = true,
  className = '',
  onLocalSearch,
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
    <form onSubmit={submit} className={`flex flex-col sm:flex-row gap-2 ${className}`}>
      <input
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          if (onLocalSearch && e.target.value.trim().length < 2) onLocalSearch('')
        }}
        placeholder={placeholder}
        className="cosmo-input-surface flex-1 rounded-xl px-3 py-2.5 text-sm text-ds-text placeholder:text-ds-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent/40"
      />
      <button
        type="submit"
        disabled={value.trim().length < 2}
        className="rounded-xl bg-ds-accent px-4 py-2.5 text-sm font-medium text-ds-base disabled:opacity-40 hover:opacity-90"
      >
        Tìm
      </button>
      {global && (
        <Link
          href={`/community/search?scope=${scope}`}
          className="text-xs text-cyan-400/90 self-center hover:text-ds-text whitespace-nowrap"
        >
          Tìm nâng cao
        </Link>
      )}
    </form>
  )
}
