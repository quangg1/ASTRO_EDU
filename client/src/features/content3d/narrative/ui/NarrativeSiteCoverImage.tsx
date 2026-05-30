'use client'

import { useEffect, useState } from 'react'
import { narrativeCoverImageCandidates } from '@/features/content3d/narrative/lib/coverImageUrl'

type Props = {
  url: string
  alt: string
}

export function NarrativeSiteCoverImage({ url, alt }: Props) {
  const candidates = narrativeCoverImageCandidates(url)
  const [idx, setIdx] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setIdx(0)
    setFailed(false)
  }, [url])

  const src = candidates[idx]
  if (!src || failed) {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center rounded-xl border border-amber-500/25 bg-black/60 px-3 text-center">
        <p className="text-[11px] text-slate-400">Ảnh không tải được — cập nhật URL trong Studio.</p>
      </div>
    )
  }

  return (
    <div className="relative aspect-[16/10] w-full">
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        onError={() => {
          if (idx + 1 < candidates.length) setIdx((i) => i + 1)
          else setFailed(true)
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
    </div>
  )
}
