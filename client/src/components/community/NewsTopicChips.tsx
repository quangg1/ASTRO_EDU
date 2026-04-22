'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'

type Props = {
  categories: string[]
}

/** Chip dẫn tới trang tin đã lọc theo category (?category=). */
export function NewsTopicChips({ categories }: Props) {
  const list = categories.slice(0, 16)
  if (!list.length) return null

  return (
    <section className="rounded-2xl border border-white/10 bg-[#060a14]/90 p-5 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-cyan-400/80" aria-hidden />
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Khám phá theo chủ đề</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {list.map((c) => (
          <Link
            key={c}
            href={`/community/tin-thien-van?category=${encodeURIComponent(c)}`}
            className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-100"
          >
            {c}
          </Link>
        ))}
      </div>
    </section>
  )
}
