'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Store } from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import { GemShopDecorationCatalog } from '@/components/gem-shop/GemShopDecorationCatalog'
import {
  AVATAR_DECORATION_CATEGORY,
  fetchDecorationCatalog,
  fetchGemShopBootstrap,
  fetchGemShopCatalogPublic,
  sectionsFromDecorationResponse,
  type GemShopBootstrapDTO,
  type GemShopCatalogItemDTO,
  type AvatarDecorationCategorySection,
} from '@/features/rewards/public'
import { labelShopCategoryVi } from '@/features/rewards/lib/shopCategoryVi'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { Badge, Button, Card, Tabs, Tab, TabList, TabPanel } from '@/design-system'

function overlayFromShopRow(row: GemShopCatalogItemDTO): string {
  const m = row.metadata || {}
  return String(m.overlayUrl || m.previewUrl || m.assetUrl || '')
}

export default function GemShopPage() {
  const { user } = useAuthStore()
  const [boot, setBoot] = useState<GemShopBootstrapDTO | null>(null)
  const [items, setItems] = useState<GemShopCatalogItemDTO[]>([])
  const [decorationCategories, setDecorationCategories] = useState<AvatarDecorationCategorySection[]>([])
  const [tab, setTab] = useState<'all' | 'decorations' | 'secondary'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Bạn'
  const avatarUrl = user?.avatar ?? null

  const loadAll = () =>
    Promise.all([
      fetchGemShopBootstrap(),
      fetchGemShopCatalogPublic(),
      fetchDecorationCatalog().catch(() => ({ items: [], categories: [] })),
    ])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    loadAll()
      .then(([b, list, deco]) => {
        if (cancelled) return
        setBoot(b)
        setItems(list)
        setDecorationCategories(sectionsFromDecorationResponse(deco.categories, deco.items))
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const nonDecorationItems = useMemo(
    () => items.filter((i) => i.category !== AVATAR_DECORATION_CATEGORY),
    [items],
  )

  const seasonalItems = useMemo(
    () => items.filter((i) => i.category === 'seasonal' || i.metadata?.seasonal === true),
    [items],
  )

  const hasDecorations = decorationCategories.some((c) => (c.items?.length ?? 0) > 0)

  const secondaryLabel = boot?.voucherTabVisible ? 'Khóa học & voucher' : 'Ưu đãi mùa & trang trí'
  const secondaryEmptyCopy = boot?.voucherTabVisible
    ? 'Voucher và gói khóa học sẽ hiển thị khi có mã hàng loại này trong danh mục.'
    : 'Chưa có khóa học trả phí thì dùng khung này cho trang trí và vật phẩm theo mùa.'

  const reload = () => {
    setLoading(true)
    loadAll()
      .then(([b, list, deco]) => {
        setBoot(b)
        setItems(list)
        setDecorationCategories(sectionsFromDecorationResponse(deco.categories, deco.items))
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl border border-violet-500/35 bg-violet-500/20 flex items-center justify-center">
          <Store className="w-5 h-5 text-violet-200" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Cửa hàng Gem</h1>
          <p className="text-sm text-slate-400">
            Trang trí avatar theo nhóm — chọn để xem trước ghép với ảnh đại diện của bạn.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 items-center text-xs text-slate-400">
        {boot && (
          <>
            <Badge>Khóa học trả phí: {boot.paidCoursesCount}</Badge>
            <Badge>Voucher (tab): {boot.voucherTabVisible ? 'hiện' : 'ẩn'}</Badge>
            <Badge>
              Hệ số mùa ×{boot.seasonalMultiplierEffective}
              {boot.seasonalEndsAt ? ` · đến ${new Date(boot.seasonalEndsAt).toLocaleString('vi-VN')}` : ''}
            </Badge>
          </>
        )}
        <Button type="button" variant="ghost" size="sm" className="text-cyan-400" disabled={loading} onClick={reload}>
          Tải lại
        </Button>
      </div>

      {error && (
        <div className="rounded-ds-control border border-red-500/35 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading && !boot ? (
        <p className="text-slate-500 text-sm">Đang tải…</p>
      ) : (
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
        >
          <TabList aria-label="Cửa hàng Gem" className="border-b-white/10">
            <Tab value="all">Tổng quan</Tab>
            {hasDecorations ? <Tab value="decorations">Trang trí avatar</Tab> : null}
            <Tab value="secondary">{secondaryLabel}</Tab>
          </TabList>

          <TabPanel value="all" current={tab} className="mt-6 space-y-8">
            {hasDecorations ? (
              <GemShopDecorationCatalog
                categories={decorationCategories}
                avatarUrl={avatarUrl}
                displayName={displayName}
                email={user?.email}
              />
            ) : null}
            {nonDecorationItems.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-slate-300">Vật phẩm khác</h2>
                {nonDecorationItems.map((row) => (
                  <CatalogRow key={row.skuId} row={row} />
                ))}
              </div>
            ) : !hasDecorations ? (
              <Card className="p-6 border-white/10 bg-[#0c0a12]">
                <p className="text-slate-300 text-sm">
                  Chưa có mã hàng. Quản trị thêm tại /admin/gem-economy.
                </p>
              </Card>
            ) : null}
          </TabPanel>

          {hasDecorations ? (
            <TabPanel value="decorations" current={tab} className="mt-6">
              <GemShopDecorationCatalog
                categories={decorationCategories}
                avatarUrl={avatarUrl}
                displayName={displayName}
                email={user?.email}
              />
            </TabPanel>
          ) : null}

          <TabPanel value="secondary" current={tab} className="mt-6 space-y-3">
            <p className="text-sm text-slate-500">{secondaryEmptyCopy}</p>
            {boot?.voucherTabVisible ? (
              items.filter((i) => i.category === 'voucher').map((row) => <CatalogRow key={row.skuId} row={row} />)
            ) : (
              (seasonalItems.length > 0
                ? seasonalItems
                : items.filter((i) => i.category === 'cosmetic').length > 0
                  ? items.filter((i) => i.category === 'cosmetic')
                  : []
              ).map((row) => <CatalogRow key={row.skuId} row={row} />)
            )}
          </TabPanel>
        </Tabs>
      )}

      <footer className="pt-4 border-t border-white/10 flex flex-wrap gap-4">
        <Link href="/gem" className="text-cyan-400 text-sm hover:underline">
          ← Quay lại ví Gem
        </Link>
        <Link href="/profile" className="text-violet-300 text-sm hover:underline">
          Hồ sơ — đeo trang trí →
        </Link>
      </footer>
    </div>
  )
}

function CatalogRow({ row }: { row: GemShopCatalogItemDTO }) {
  const overlay = overlayFromShopRow(row)
  return (
    <Card className="p-4 border-white/10 bg-[#0c0a12] flex flex-wrap items-start justify-between gap-4">
      <div className="flex gap-4 min-w-0">
        {overlay ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveMediaUrl(overlay)}
            alt=""
            className="w-16 h-16 object-contain shrink-0"
          />
        ) : null}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-white font-medium">{row.nameVi || row.skuId}</p>
            <Badge>{labelShopCategoryVi(row.category)}</Badge>
          </div>
          {row.descriptionVi ? <p className="text-sm text-slate-400 mt-2">{row.descriptionVi}</p> : null}
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-cyan-300">
          {row.effectivePriceGem <= 0 ? 'Miễn phí' : `${row.effectivePriceGem} gem`}
        </p>
        {row.effectivePriceGem !== row.basePriceGem && row.basePriceGem > 0 ? (
          <p className="text-xs text-slate-500 line-through">{row.basePriceGem} gem</p>
        ) : null}
        <Button type="button" size="sm" variant="secondary" className="mt-2 opacity-60 cursor-not-allowed" disabled>
          Sắp mở mua
        </Button>
      </div>
    </Card>
  )
}
