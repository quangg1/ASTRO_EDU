'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import clsx from 'clsx'

type Props = {
  className?: string
  placeholder?: string
  /** hero = trang chủ space-premium; panel = nền HUD tối */
  variant?: 'hero' | 'panel'
  defaultQuery?: string
}

export function CatalogSearchField({
  className,
  placeholder = 'Tìm khóa học, lộ trình, bài học…',
  variant = 'panel',
  defaultQuery = '',
}: Props) {
  const router = useRouter()
  const [value, setValue] = useState(defaultQuery)

  const go = (raw: string) => {
    const q = raw.trim()
    if (!q) {
      router.push('/search')
      return
    }
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    go(value)
  }

  const hero = variant === 'hero'

  return (
    <form onSubmit={onSubmit} className={clsx('w-full', className)}>
      <div
        className={clsx(
          'flex items-center gap-3 rounded-xl border transition-colors',
          hero
            ? 'border-white/20 bg-white/[0.04] px-4 py-3.5 focus-within:border-white/40'
            : 'cosmo-dark-panel border-cyan-400/20 bg-[#060a14]/80 px-4 py-3 focus-within:border-cyan-400/40',
        )}
      >
        <Search
          className={clsx('h-4 w-4 shrink-0', hero ? 'text-white/50' : 'text-cyan-400/70')}
          aria-hidden
        />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={clsx(
            'min-w-0 flex-1 bg-transparent text-sm outline-none',
            hero ? 'text-white placeholder:text-white/35' : 'text-ds-text placeholder:text-ds-subtle',
          )}
          aria-label="Tìm kiếm catalog"
        />
        <button
          type="submit"
          className={clsx(
            'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            hero
              ? 'bg-white text-black hover:bg-white/90'
              : 'bg-cyan-500/90 text-[#042028] hover:bg-cyan-400',
          )}
        >
          Tìm
        </button>
      </div>
    </form>
  )
}
