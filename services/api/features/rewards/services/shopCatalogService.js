const { AppError } = require('../../../shared/errors');
const GemEconomyAuditLog = require('../models/GemEconomyAuditLog');
const { shopItemRepository } = require('../repositories/shopItemRepository');
const { effectiveGemPrice, getOrCreateConfigDoc } = require('./gemRuntimeConfigService');

function visibleBySeason(doc, now = new Date()) {
  const t = now.getTime();
  const start = doc.seasonalStartsAt ? new Date(doc.seasonalStartsAt).getTime() : null;
  const end = doc.seasonalEndsAt ? new Date(doc.seasonalEndsAt).getTime() : null;
  if (start && !Number.isNaN(start) && t < start) return false;
  if (end && !Number.isNaN(end) && t > end) return false;
  return true;
}

async function listVisiblePublic(extraFilter = {}) {
  const cfg = await getOrCreateConfigDoc();
  const items = await shopItemRepository.listVisible(extraFilter);
  const now = new Date();
  return items.filter((doc) => visibleBySeason(doc, now)).map((doc) => ({
    skuId: doc.skuId,
    nameVi: doc.nameVi,
    descriptionVi: doc.descriptionVi,
    category: doc.category,
    basePriceGem: doc.basePriceGem,
    effectivePriceGem: effectiveGemPrice(doc.basePriceGem, doc.skuId, cfg.itemPriceOverrides),
    metadata: doc.metadata || {},
  }));
}

/** Shop items trong khoảng giá vừa ngoài số dư (agent nearby unlocks). */
async function listNearbyShopItems({ balance, maxGap = 80, limit = 3 } = {}) {
  const bal = Math.max(0, Number(balance) || 0);
  const gap = Math.max(0, Number(maxGap) || 80);
  const cap = Math.min(5, Math.max(1, Number(limit) || 3));
  return shopItemRepository.findMany(
    {
      visible: true,
      basePriceGem: { $gt: bal, $lte: bal + gap },
    },
    { sort: { basePriceGem: 1 }, limit: cap },
  );
}

async function listAllAdmin() {
  return shopItemRepository.listAll();
}

async function createShopItem(payload, actorUserId) {
  const skuId = String(payload?.skuId || '').trim();
  if (!skuId) throw AppError.badRequest('skuId bắt buộc');

  if (await shopItemRepository.findBySku(skuId)) {
    throw AppError.conflict(`SKU đã tồn tại: ${skuId}`);
  }
  const row = await shopItemRepository.create({
    skuId,
    nameVi: String(payload?.nameVi || ''),
    descriptionVi: String(payload?.descriptionVi || ''),
    category: String(payload?.category || 'cosmetic').trim(),
    basePriceGem: Number(payload?.basePriceGem) || 0,
    visible: payload?.visible !== false,
    seasonalStartsAt: payload?.seasonalStartsAt ? new Date(payload.seasonalStartsAt) : null,
    seasonalEndsAt: payload?.seasonalEndsAt ? new Date(payload.seasonalEndsAt) : null,
    metadata: payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
  });
  await GemEconomyAuditLog.create({
    actorUserId: String(actorUserId),
    action: 'shop_item_create',
    reason: String(payload?.editNote || 'create ShopItem').slice(0, 2000),
    payload: { skuId },
  });
  return row.toObject();
}

async function updateShopItem(skuId, payload, actorUserId) {
  const sku = String(skuId || '').trim();
  const row = await shopItemRepository.findDocBySku(sku);
  if (!row) throw AppError.notFound('Không tìm thấy SKU');
  const set = {};
  if (payload.nameVi !== undefined) set.nameVi = String(payload.nameVi);
  if (payload.descriptionVi !== undefined) set.descriptionVi = String(payload.descriptionVi);
  if (payload.category !== undefined) set.category = String(payload.category).trim();
  if (payload.basePriceGem !== undefined) set.basePriceGem = Number(payload.basePriceGem) || 0;
  if (payload.visible !== undefined) set.visible = Boolean(payload.visible);
  if (payload.seasonalStartsAt !== undefined) {
    set.seasonalStartsAt = payload.seasonalStartsAt ? new Date(payload.seasonalStartsAt) : null;
  }
  if (payload.seasonalEndsAt !== undefined) {
    set.seasonalEndsAt = payload.seasonalEndsAt ? new Date(payload.seasonalEndsAt) : null;
  }
  if (payload.metadata !== undefined && typeof payload.metadata === 'object') set.metadata = payload.metadata;
  Object.assign(row, set);
  await row.save();

  await GemEconomyAuditLog.create({
    actorUserId: String(actorUserId),
    action: 'shop_item_update',
    reason: String(payload?.editNote || 'update ShopItem').slice(0, 2000),
    payload: { skuId: sku, set },
  });
  return shopItemRepository.findBySku(sku);
}

module.exports = {
  listVisiblePublic,
  listNearbyShopItems,
  listAllAdmin,
  createShopItem,
  updateShopItem,
};
