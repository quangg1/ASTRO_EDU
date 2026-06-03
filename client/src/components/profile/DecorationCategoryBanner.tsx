'use client'

import { resolveMediaUrl } from '@/lib/apiConfig'

type Props = {
  nameVi: string
  subtitleVi?: string
  bannerUrl?: string | null
  /** lg ≈ banner cửa hàng Discord; sm cho admin preview */
  variant?: 'sm' | 'lg'
  className?: string
}

/**
 * Banner ngang cho nhóm trang trí — ảnh category + tiêu đề phủ lên (giống Discord Shop).
 */
export function DecorationCategoryBanner({
  nameVi,
  subtitleVi,
  bannerUrl,
  variant = 'lg',
  className = '',
}: Props) {
  const src = bannerUrl
    ? bannerUrl.startsWith('blob:')
      ? bannerUrl
      : resolveMediaUrl(bannerUrl)
    : ''
  const tall = variant === 'lg'

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-ds-border ${
        tall ? 'min-h-[120px] sm:min-h-[152px]' : 'min-h-[96px]'
      } ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-violet-950 via-[#1a1028] to-slate-950"
          aria-hidden
        />
      )}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
        aria-hidden
      />
      <div
        className={`relative z-10 flex flex-col justify-end h-full ${
          tall ? 'px-5 py-4 sm:px-6 sm:py-5' : 'px-4 py-3'
        }`}
      >
        <h3
          className={`font-bold text-white uppercase tracking-wider drop-shadow-md ${
            tall ? 'text-lg sm:text-xl md:text-2xl' : 'text-base sm:text-lg'
          }`}
        >
          {nameVi}
        </h3>
        {subtitleVi ? (
          <p
            className={`text-slate-200/95 mt-1 max-w-2xl drop-shadow ${
              tall ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
            }`}
          >
            {subtitleVi}
          </p>
        ) : null}
        {!src ? (
          <p className="text-[11px] text-ds-subtle mt-2">Chưa có ảnh banner nhóm — quản trị có thể tải lên.</p>
        ) : null}
      </div>
    </div>
  )
}
