'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createDecorationCategoryAdmin,
  fetchAdminShopItems,
  fetchDecorationCategoriesAdmin,
  patchAdminShopItem,
  patchDecorationCategoryAdmin,
  type DecorationCategoryAdminDTO,
  type ShopItemAdminDTO,
} from '@/features/admin/public'
import {
  AVATAR_DECORATION_CATEGORY,
  DECORATION_ADMIN_UNASSIGNED,
} from '@/features/rewards/constants/avatarDecoration'
import {
  bulkUploadDecorationOverlaysAdmin,
  uploadDecorationCategoryBannerAdmin,
} from '@/features/rewards/public'
import { DecorationCategoryBanner } from '@/components/profile/DecorationCategoryBanner'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { Button, Card, Input, Textarea } from '@/design-system'

const CATEGORY = 'avatar_decoration'

function categorySlugFromItem(row: ShopItemAdminDTO): string {
  const m = row.metadata || {}
  return String(m.decorationCategorySlug || m.categorySlug || '').trim()
}

function overlayFromMeta(row: ShopItemAdminDTO): string {
  const m = row.metadata || {}
  return String(m.overlayUrl || m.previewUrl || m.assetUrl || '')
}

export function AdminAvatarDecorationsPanel() {
  const [categories, setCategories] = useState<DecorationCategoryAdminDTO[]>([])
  const [items, setItems] = useState<ShopItemAdminDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [bulkResult, setBulkResult] = useState<string>('')

  const [catForm, setCatForm] = useState({
    nameVi: '',
    subtitleVi: '',
  })
  const [createBannerFile, setCreateBannerFile] = useState<File | null>(null)
  const [createBannerPreview, setCreateBannerPreview] = useState<string | null>(null)
  const createBannerPreviewRef = useRef<string | null>(null)

  const decorationItems = useMemo(
    () => items.filter((r) => r.category === AVATAR_DECORATION_CATEGORY),
    [items],
  )

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, ShopItemAdminDTO[]>()
    for (const row of decorationItems) {
      const slug = categorySlugFromItem(row) || DECORATION_ADMIN_UNASSIGNED
      if (!map.has(slug)) map.set(slug, [])
      map.get(slug)!.push(row)
    }
    return map
  }, [decorationItems])

  const refresh = useCallback(async () => {
    const [cats, all] = await Promise.all([fetchDecorationCategoriesAdmin(), fetchAdminShopItems()])
    setCategories(cats)
    setItems(all.filter((r) => r.category === AVATAR_DECORATION_CATEGORY))
    setSelectedCategory((prev) => prev || cats[0]?.slug || '')
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [refresh])

  const handleCreateCategory = async () => {
    if (!catForm.nameVi.trim()) {
      setError('Nhập tên nhóm (vd. Lunar New Year).')
      return
    }
    setBusy(true)
    setError('')
    try {
      const row = await createDecorationCategoryAdmin({
        nameVi: catForm.nameVi.trim(),
        subtitleVi: catForm.subtitleVi.trim(),
        visible: true,
      })
      if (createBannerFile) {
        const { bannerUrl } = await uploadDecorationCategoryBannerAdmin(row.slug, createBannerFile)
        await patchDecorationCategoryAdmin(row.slug, { bannerUrl, editNote: 'Banner khi tạo nhóm' })
      }
      if (createBannerPreviewRef.current) {
        URL.revokeObjectURL(createBannerPreviewRef.current)
        createBannerPreviewRef.current = null
      }
      setCreateBannerFile(null)
      setCreateBannerPreview(null)
      setCatForm({ nameVi: '', subtitleVi: '' })
      setSelectedCategory(row.slug)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const handleBannerUpload = async (slug: string, file: File | null) => {
    if (!file || !slug) return
    setBusy(true)
    setError('')
    try {
      const { bannerUrl } = await uploadDecorationCategoryBannerAdmin(slug, file)
      await patchDecorationCategoryAdmin(slug, { bannerUrl, editNote: 'Upload banner nhóm' })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const handleBulkUpload = async (files: FileList | null) => {
    if (!files?.length || !selectedCategory) {
      setError('Chọn nhóm và ít nhất một file overlay.')
      return
    }
    setBusy(true)
    setError('')
    setBulkResult('')
    try {
      const list = Array.from(files)
      const res = await bulkUploadDecorationOverlaysAdmin(selectedCategory, list)
      setBulkResult(`Đã thêm ${res.created}/${list.length} trang trí (0 gem). Thất bại: ${res.failed}.`)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const saveGemPrice = async (row: ShopItemAdminDTO, basePriceGem: number) => {
    setBusy(true)
    setError('')
    try {
      await patchAdminShopItem(row.skuId, {
        basePriceGem,
        editNote: 'Chỉnh giá gem trang trí',
      })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const toggleVisible = async (row: ShopItemAdminDTO) => {
    setBusy(true)
    try {
      await patchAdminShopItem(row.skuId, {
        visible: !row.visible,
        editNote: 'Bật/tắt trang trí',
      })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-ds-muted max-w-3xl">
        <strong className="text-slate-300">Nhóm</strong> có <strong className="text-slate-300">ảnh banner ngang</strong> (như Discord Shop) + phụ đề —{' '}
        <strong className="text-slate-300">không có giá gem</strong>. Gem gắn từng trang trí: import hàng loạt mặc định{' '}
        <strong className="text-slate-300">0 gem</strong>, chỉnh từng ô trong lưới bên dưới.
      </p>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {bulkResult ? <p className="text-sm text-emerald-400">{bulkResult}</p> : null}

      <Card className="p-4 space-y-3 max-w-xl">
        <h3 className="text-sm font-medium text-white">Tạo nhóm mới</h3>
        <Input
          value={catForm.nameVi}
          onChange={(e) => setCatForm((f) => ({ ...f, nameVi: e.target.value }))}
          placeholder="Tên nhóm (vd. Lunar New Year)"
        />
        <Textarea
          value={catForm.subtitleVi}
          onChange={(e) => setCatForm((f) => ({ ...f, subtitleVi: e.target.value }))}
          placeholder="Phụ đề banner (vd. Chúc mừng năm Rắn!)"
          rows={2}
        />
        <div>
          <label className="text-xs text-ds-muted block mb-1">
            Ảnh banner nhóm (JPG/PNG ngang, khuyến nghị ~1200×320) → CDN
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            className="text-sm text-slate-400 block w-full"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null
              if (createBannerPreviewRef.current) {
                URL.revokeObjectURL(createBannerPreviewRef.current)
                createBannerPreviewRef.current = null
              }
              setCreateBannerFile(f)
              if (f) {
                const url = URL.createObjectURL(f)
                createBannerPreviewRef.current = url
                setCreateBannerPreview(url)
              } else {
                setCreateBannerPreview(null)
              }
              e.target.value = ''
            }}
          />
          {(createBannerPreview || catForm.nameVi.trim()) && (
            <div className="mt-3">
              <DecorationCategoryBanner
                nameVi={catForm.nameVi.trim() || 'Tên nhóm'}
                subtitleVi={catForm.subtitleVi.trim()}
                bannerUrl={createBannerPreview}
                variant="lg"
              />
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-500">
          Sau khi tạo nhóm, import nhiều overlay — mỗi file một trang trí (0 gem). Có thể đổi banner sau trong từng nhóm.
        </p>
        <Button type="button" disabled={busy} onClick={() => void handleCreateCategory()}>
          Tạo nhóm
        </Button>
      </Card>

      {loading ? (
        <p className="text-sm text-ds-muted">Đang tải…</p>
      ) : categories.length === 0 ? (
        <Card className="p-4">
          <p className="text-sm text-ds-muted">Chưa có nhóm — tạo nhóm trước khi import overlay hàng loạt.</p>
        </Card>
      ) : (
        <>
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-medium text-white">Import hàng loạt vào nhóm</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  disabled={busy}
                  onClick={() => setSelectedCategory(c.slug)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                    selectedCategory === c.slug
                      ? 'border-violet-500/60 bg-violet-500/15 text-white'
                      : 'border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {c.nameVi || c.slug}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-ds-muted block mb-1">
                Chọn nhiều overlay (PNG/WebP/GIF trong suốt) → CDN + cửa hàng (0 gem)
              </label>
              <input
                type="file"
                multiple
                accept="image/png,image/webp,image/gif"
                disabled={busy || !selectedCategory}
                onChange={(e) => {
                  void handleBulkUpload(e.target.files)
                  e.target.value = ''
                }}
                className="text-sm text-slate-400 block w-full"
              />
            </div>
          </Card>

          {categories.map((cat) => {
            const catItems = itemsByCategory.get(cat.slug) || []
            return (
              <section key={cat.slug} className="space-y-3">
                <DecorationCategoryBanner
                  nameVi={cat.nameVi || cat.slug}
                  subtitleVi={cat.subtitleVi}
                  bannerUrl={cat.bannerUrl}
                  variant="lg"
                />
                <div className="flex flex-wrap items-center gap-3 px-1">
                  <label className="text-xs text-cyan-300 cursor-pointer hover:underline">
                    {busy ? '…' : cat.bannerUrl ? 'Đổi ảnh banner' : 'Tải ảnh banner nhóm'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        void handleBannerUpload(cat.slug, e.target.files?.[0] ?? null)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">{cat.slug}</span>
                  <span className="text-[11px] text-slate-500">{catItems.length} trang trí</span>
                </div>

                {catItems.length === 0 ? (
                  <p className="text-xs text-slate-500 px-1">Chưa có overlay trong nhóm này.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {catItems.map((row) => {
                      const overlay = overlayFromMeta(row)
                      return (
                        <Card key={row.skuId} className="p-2 border-white/10 flex flex-col gap-2">
                          {overlay ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={resolveMediaUrl(overlay)}
                              alt=""
                              className="w-full aspect-square object-contain"
                            />
                          ) : (
                            <div className="aspect-square bg-white/5 rounded" />
                          )}
                          <p className="text-[10px] text-white line-clamp-2 text-center">
                            {row.nameVi || row.skuId}
                          </p>
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Giá gem</label>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                className="h-7 text-xs px-1"
                                defaultValue={row.basePriceGem}
                                key={`${row.skuId}-${row.basePriceGem}`}
                                onBlur={(e) => {
                                  const n = Number(e.target.value)
                                  if (!Number.isFinite(n) || n < 0 || n === row.basePriceGem) return
                                  void saveGemPrice(row, n)
                                }}
                              />
                              <span className="text-[10px] text-slate-500">gem</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-[10px] text-cyan-400 hover:underline disabled:opacity-50"
                            disabled={busy}
                            onClick={() => void toggleVisible(row)}
                          >
                            {row.visible ? 'Ẩn' : 'Hiện'}
                          </button>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}

          {(itemsByCategory.get(DECORATION_ADMIN_UNASSIGNED) || []).length > 0 ? (
            <Card className="p-4">
              <h3 className="text-sm text-amber-200/90 mb-2">
                Chưa gán nhóm ({itemsByCategory.get(DECORATION_ADMIN_UNASSIGNED)!.length})
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Item cũ import trước khi có category — import lại qua nhóm hoặc chỉnh metadata thủ công.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {itemsByCategory.get(DECORATION_ADMIN_UNASSIGNED)!.map((row) => (
                  <div key={row.skuId} className="text-[10px] font-mono text-slate-400">
                    {row.skuId}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </>
      )}
    </div>
  )
}
