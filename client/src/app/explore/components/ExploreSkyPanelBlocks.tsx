'use client'

import Image from 'next/image'
import type { ShowcasePanelBlockDTO } from '@/features/content3d/showcase/public'

export function ExploreSkyPanelBlocks({ blocks }: { blocks: ShowcasePanelBlockDTO[] }) {
  if (!blocks.length) return null
  return (
    <div className="mt-4 space-y-3">
      {blocks.map((b, idx) => (
        <SkyPanelBlock key={b.id || `${b.type}-${idx}`} block={b} />
      ))}
    </div>
  )
}

function SkyPanelBlock({ block }: { block: ShowcasePanelBlockDTO }) {
  if (block.type === 'image' && block.imageUrl) {
    return (
      <figure className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
        <div className="relative aspect-[4/3] w-full">
          <Image src={block.imageUrl} alt={block.title || ''} fill className="object-cover" sizes="21rem" />
        </div>
        {block.title ? (
          <figcaption className="px-3 py-2 text-[11px] text-slate-400">{block.title}</figcaption>
        ) : null}
      </figure>
    )
  }

  if (block.type === 'chart' && block.points?.length) {
    const max = Math.max(...block.points.map((p) => p.value), 1)
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3">
        {block.title ? <p className="text-xs font-medium text-white/80">{block.title}</p> : null}
        <div className="mt-2 space-y-1.5">
          {block.points.map((p) => (
            <div key={p.label} className="flex items-center gap-2 text-[11px]">
              <span className="w-24 shrink-0 truncate text-slate-400">{p.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-violet-400/70"
                  style={{ width: `${Math.max(4, (p.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!block.title && !block.body) return null
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3">
      {block.title ? <p className="text-xs font-medium text-white/85">{block.title}</p> : null}
      {block.body ? (
        <p className={`text-sm leading-relaxed text-slate-300/90 ${block.title ? 'mt-1.5' : ''}`}>
          {block.body}
        </p>
      ) : null}
    </div>
  )
}
