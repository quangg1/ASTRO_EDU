import { getApiPathBase, getMediaBase } from '@/lib/apiConfig'
import { readApiResponseJson } from '@/lib/fetchApiJson'
import { getToken } from '@/features/auth/api/authApi'

const API = `${getApiPathBase()}/gems`

export type AvatarDecorationCatalogItem = {
  skuId: string
  nameVi: string
  descriptionVi: string
  category: string
  basePriceGem: number
  effectivePriceGem: number
  overlayUrl: string
  previewUrl: string
  sortOrder: number
  decorationCategorySlug?: string | null
  owned?: boolean
}

export type AvatarDecorationCategorySection = {
  slug: string
  nameVi: string
  subtitleVi: string
  bannerUrl: string
  sortOrder: number
  items: AvatarDecorationCatalogItem[]
}

export type AvatarDecorationState = {
  gemBalance: number
  ownedDecorationSkus: string[]
  equippedDecorationSkuId: string | null
  equippedOverlayUrl: string | null
  catalog: AvatarDecorationCatalogItem[]
  categories?: AvatarDecorationCategorySection[]
}

export async function fetchDecorationCatalog(): Promise<{
  items: AvatarDecorationCatalogItem[]
  categories: AvatarDecorationCategorySection[]
}> {
  const res = await fetch(`${API}/decorations/catalog`)
  const json = await readApiResponseJson<{
    success?: boolean
    data?: { items?: AvatarDecorationCatalogItem[]; categories?: AvatarDecorationCategorySection[] }
  }>(res)
  if (!res.ok || !json.success || !json.data?.items) {
    throw new Error('Không tải được danh mục trang trí avatar.')
  }
  return {
    items: json.data.items,
    categories: json.data.categories || [],
  }
}

export async function fetchMyDecorationState(): Promise<AvatarDecorationState> {
  const token = getToken()
  const res = await fetch(`${API}/decorations/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const json = await readApiResponseJson<{ success?: boolean; data?: AvatarDecorationState }>(res)
  if (!res.ok || !json.success || !json.data) {
    throw new Error('Không tải được trang trí của bạn.')
  }
  return json.data
}

export async function purchaseAvatarDecoration(skuId: string): Promise<{
  gemBalance: number
  skuId: string
  alreadyOwned?: boolean
  cost?: number
}> {
  const token = getToken()
  const res = await fetch(`${API}/decorations/purchase`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ skuId }),
  })
  const json = await readApiResponseJson<{
    success?: boolean
    data?: { gemBalance: number; skuId: string; alreadyOwned?: boolean; cost?: number }
    error?: string
    code?: string
  }>(res)
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || 'Không mua được trang trí.')
  }
  return json.data
}

export async function equipAvatarDecoration(skuId: string | null): Promise<{
  equippedDecorationSkuId: string | null
  equippedOverlayUrl: string | null
}> {
  const token = getToken()
  const res = await fetch(`${API}/decorations/equip`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ skuId }),
  })
  const json = await readApiResponseJson<{
    success?: boolean
    data?: { equippedDecorationSkuId: string | null; equippedOverlayUrl: string | null }
    error?: string
  }>(res)
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || 'Không đổi trang trí được.')
  }
  return json.data
}

export type DecorationBulkImportResult = {
  categorySlug: string
  created: number
  failed: number
  items: Array<
    | { ok: true; skuId: string; nameVi: string; overlayUrl: string; storageKey: string }
    | { ok: false; file?: string; error: string }
  >
}

/** Admin — upload nhiều overlay vào một nhóm; mặc định 0 gem, CDN theo folder category. */
export async function bulkUploadDecorationOverlaysAdmin(
  categorySlug: string,
  files: File[],
): Promise<DecorationBulkImportResult> {
  const token = getToken()
  const form = new FormData()
  form.append('categorySlug', categorySlug)
  for (const f of files) form.append('files', f)
  const res = await fetch(`${getMediaBase()}/upload/decoration-bulk`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const json = await readApiResponseJson<{
    success?: boolean
    data?: DecorationBulkImportResult
    error?: string
  }>(res)
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || 'Import hàng loạt thất bại.')
  }
  return json.data
}

/** Admin — banner ngang cho nhóm (ảnh JPG/PNG). */
export async function uploadDecorationCategoryBannerAdmin(
  categorySlug: string,
  file: File,
): Promise<{ bannerUrl: string }> {
  const token = getToken()
  const form = new FormData()
  form.append('categorySlug', categorySlug)
  form.append('file', file)
  const res = await fetch(`${getMediaBase()}/upload/decoration-category-banner`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const json = await readApiResponseJson<{
    success?: boolean
    bannerUrl?: string
    url?: string
    error?: string
  }>(res)
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Tải banner thất bại.')
  }
  const bannerUrl = json.bannerUrl || json.url || ''
  return { bannerUrl }
}
