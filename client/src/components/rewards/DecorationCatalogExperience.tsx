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
} from '@/features/rewards/lib/decorationCatalog'
import { Button, Card } from '@/design-system'
import { useT } from '@/i18n/public'

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

function renderDecorationThumbs({
  items,
  isProfile,
  equippedSkuId,
  previewSku,
  setPreviewSku,
  itemOwned,
  t,
}: {
  items: AvatarDecorationCatalogItem[]
  isProfile: boolean
  equippedSkuId: string | null
  previewSku: string | null
  setPreviewSku: (sku: string) => void
  itemOwned?: (item: AvatarDecorationCatalogItem) => boolean
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  return items.map((item) => {
    const overlay = item.overlayUrl || item.previewUrl
    if (!overlay) return null
    const owned = itemOwned ? itemOwned(item) : true
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
        <p className="text-[10px] text-ds-muted text-center line-clamp-1 px-0.5">
          {item.nameVi}
        </p>
        {!isProfile && !owned ? (
          <p className="text-[10px] text-center text-ds-accent/80">
            {formatDecorationPrice(item.effectivePriceGem)}
          </p>
        ) : (
          <p className="text-[10px] text-center text-emerald-400/90">{t('decorations.owned')}</p>
        )}
      </div>
    )
  })
}

export function DecorationCatalogExperience({
  mode,
  avatarUrl,
  displayName,
  email,
  categories: categoriesProp,
  fallbackSectionTitle,
  className = '',
}: Props) {
  const { t } = useT()
  const sectionTitle = fallbackSectionTitle ?? t('decorations.fallbackTitle')
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
      const ownedIds = new Set(data.ownedDecorationSkus)
      const ownedCatalog = data.catalog.filter((item) => ownedIds.has(item.skuId))
      setSections(
        ownedCatalog.length
          ? [
              {
                slug: '_owned',
                nameVi: t('decorations.yourCollection'),
                subtitleVi: '',
                bannerUrl: '',
                sortOrder: 0,
                items: ownedCatalog,
              },
            ]
          : [],
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
  }, [isProfile, categoriesProp, sectionTitle, t])

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

  const ownedItems = useMemo(
    () => flatCatalog.filter((item) => itemOwned(item)),
    [flatCatalog, itemOwned],
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
      const data = await fetchMyDecorationState()
      applyMeState(data)
      if (!data.equippedDecorationSkuId) {
        try {
          const equipRes = await equipAvatarDecoration(skuId)
          setEquippedSkuId(equipRes.equippedDecorationSkuId)
          setEquippedOverlay(equipRes.equippedOverlayUrl)
          setPreviewSku(null)
        } catch {
          /* user can equip manually from profile */
        }
      }
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
    return <p className="text-sm text-ds-subtle">{t('decorations.loading')}</p>
  }

  if (isProfile && ownedItems.length === 0) {
    return (
      <Card className={`p-4 border-ds-border ${className}`}>
        <p className="text-sm text-ds-muted">
          {t('decorations.emptyOwned')}{' '}
          <Link href="/gem-shop" className="text-cyan-400 hover:underline">
            {t('decorations.buyAtShop')}
          </Link>
          .
        </p>
      </Card>
    )
  }

  if (!isProfile && !flatCatalog.length) {
    return (
      <Card className={`p-4 border-ds-border ${className}`}>
        <p className="text-sm text-ds-muted">{t('decorations.emptyShop')}</p>
      </Card>
    )
  }

  const previewHint = previewSku
    ? t('decorations.previewActive')
    : isProfile && equippedSkuId
      ? t('decorations.previewEquipped')
      : t('decorations.previewSelect')

  return (
    <div className={`space-y-6 ${className}`}>
      <Card
        className={`p-5 ${isProfile ? 'border-violet-500/20 bg-ds-elevated/80' : 'border-violet-500/25 bg-ds-elevated'}`}
      >
        {!isProfile ? (
          <p className="text-xs text-ds-subtle uppercase tracking-wide mb-3">
            {t('decorations.previewShopAvatar')}
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
            <p className="text-[11px] text-ds-subtle text-center max-w-[140px]">{previewHint}</p>
          </div>

          <div className="flex-1 w-full min-w-0 text-center sm:text-left space-y-3">
            {previewItem ? (
              <>
                <div>
                  <p className="text-lg font-medium text-white">
                    {previewItem.nameVi || previewItem.skuId}
                  </p>
                  <p className={`text-sm mt-0.5 ${isProfile ? 'text-ds-muted' : 'text-ds-accent'}`}>
                    {isProfile || isPreviewOwned
                      ? t('decorations.ownedLabel')
                      : formatDecorationPrice(previewItem.effectivePriceGem)}
                    {!isProfile && gemBalance !== null ? (
                      <span className="text-ds-subtle">
                        {' '}
                        · {t('decorations.balanceGems', { gems: gemBalance })}
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
                  t,
                })}
              </>
            ) : (
              <p className="text-sm text-ds-muted">
                {isProfile ? t('decorations.selectOwnedHint') : t('decorations.selectShopHint')}
              </p>
            )}
            {isProfile && equippedSkuId && !previewItem ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-ds-muted"
                disabled={busySku !== null}
                onClick={() => void handleEquip(null)}
              >
                {t('decorations.unequip')}
              </Button>
            ) : null}
          </div>
        </div>
        {error ? <p className="text-sm text-red-400 mt-4">{error}</p> : null}
      </Card>

      {sections.map((section) => {
        if (!section.items?.length) return null
        if (isProfile && section.slug === '_owned') {
          return (
            <section key={section.slug} className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-white">{section.nameVi}</h3>
                <p className="text-xs text-ds-muted mt-0.5">
                  {t('decorations.ownedSectionHint', { count: section.items.length })}
                </p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
                {renderDecorationThumbs({
                  items: section.items,
                  isProfile: true,
                  equippedSkuId,
                  previewSku,
                  setPreviewSku,
                  t,
                })}
              </div>
            </section>
          )
        }
        if (isProfile) return null
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
              <h3 className="text-sm font-medium text-ds-muted">{section.nameVi}</h3>
            )}

            <div className="grid gap-2.5 grid-cols-3 sm:grid-cols-4 md:grid-cols-5">
              {renderDecorationThumbs({
                items: section.items,
                isProfile: false,
                equippedSkuId,
                previewSku,
                setPreviewSku,
                itemOwned,
                t,
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
  t,
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
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  if (!loggedIn) {
    return (
      <p className="text-sm text-ds-muted">
        <Link href="/login?redirect=/gem-shop" className="text-cyan-400 hover:underline">
          {t('decorations.signIn')}
        </Link>{' '}
        {t('decorations.signInToBuy')}
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
              {busySku === previewItem.skuId ? '…' : t('decorations.equipThis')}
            </Button>
          ) : (
            <span className="text-sm text-emerald-400/90 py-1.5">{t('decorations.equippedOnProfile')}</span>
          )}
          {equippedSkuId && !isPreviewEquipped ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-ds-muted"
              disabled={busySku !== null}
              onClick={() => onEquip(null)}
            >
              {t('decorations.unequipCurrent')}
            </Button>
          ) : null}
        </div>
      )
    }
    return (
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        {!isPreviewEquipped ? (
          <Button
            type="button"
            size="sm"
            disabled={busySku !== null}
            onClick={() => onEquip(previewItem.skuId)}
          >
            {busySku === previewItem.skuId ? '…' : t('decorations.equipNow')}
          </Button>
        ) : (
          <span className="text-sm text-emerald-400/90 py-1.5">{t('decorations.equippedOnProfile')}</span>
        )}
        {equippedSkuId && !isPreviewEquipped ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-ds-muted"
            disabled={busySku !== null}
            onClick={() => onEquip(null)}
          >
            {t('decorations.unequipCurrent')}
          </Button>
        ) : null}
        {!isProfile ? (
          <Link href="/profile" className="text-xs text-cyan-400 hover:underline self-center">
            {t('decorations.manageAtProfile')}
          </Link>
        ) : null}
      </div>
    )
  }

  return (
    <p className="text-sm text-ds-muted">
      {isProfile ? (
        <>
          {t('decorations.notInCollection')}{' '}
          <Link href="/gem-shop" className="text-cyan-400 hover:underline">
            {t('decorations.buyAtShop')}
          </Link>
          .
        </>
      ) : null}
      {!isProfile ? (
        <Button
          type="button"
          size="sm"
          variant="primary"
          disabled={busySku !== null}
          onClick={() => onPurchase(previewItem.skuId)}
        >
          {busySku === previewItem.skuId
            ? '…'
            : previewFree
              ? t('decorations.claimFree')
              : t('decorations.buyWithGem')}
        </Button>
      ) : null}
    </p>
  )
}
