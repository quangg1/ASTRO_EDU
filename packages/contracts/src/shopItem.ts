import { z } from 'zod'

/** Public gem shop catalog row — sync with ShopItem Mongoose schema + shopCatalogService mapper. */
export const GemShopCatalogItemSchema = z.object({
  skuId: z.string().min(1),
  nameVi: z.string(),
  descriptionVi: z.string(),
  category: z.string().min(1),
  basePriceGem: z.number().finite(),
  effectivePriceGem: z.number().finite(),
  metadata: z.record(z.unknown()).optional().default({}),
})

export type GemShopCatalogItem = z.infer<typeof GemShopCatalogItemSchema>

export const GemShopCatalogItemsSchema = z.array(GemShopCatalogItemSchema)

export function parseGemShopCatalogItems(payload: unknown): GemShopCatalogItem[] {
  return GemShopCatalogItemsSchema.parse(payload)
}
