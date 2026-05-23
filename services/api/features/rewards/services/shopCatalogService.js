const ShopItem = require('../models/ShopItem');
const GemEconomyAuditLog = require('../models/GemEconomyAuditLog');
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
  const items = await ShopItem.find({ visible: true, ...extraFilter }).sort({ skuId: 1 }).lean();
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

async function listAllAdmin() {
  return ShopItem.find({}).sort({ updatedAt: -1 }).lean();
}

async function createShopItem(payload, actorUserId) {
  const skuId = String(payload?.skuId || '').trim();
  if (!skuId) {
    const e = new Error('skuId bắt buộc');
    e.status = 400;
    throw e;
  }
  const dup = await ShopItem.findOne({ skuId }).lean();
  if (dup) {
    const e = new Error(`SKU đã tồn tại: ${skuId}`);
    e.status = 409;
    throw e;
  }
  const row = await ShopItem.create({
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
  const row = await ShopItem.findOne({ skuId: sku });
  if (!row) {
    const e = new Error('Không tìm thấy SKU');
    e.status = 404;
    throw e;
  }
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
  return ShopItem.findOne({ skuId: sku }).lean();
}

module.exports = {
  listVisiblePublic,
  listAllAdmin,
  createShopItem,
  updateShopItem,
};
