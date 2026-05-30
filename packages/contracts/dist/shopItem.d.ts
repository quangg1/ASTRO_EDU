import { z } from 'zod';
/** Public gem shop catalog row — sync with ShopItem Mongoose schema + shopCatalogService mapper. */
export declare const GemShopCatalogItemSchema: z.ZodObject<{
    skuId: z.ZodString;
    nameVi: z.ZodString;
    descriptionVi: z.ZodString;
    category: z.ZodString;
    basePriceGem: z.ZodNumber;
    effectivePriceGem: z.ZodNumber;
    metadata: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    skuId: string;
    nameVi: string;
    descriptionVi: string;
    category: string;
    basePriceGem: number;
    effectivePriceGem: number;
    metadata: Record<string, unknown>;
}, {
    skuId: string;
    nameVi: string;
    descriptionVi: string;
    category: string;
    basePriceGem: number;
    effectivePriceGem: number;
    metadata?: Record<string, unknown> | undefined;
}>;
export type GemShopCatalogItem = z.infer<typeof GemShopCatalogItemSchema>;
export declare const GemShopCatalogItemsSchema: z.ZodArray<z.ZodObject<{
    skuId: z.ZodString;
    nameVi: z.ZodString;
    descriptionVi: z.ZodString;
    category: z.ZodString;
    basePriceGem: z.ZodNumber;
    effectivePriceGem: z.ZodNumber;
    metadata: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    skuId: string;
    nameVi: string;
    descriptionVi: string;
    category: string;
    basePriceGem: number;
    effectivePriceGem: number;
    metadata: Record<string, unknown>;
}, {
    skuId: string;
    nameVi: string;
    descriptionVi: string;
    category: string;
    basePriceGem: number;
    effectivePriceGem: number;
    metadata?: Record<string, unknown> | undefined;
}>, "many">;
export declare function parseGemShopCatalogItems(payload: unknown): GemShopCatalogItem[];
//# sourceMappingURL=shopItem.d.ts.map