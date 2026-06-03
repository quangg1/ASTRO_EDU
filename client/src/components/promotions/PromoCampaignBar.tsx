'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Tag, X } from 'lucide-react'
import {
  fetchActivePromotions,
  type ActivePromoCampaign,
} from '@/features/promotions/api/promoApi'
import { dismissPromo, undismissedPromos } from '@/features/promotions/lib/promoDismiss'

export function PromoCampaignBar() {
  const [campaign, setCampaign] = useState<ActivePromoCampaign | null>(null)

  const refresh = useCallback(async () => {
    const list = undismissedPromos(await fetchActivePromotions(5))
    setCampaign(list[0] ?? null)
  }, [])

  useEffect(() => {
    void refresh()
    const onDismiss = () => void refresh()
    window.addEventListener('promo-dismiss-changed', onDismiss)
    return () => window.removeEventListener('promo-dismiss-changed', onDismiss)
  }, [refresh])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('promo-bar-visible', { detail: Boolean(campaign) }))
    return () => {
      window.dispatchEvent(new CustomEvent('promo-bar-visible', { detail: false }))
    }
  }, [campaign])

  if (!campaign) return null

  const accent = campaign.bannerAccentColor?.startsWith('#')
    ? campaign.bannerAccentColor
    : '#06b6d4'
  const ctaHref = campaign.primaryCheckoutHref || campaign.primaryHref

  return (
    <div
      className="fixed top-14 left-0 right-0 z-[35] border-b px-3 py-2 sm:px-5"
      style={{
        borderColor: `${accent}44`,
        background: `linear-gradient(90deg, ${accent}22 0%, rgba(7,10,16,0.97) 55%)`,
      }}
      role="region"
      aria-label="Ưu đãi đang diễn ra"
    >
      <div className="max-w-[1600px] mx-auto flex items-center gap-2 sm:gap-3">
        <Tag className="h-4 w-4 shrink-0 hidden sm:block" style={{ color: accent }} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-white truncate">
            {campaign.bannerTitleVi}
            <span className="text-white/50 font-normal hidden sm:inline">
              {' '}
              · Mã <span className="font-mono text-cyan-200/90">{campaign.code}</span>
            </span>
          </p>
          <p className="text-[10px] sm:text-xs text-ds-muted truncate sm:whitespace-normal sm:line-clamp-1">
            {campaign.bannerBodyVi}
            {campaign.appliesToAll && campaign.courses.length === 0
              ? ' · Áp dụng các khóa trả phí'
              : campaign.courses.length === 1
                ? ` · ${campaign.courses[0].title}`
                : campaign.courses.length > 1
                  ? ` · ${campaign.courses.length} khóa học`
                  : ''}
          </p>
        </div>
        <Link
          href={ctaHref}
          className="shrink-0 rounded-lg px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-white hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          Xem ưu đãi
        </Link>
        <button
          type="button"
          onClick={() => {
            dismissPromo(campaign.code)
            setCampaign(null)
          }}
          className="shrink-0 p-1.5 rounded-lg text-ds-muted hover:text-white hover:bg-white/10"
          aria-label="Ẩn thông báo ưu đãi"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
