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

export type GemShopCatalogItemDTO = {
  skuId: string
  nameVi: string
  descriptionVi: string
  category: string
  basePriceGem: number
  effectivePriceGem: number
  metadata: Record<string, unknown>
}

export async function fetchGemShopCatalogPublic(): Promise<GemShopCatalogItemDTO[]> {
  const res = await fetch(`${API_BASE}/gems/shop/catalog`)
  const json = await readApiResponseJson<{
    success?: boolean
    data?: { items?: GemShopCatalogItemDTO[] }
    error?: string
  }>(res)
  if (!res.ok || !json.success || !json.data?.items) {
    throw new Error(json.error || 'Không tải được danh mục vật phẩm.')
  }
  return json.data.items
}
