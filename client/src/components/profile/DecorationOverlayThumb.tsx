'use client'

import { resolveMediaUrl } from '@/lib/apiConfig'

type Props = {
  overlayUrl: string
  selected?: boolean
  equipped?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  className?: string
}

/** Ô lưới — chỉ hiện asset overlay (không ghép avatar lặp lại). */
export function DecorationOverlayThumb({
  overlayUrl,
  selected,
  equipped,
  onClick,
  onMouseEnter,
  className = '',
}: Props) {
  const src = resolveMediaUrl(overlayUrl)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onMouseEnter}
      className={`relative aspect-square rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 ${
        selected
          ? 'border-violet-400/70 bg-violet-500/15 ring-1 ring-violet-400/50'
          : 'border-ds-border bg-ds-elevated hover:border-white/25 hover:bg-[#18151f]'
      } ${className}`}
    >
      <div className="absolute inset-2 flex items-center justify-center">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="max-w-full max-h-full object-contain" />
        ) : (
          <span className="text-[10px] text-slate-600">—</span>
        )}
      </div>
      {equipped ? (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#12101a]" title="Đang đeo" />
      ) : null}
    </button>
  )
}
