/**
 * Gem Economy admin — `/api/admin/gem-economy/*`.
 * @see docs/plans/gem-rewards-system.md
 */
import { getApiPathBase } from '@/lib/apiConfig'
import { readApiResponseJson } from '@/lib/fetchApiJson'
import { getToken } from '@/features/auth/api/authApi'

const API_BASE = getApiPathBase()

export type GemEarnConstantsResponse = {
  GEM_EARN: Record<string, number>
  bounds: Record<string, unknown>
  note: string
}

export type GemRuntimeConfigDTO = {
  key: string
  seasonalMultiplier: number
  seasonalEndsAt: string | null
  weeklyDeepHistoryCap: number
  itemPriceOverrides: { itemId: string; price: number }[]
  voucherMaxDiscountPct: number
  lastEditedByUserId?: string | null
  updatedAt?: string
}

export type GemEconomySupply = {
  gemBalanceSum: number
  totalGemsEarnedLifetimeSum: number
  userRewardRows: number
}

export type GemEconomyVelocity = {
  range: string
  windowSince: string
  earnTotal: number
  earnPerDayAvg: number
  spendTotal: number
  spendPerDayAvg: number
  earnTxCount: number
  spendTxCount: number
  earnToSpendRatio: number | null
}

export type GemEconomyMetricsDTO = {
  range: string
  supply: GemEconomySupply
  velocity: GemEconomyVelocity
  topReasons: Array<{ _id: { reason: string; sign: string }; total: number; n: number }>
  alerts: Array<{ level: string; code: string; message: string; ratio?: number | null }>
}

export type ShopItemAdminDTO = {
  skuId: string
  nameVi: string
  descriptionVi: string
  category: string
  basePriceGem: number
  visible: boolean
  seasonalStartsAt?: string | null
  seasonalEndsAt?: string | null
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export type GemEconomyAuditDTO = {
  _id: string
  actorUserId: string
  action: string
  targetUserId?: string | null
  delta?: number | null
  balanceAfter?: number | null
  reason: string
  payload?: Record<string, unknown>
  createdAt: string
}

export async function fetchGemEarnConstants(): Promise<GemEarnConstantsResponse> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/admin/gem-economy/earn-constants`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await readApiResponseJson<{ success?: boolean; data?: GemEarnConstantsResponse }>(res)
  if (!res.ok || !json.success || !json.data) throw new Error('Không tải được bảng GEM_EARN.')
  return json.data
}

export async function fetchGemRuntimeConfig(): Promise<GemRuntimeConfigDTO> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/admin/gem-economy/config`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await readApiResponseJson<{ success?: boolean; data?: GemRuntimeConfigDTO }>(res)
  if (!res.ok || !json.success || !json.data) throw new Error('Không tải được cấu hình vận hành Gem.')
  return json.data
}

export async function patchGemRuntimeConfig(
  body: Record<string, unknown>,
): Promise<GemRuntimeConfigDTO> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/admin/gem-economy/config`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await readApiResponseJson<{
    success?: boolean
    data?: GemRuntimeConfigDTO
    error?: string
  }>(res)
  if (!res.ok || !json.success || !json.data) throw new Error(json.error || 'Không lưu được cấu hình.')
  return json.data
}

export async function fetchGemEconomyMetrics(range: '7d' | '30d' = '7d'): Promise<GemEconomyMetricsDTO> {
  const token = getToken()
  const res = await fetch(
    `${API_BASE}/admin/gem-economy/metrics?range=${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const json = await readApiResponseJson<{
    success?: boolean
    range?: string
    supply?: GemEconomySupply
    velocity?: GemEconomyVelocity
    topReasons?: GemEconomyMetricsDTO['topReasons']
    alerts?: GemEconomyMetricsDTO['alerts']
    error?: string
  }>(res)
  if (!res.ok || !json.success || !json.supply || !json.velocity) {
    throw new Error(json.error || 'Không tải được chỉ số kinh tế Gem.')
  }
  return {
    range: json.range || range,
    supply: json.supply,
    velocity: json.velocity,
    topReasons: json.topReasons || [],
    alerts: json.alerts || [],
  }
}

export async function fetchAdminShopItems(): Promise<ShopItemAdminDTO[]> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/admin/gem-economy/shop-items`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await readApiResponseJson<{ success?: boolean; data?: { items?: ShopItemAdminDTO[] } }>(res)
  if (!res.ok || !json.success || !json.data?.items) throw new Error('Không tải được danh mục cửa hàng (admin).')
  return json.data.items
}

export async function createAdminShopItem(body: Record<string, unknown>): Promise<ShopItemAdminDTO> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/admin/gem-economy/shop-items`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await readApiResponseJson<{
    success?: boolean
    data?: ShopItemAdminDTO
    error?: string
  }>(res)
  if (!res.ok || !json.success || !json.data) throw new Error(json.error || 'Không tạo được mã hàng.')
  return json.data
}

export async function patchAdminShopItem(skuId: string, body: Record<string, unknown>): Promise<ShopItemAdminDTO> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/admin/gem-economy/shop-items/${encodeURIComponent(skuId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await readApiResponseJson<{
    success?: boolean
    data?: ShopItemAdminDTO
    error?: string
  }>(res)
  if (!res.ok || !json.success || !json.data) throw new Error(json.error || 'Không cập nhật được mã hàng.')
  return json.data
}

export async function postManualGemAdjust(payload: {
  targetUserId: string
  delta: number
  reason: string
}): Promise<{ gemBalance: number; totalGemsEarned: number }> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/admin/gem-economy/manual-adjust`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await readApiResponseJson<{
    success?: boolean
    data?: { gemBalance: number; totalGemsEarned: number }
    error?: string
    code?: string
  }>(res)
  if (!res.ok || !json.success || !json.data) throw new Error(json.error || 'Không điều chỉnh được số gem.')
  return json.data
}

export type DecorationCategoryAdminDTO = {
  slug: string
  nameVi: string
  subtitleVi: string
  bannerUrl: string
  sortOrder: number
  visible: boolean
  createdAt?: string
  updatedAt?: string
}

export type { DecorationBulkImportResult } from '@/features/rewards/api/avatarDecorationApi'

export async function fetchDecorationCategoriesAdmin(): Promise<DecorationCategoryAdminDTO[]> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/admin/gem-economy/decoration-categories`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await readApiResponseJson<{
    success?: boolean
    data?: { categories?: DecorationCategoryAdminDTO[] }
    error?: string
  }>(res)
  if (!res.ok || !json.success || !json.data?.categories) {
    throw new Error(json.error || 'Không tải được nhóm trang trí.')
  }
  return json.data.categories
}

export async function createDecorationCategoryAdmin(body: {
  nameVi: string
  subtitleVi?: string
  slug?: string
  bannerUrl?: string
  sortOrder?: number
  visible?: boolean
}): Promise<DecorationCategoryAdminDTO> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/admin/gem-economy/decoration-categories`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await readApiResponseJson<{
    success?: boolean
    data?: DecorationCategoryAdminDTO
    error?: string
  }>(res)
  if (!res.ok || !json.success || !json.data) throw new Error(json.error || 'Không tạo được nhóm.')
  return json.data
}

export async function patchDecorationCategoryAdmin(
  slug: string,
  body: Record<string, unknown>,
): Promise<DecorationCategoryAdminDTO> {
  const token = getToken()
  const res = await fetch(
    `${API_BASE}/admin/gem-economy/decoration-categories/${encodeURIComponent(slug)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  const json = await readApiResponseJson<{
    success?: boolean
    data?: DecorationCategoryAdminDTO
    error?: string
  }>(res)
  if (!res.ok || !json.success || !json.data) throw new Error(json.error || 'Không cập nhật được nhóm.')
  return json.data
}

export async function fetchGemEconomyAuditLog(limit = 50): Promise<GemEconomyAuditDTO[]> {
  const token = getToken()
  const res = await fetch(
    `${API_BASE}/admin/gem-economy/audit-log?limit=${encodeURIComponent(String(limit))}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const json = await readApiResponseJson<{ success?: boolean; data?: { items?: GemEconomyAuditDTO[] } }>(res)
  if (!res.ok || !json.success || !json.data?.items) throw new Error('Không tải được nhật ký kiểm tra.')
  return json.data.items
}
