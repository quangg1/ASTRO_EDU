'use client'

import { resolveMediaUrl } from '@/lib/apiConfig'

type Size = 'sm' | 'md' | 'lg' | 'xl'

/** Kích thước khung overlay (avatar nằm giữa, ~72% đường kính). */
const SIZE_PX: Record<Size, number> = {
  sm: 36,
  md: 52,
  lg: 96,
  xl: 128,
}

const AVATAR_DIAMETER_RATIO = 0.72

type Props = {
  avatarUrl: string | null | undefined
  displayName: string
  email?: string | null
  overlayUrl?: string | null
  size?: Size
  className?: string
}

/**
 * Avatar tròn ở giữa + lớp trang trí phủ full khung (Discord-style).
 * Overlay không bị clip bởi vòng tròn avatar.
 */
export function AvatarWithDecoration({
  avatarUrl,
  displayName,
  email,
  overlayUrl,
  size = 'md',
  className = '',
}: Props) {
  const framePx = SIZE_PX[size]
  const avatarPx = Math.round(framePx * AVATAR_DIAMETER_RATIO)
  const src = resolveMediaUrl(avatarUrl || '') || ''
  const overlay = resolveMediaUrl(overlayUrl || '') || ''
  const initial = (displayName || email || '?').trim().slice(0, 1).toUpperCase()

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: framePx, height: framePx }}
      role="img"
      aria-label={overlay ? `Avatar có trang trí ${displayName}` : `Avatar ${displayName}`}
    >
      <div
        className="absolute rounded-full overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center ring-1 ring-white/10"
        style={{
          width: avatarPx,
          height: avatarPx,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1,
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="w-full h-full object-cover" />
        ) : (
          <span
            className="font-semibold text-cyan-200/90"
            style={{ fontSize: Math.max(11, Math.round(avatarPx * 0.4)) }}
          >
            {initial}
          </span>
        )}
      </div>
      {overlay ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={overlay}
          alt=""
          className="absolute inset-0 w-full h-full pointer-events-none object-contain"
          style={{ zIndex: 2 }}
        />
      ) : null}
    </div>
  )
}
