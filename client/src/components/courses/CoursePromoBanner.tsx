'use client'

import Link from 'next/link'
import { Tag } from 'lucide-react'
import type { CoursePromoBanner as PromoBannerData } from '@/features/promotions/api/promoApi'
import { useT } from '@/i18n/public'

export function CoursePromoBanner({
  banner,
  checkoutHref,
}: {
  banner: PromoBannerData
  checkoutHref: string
}) {
  const { t } = useT()
  const accent = banner.bannerAccentColor?.startsWith('#')
    ? banner.bannerAccentColor
    : '#06b6d4'
  const href = `${checkoutHref}?promo=${encodeURIComponent(banner.code)}`

  return (
    <div
      className="rounded-xl border px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{
        borderColor: `${accent}55`,
        background: `linear-gradient(135deg, ${accent}18 0%, transparent 60%)`,
      }}
      role="region"
      aria-label={t('courses.promoTitle')}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span
          className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}33`, color: accent }}
          aria-hidden
        >
          <Tag className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{banner.bannerTitleVi}</p>
          {banner.bannerBodyVi ? (
            <p className="text-xs text-ds-muted mt-0.5 leading-relaxed">{banner.bannerBodyVi}</p>
          ) : null}
          <p className="text-[11px] text-ds-subtle mt-1">
            {banner.discountLabelVi}
            {banner.endsAt ? (
              <>
                {' '}
                · {t('courses.promoExpires')}{' '}
                {new Date(banner.endsAt).toLocaleDateString('vi-VN', {
                  day: 'numeric',
                  month: 'short',
                })}
              </>
            ) : null}
          </p>
        </div>
      </div>
      <Link
        href={href}
        className="shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: accent }}
      >
        {t('courses.promoUseCode', { code: banner.code })}
      </Link>
    </div>
  )
}
