import { parseGemShopCatalogItems, type GemShopCatalogItem } from '@galaxies/contracts'
import { getApiPathBase } from '@/lib/apiConfig'
import { readApiResponseJson } from '@/lib/fetchApiJson'

const API_BASE = getApiPathBase()

export type GemShopBootstrapDTO = {
  paidCoursesCount: number
  voucherTabVisible: boolean
  seasonalMultiplierConfigured: number
  seasonalMultiplierEffective: number
  seasonalEndsAt: string | null
  weeklyDeepHistoryCap: number
  voucherMaxDiscountPct: number
}

export async function fetchGemShopBootstrap(): Promise<GemShopBootstrapDTO> {
  const res = await fetch(`${API_BASE}/gems/shop/bootstrap`)
  const json = await readApiResponseJson<{
    success?: boolean
    data?: GemShopBootstrapDTO
    error?: string
  }>(res)
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || 'Không tải được thông tin cửa hàng Gem.')
  }
  return json.data
}

/** @deprecated Use `GemShopCatalogItem` from `@galaxies/contracts` */
export type GemShopCatalogItemDTO = GemShopCatalogItem

export async function fetchGemShopCatalogPublic(): Promise<GemShopCatalogItem[]> {
  const res = await fetch(`${API_BASE}/gems/shop/catalog`)
  const json = await readApiResponseJson<{
    success?: boolean
    data?: { items?: unknown[] }
    error?: string
  }>(res)
  if (!res.ok || !json.success || !json.data?.items) {
    throw new Error(json.error || 'Không tải được danh mục vật phẩm.')
  }
  return parseGemShopCatalogItems(json.data.items)
}
