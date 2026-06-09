'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import {
  fetchActivePromotions,
  type ActivePromoCampaign,
} from '@/features/promotions/api/promoApi'
import { dismissPromo, undismissedPromos } from '@/features/promotions/lib/promoDismiss'
import { useT } from '@/i18n/public'

export function PromoNotificationsSection({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useT()
  const [promos, setPromos] = useState<ActivePromoCampaign[]>([])

  useEffect(() => {
    void fetchActivePromotions(4).then((list) => setPromos(undismissedPromos(list)))
  }, [])

  if (!promos.length) return null

  return (
    <div className="border-b border-violet-500/20 bg-violet-500/5">
      <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-ds-accent/90 font-medium flex items-center gap-1">
        <Sparkles className="h-3 w-3" aria-hidden />
        {t('promo.active')}
      </p>
      <ul>
        {promos.map((p) => (
          <li key={p.code}>
            <Link
              href={p.primaryCheckoutHref || p.primaryHref}
              className="block px-3 py-2.5 hover:bg-white/5 transition-colors border-b border-ds-border/40"
              onClick={onNavigate}
            >
              <p className="text-sm font-medium text-ds-text">{p.bannerTitleVi}</p>
              <p className="text-xs text-ds-subtle mt-0.5 line-clamp-2">{p.bannerBodyVi}</p>
              <p className="text-[10px] text-cyan-400/90 mt-1 font-mono">{t('promo.code', { code: p.code })}</p>
            </Link>
          </li>
        ))}
      </ul>
      {promos.length > 0 && (
        <button
          type="button"
          className="w-full text-center text-[11px] text-ds-muted py-2 hover:text-ds-text"
          onClick={() => {
            promos.forEach((p) => dismissPromo(p.code))
            setPromos([])
            onNavigate?.()
          }}
        >
          {t('promo.hideSession')}
        </button>
      )}
    </div>
  )
}
