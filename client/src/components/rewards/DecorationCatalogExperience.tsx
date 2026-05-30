'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AvatarWithDecoration } from '@/components/profile/AvatarWithDecoration'
import { DecorationCategoryBanner } from '@/components/profile/DecorationCategoryBanner'
import { DecorationOverlayThumb } from '@/components/profile/DecorationOverlayThumb'
import { getToken } from '@/features/auth/api/authApi'
import {
  equipAvatarDecoration,
  fetchMyDecorationState,
  purchaseAvatarDecoration,
  type AvatarDecorationCatalogItem,
  type AvatarDecorationCategorySection,
} from '@/features/rewards/api/avatarDecorationApi'
import {
  DECORATION_UPDATED_EVENT,
  isDecorCategoryBannerSlug,
} from '@/features/rewards/constants/avatarDecoration'
import {
  flatItemsFromSections,
  formatDecorationPrice,
  sectionsFromDecorationResponse,
} from '@/features/rewards/lib/decorationCatalog'
import { Button, Card } from '@/design-system'

export type DecorationCatalogMode = 'profile' | 'shop'

type Props = {
  mode: DecorationCatalogMode
  avatarUrl: string | null | undefined
  displayName: string
  email?: string | null
  /** Bắt buộc khi `mode="shop"` — từ `fetchDecorationCatalog`. */
  categories?: AvatarDecorationCategorySection[]
  /** Tiêu đề nhóm fallback khi API chỉ trả items phẳng. */
  fallbackSectionTitle?: string
  className?: string
}

function dispatchDecorationUpdated() {
  window.dispatchEvent(new Event(DECORATION_UPDATED_EVENT))
}

export function DecorationCatalogExperience({
  mode,
  avatarUrl,
  displayName,
  email,
  categories: categoriesProp,
  fallbackSectionTitle = 'Trang trí avatar',
  className = '',
}: Props) {
  const isProfile = mode === 'profile'
  const loggedIn = Boolean(getToken())

  const [loading, setLoading] = useState(isProfile)
  const [busySku, setBusySku] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [gemBalance, setGemBalance] = useState<number | null>(null)
  const [equippedSkuId, setEquippedSkuId] = useState<string | null>(null)
  const [equippedOverlay, setEquippedOverlay] = useState<string | null>(null)
  const [ownedSkus, setOwnedSkus] = useState<Set<string>>(new Set())
  const [sections, setSections] = useState<AvatarDecorationCategorySection[]>(
    () => categoriesProp ?? [],
  )
  const [previewSku, setPreviewSku] = useState<string | null>(null)

  const flatCatalog = useMemo(() => flatItemsFromSections(sections), [sections])

  const applyMeState = useCallback((data: Awaited<ReturnType<typeof fetchMyDecorationState>>) => {
    setGemBalance(data.gemBalance)
    setEquippedSkuId(data.equippedDecorationSkuId)
    setEquippedOverlay(data.equippedOverlayUrl)
    setOwnedSkus(new Set(data.ownedDecorationSkus))
    if (isProfile) {
      setSections(
        sectionsFromDecorationResponse(data.categories, data.catalog, fallbackSectionTitle),
      )
    } else if (categoriesProp) {
      setSections(
        categoriesProp.map((sec) => ({
          ...sec,
          items: (sec.items || []).map((item) => ({
            ...item,
            owned: data.ownedDecorationSkus.includes(item.skuId),
          })),
        })),
      )
    }
  }, [isProfile, categoriesProp, fallbackSectionTitle])

  const refreshMe = useCallback(async () => {
    if (!loggedIn) {
      setOwnedSkus(new Set())
      setGemBalance(null)
      setEquippedSkuId(null)
      setEquippedOverlay(null)
      return
    }
    const data = await fetchMyDecorationState()
    applyMeState(data)
  }, [loggedIn, applyMeState])

  useEffect(() => {
    if (!isProfile && categoriesProp) {
      setSections(categoriesProp)
    }
  }, [isProfile, categoriesProp])

  useEffect(() => {
    if (!isProfile) return
    setLoading(true)
    setError('')
    fetchMyDecorationState()
      .then(applyMeState)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [isProfile, applyMeState])

  useEffect(() => {
    if (isProfile) return
    refreshMe().catch(() => {})
  }, [isProfile, refreshMe, categoriesProp])

  useEffect(() => {
    if (!flatCatalog.length) return
    if (isProfile) {
      if (previewSku && flatCatalog.some((i) => i.skuId === previewSku)) return
      return
    }
    if (!previewSku || !flatCatalog.some((i) => i.skuId === previewSku)) {
      setPreviewSku(flatCatalog[0]?.skuId ?? null)
    }
  }, [flatCatalog, previewSku, isProfile])

  const itemOwned = useCallback(
    (item: AvatarDecorationCatalogItem) =>
      Boolean(item.owned) || ownedSkus.has(item.skuId),
    [ownedSkus],
  )

  const previewItem = useMemo(() => {
    if (previewSku) return flatCatalog.find((i) => i.skuId === previewSku) ?? null
    if (isProfile && equippedSkuId) {
      return flatCatalog.find((i) => i.skuId === equippedSkuId) ?? null
    }
    return flatCatalog[0] ?? null
  }, [previewSku, equippedSkuId, flatCatalog, isProfile])

  const previewOverlay = useMemo(() => {
    if (previewItem) return previewItem.overlayUrl || previewItem.previewUrl || null
    if (isProfile && !previewSku) return equippedOverlay
    return null
  }, [previewItem, previewSku, equippedOverlay, isProfile])

  const isPreviewEquipped =
    isProfile && equippedSkuId != null && previewItem?.skuId === equippedSkuId && !previewSku
  const isPreviewOwned = previewItem ? itemOwned(previewItem) : false
  const previewFree = (previewItem?.effectivePriceGem ?? 0) <= 0

  const handlePurchase = async (skuId: string) => {
    if (!loggedIn) return
    setBusySku(skuId)
    setError('')
    try {
      const res = await purchaseAvatarDecoration(skuId)
      setGemBalance(res.gemBalance)
      setPreviewSku(skuId)
      await refreshMe()
      dispatchDecorationUpdated()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusySku(null)
    }
  }

  const handleEquip = async (skuId: string | null) => {
    setBusySku(skuId ?? '__none__')
    setError('')
    try {
      const res = await equipAvatarDecoration(skuId)
      setEquippedSkuId(res.equippedDecorationSkuId)
      setEquippedOverlay(res.equippedOverlayUrl)
      setPreviewSku(null)
      await refreshMe()
      dispatchDecorationUpdated()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusySku(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Đang tải trang trí avatar…</p>
  }

  if (!flatCatalog.length) {
    return (
      <Card className={`p-4 border-white/10 ${className}`}>
        <p className="text-sm text-slate-400">
          Chưa có trang trí.{' '}
          {isProfile ? (
            <>
              Xem{' '}
              <Link href="/gem-shop" className="text-cyan-400 hover:underline">
                Cửa hàng Gem
              </Link>{' '}
              hoặc quản trị Kinh tế Gem.
            </>
          ) : (
            'Quản trị có thể thêm tại Kinh tế Gem.'
          )}
        </p>
      </Card>
    )
  }

  const previewHint = previewSku
    ? 'Đang xem trước'
    : isProfile && equippedSkuId
      ? 'Đang đeo'
      : 'Chọn trang trí bên dưới'

  return (
    <div className={`space-y-6 ${className}`}>
      <Card
        className={`p-5 ${isProfile ? 'border-violet-500/20 bg-[#0c0a14]/80' : 'border-violet-500/25 bg-[#0c0a14]'}`}
      >
        {!isProfile ? (
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
            Xem trước trên avatar của bạn
          </p>
        ) : null}
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <AvatarWithDecoration
              avatarUrl={avatarUrl}
              displayName={displayName}
              email={email}
              overlayUrl={previewOverlay}
              size="xl"
              className={isProfile ? '' : 'mx-auto sm:mx-0'}
            />
            <p className="text-[11px] text-slate-500 text-center max-w-[140px]">{previewHint}</p>
          </div>

          <div className="flex-1 w-full min-w-0 text-center sm:text-left space-y-3">
            {previewItem ? (
              <>
                <div>
                  <p className="text-lg font-medium text-white">
                    {previewItem.nameVi || previewItem.skuId}
                  </p>
                  <p className={`text-sm mt-0.5 ${isProfile ? 'text-slate-400' : 'text-cyan-300'}`}>
                    {formatDecorationPrice(previewItem.effectivePriceGem)}
                    {gemBalance !== null ? (
                      <span className={isProfile ? 'text-slate-600' : 'text-slate-500'}>
                        {' '}
                        · Số dư {gemBalance} gem
                      </span>
                    ) : null}
                  </p>
                </div>
                {renderPreviewActions({
                  isProfile,
                  loggedIn,
                  isPreviewOwned,
                  isPreviewEquipped,
                  previewFree,
                  previewItem,
                  equippedSkuId,
                  busySku,
                  onPurchase: handlePurchase,
                  onEquip: handleEquip,
                })}
              </>
            ) : (
              <p className="text-sm text-slate-400">
                {isProfile
                  ? 'Chưa đeo trang trí. Nhấn hoặc rê chuột lên một ô để xem trước trên avatar của bạn.'
                  : 'Chọn một trang trí bên dưới.'}
              </p>
            )}
            {isProfile && equippedSkuId && !previewItem ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-400"
                disabled={busySku !== null}
                onClick={() => void handleEquip(null)}
              >
                Gỡ trang trí
              </Button>
            ) : null}
          </div>
        </div>
        {error ? <p className="text-sm text-red-400 mt-4">{error}</p> : null}
      </Card>

      {sections.map((section) => {
        if (!section.items?.length) return null
        return (
          <section key={section.slug} className="space-y-3">
            {isDecorCategoryBannerSlug(section.slug) ? (
              <DecorationCategoryBanner
                nameVi={section.nameVi}
                subtitleVi={section.subtitleVi}
                bannerUrl={section.bannerUrl}
                variant="lg"
              />
            ) : (
              <h3 className="text-sm font-medium text-slate-300">{section.nameVi}</h3>
            )}

            <div
              className={`grid gap-2.5 ${
                isProfile
                  ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
                  : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5'
              }`}
            >
              {section.items.map((item) => {
                const overlay = item.overlayUrl || item.previewUrl
                if (!overlay) return null
                const owned = itemOwned(item)
                const equipped = equippedSkuId === item.skuId
                const selected = previewSku === item.skuId
                return (
                  <div key={item.skuId} className="flex flex-col gap-1">
                    <DecorationOverlayThumb
                      overlayUrl={overlay}
                      selected={selected || (isProfile && equipped && !previewSku)}
                      equipped={isProfile && equipped}
                      onClick={() => setPreviewSku(item.skuId)}
                      onMouseEnter={() => setPreviewSku(item.skuId)}
                    />
                    <p className="text-[10px] text-slate-400 text-center line-clamp-1 px-0.5">
                      {item.nameVi}
                    </p>
                    {(isProfile || !owned) && (
                      <p className="text-[10px] text-center">
                        {owned ? (
                          <span className="text-emerald-400/90">Đã có</span>
                        ) : (
                          <span className="text-cyan-300/80">
                            {formatDecorationPrice(item.effectivePriceGem)}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function renderPreviewActions({
  isProfile,
  loggedIn,
  isPreviewOwned,
  isPreviewEquipped,
  previewFree,
  previewItem,
  equippedSkuId,
  busySku,
  onPurchase,
  onEquip,
}: {
  isProfile: boolean
  loggedIn: boolean
  isPreviewOwned: boolean
  isPreviewEquipped: boolean
  previewFree: boolean
  previewItem: AvatarDecorationCatalogItem
  equippedSkuId: string | null
  busySku: string | null
  onPurchase: (skuId: string) => void
  onEquip: (skuId: string | null) => void
}) {
  if (!loggedIn) {
    return (
      <p className="text-sm text-slate-400">
        <Link href="/login?redirect=/gem-shop" className="text-cyan-400 hover:underline">
          Đăng nhập
        </Link>{' '}
        để nhận hoặc mua trang trí.
      </p>
    )
  }

  if (isPreviewOwned) {
    if (isProfile) {
      return (
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          {!isPreviewEquipped ? (
            <Button
              type="button"
              size="sm"
              disabled={busySku !== null}
              onClick={() => onEquip(previewItem.skuId)}
            >
              {busySku === previewItem.skuId ? '…' : 'Đeo trang trí này'}
            </Button>
          ) : (
            <span className="text-sm text-emerald-400/90 py-1.5">Đang đeo trên hồ sơ & header</span>
          )}
          {equippedSkuId && !isPreviewEquipped ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-slate-400"
              disabled={busySku !== null}
              onClick={() => onEquip(null)}
            >
              Gỡ trang trí đang đeo
            </Button>
          ) : null}
        </div>
      )
    }
    return (
      <p className="text-sm text-emerald-400/90">
        Đã sở hữu —{' '}
        <Link href="/profile" className="text-cyan-400 hover:underline">
          đeo tại Hồ sơ
        </Link>
      </p>
    )
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={isProfile ? 'secondary' : 'primary'}
      disabled={busySku !== null}
      onClick={() => onPurchase(previewItem.skuId)}
    >
      {busySku === previewItem.skuId ? '…' : previewFree ? 'Nhận miễn phí' : 'Mua bằng Gem'}
    </Button>
  )
}
