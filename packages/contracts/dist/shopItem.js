"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GemShopCatalogItemsSchema = exports.GemShopCatalogItemSchema = void 0;
exports.parseGemShopCatalogItems = parseGemShopCatalogItems;
const zod_1 = require("zod");
/** Public gem shop catalog row — sync with ShopItem Mongoose schema + shopCatalogService mapper. */
exports.GemShopCatalogItemSchema = zod_1.z.object({
    skuId: zod_1.z.string().min(1),
    nameVi: zod_1.z.string(),
    descriptionVi: zod_1.z.string(),
    category: zod_1.z.string().min(1),
    basePriceGem: zod_1.z.number().finite(),
    effectivePriceGem: zod_1.z.number().finite(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional().default({}),
});
exports.GemShopCatalogItemsSchema = zod_1.z.array(exports.GemShopCatalogItemSchema);
function parseGemShopCatalogItems(payload) {
    return exports.GemShopCatalogItemsSchema.parse(payload);
}
