const ShopItem = require('../models/ShopItem');
const UserReward = require('../models/UserReward');
const GemTransaction = require('../models/GemTransaction');
const {
  AVATAR_DECORATION_CATEGORY,
  DECORATION_CATEGORY_UNCATEGORIZED,
  isAvatarDecorationItem,
  getOverlayUrl,
  getPreviewUrl,
} = require('../constants/avatarDecoration');
const { getOrCreateConfigDoc, effectiveGemPrice } = require('./gemRuntimeConfigService');
const { listVisiblePublic } = require('./shopCatalogService');
const { listCategoriesPublic } = require('./decorationCategoryService');

async function ensureUserReward(userId) {
  await UserReward.updateOne(
    { userId },
    {
      $setOnInsert: {
        userId,
        gemBalance: 0,
        totalGemsEarned: 0,
        level: 1,
        streakDays: 0,
        streakShields: 0,
        lastStreakDay: '',
        ownedDecorationSkus: [],
        equippedDecorationSkuId: null,
      },
    },
    { upsert: true },
  );
  return UserReward.findOne({ userId }).lean();
}

function mapDecorationRow(row) {
  const meta = row.metadata || {};
  return {
    skuId: row.skuId,
    nameVi: row.nameVi,
    descriptionVi: row.descriptionVi,
    category: row.category,
    basePriceGem: row.basePriceGem,
    effectivePriceGem: row.effectivePriceGem,
    overlayUrl: getOverlayUrl(meta),
    previewUrl: getPreviewUrl(meta),
    sortOrder: Number(meta.sortOrder) || 0,
    decorationCategorySlug: String(meta.decorationCategorySlug || '').trim() || null,
  };
}

async function listDecorationCatalogPublic() {
  const items = await listVisiblePublic({ category: AVATAR_DECORATION_CATEGORY });
  return items
    .filter((row) => getOverlayUrl(row.metadata))
    .map(mapDecorationRow)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.skuId.localeCompare(b.skuId));
}

/** Catalog theo nhóm (Discord-style) — category có banner + lưới item. */
async function listDecorationCatalogGroupedPublic() {
  const [categories, flat] = await Promise.all([listCategoriesPublic(), listDecorationCatalogPublic()]);
  const bySlug = new Map(categories.map((c) => [c.slug, { ...c, items: [] }]));
  const uncategorized = [];

  for (const item of flat) {
    const slug = item.decorationCategorySlug;
    if (slug && bySlug.has(slug)) {
      bySlug.get(slug).items.push(item);
    } else {
      uncategorized.push(item);
    }
  }

  const grouped = [...bySlug.values()]
    .filter((c) => c.visible !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.slug.localeCompare(b.slug));

  if (uncategorized.length > 0) {
    grouped.push({
      slug: DECORATION_CATEGORY_UNCATEGORIZED,
      nameVi: 'Khác',
      subtitleVi: '',
      bannerUrl: '',
      sortOrder: 9999,
      visible: true,
      items: uncategorized,
    });
  }

  return { categories: grouped, items: flat };
}

async function getDecorationState(userId) {
  await ensureUserReward(userId);
  const [ur, cfg] = await Promise.all([UserReward.findOne({ userId }).lean(), getOrCreateConfigDoc()]);
  const owned = Array.isArray(ur?.ownedDecorationSkus) ? ur.ownedDecorationSkus : [];
  const equippedSkuId = ur?.equippedDecorationSkuId || null;
  let equippedOverlayUrl = null;
  if (equippedSkuId) {
    const item = await ShopItem.findOne({ skuId: equippedSkuId }).lean();
    if (item && isAvatarDecorationItem(item)) {
      equippedOverlayUrl = getOverlayUrl(item.metadata);
    }
  }
  const { categories, items } = await listDecorationCatalogGroupedPublic();
  const catalogWithOwned = items.map((row) => ({
    ...row,
    owned: owned.includes(row.skuId),
  }));
  const categoriesWithOwned = categories.map((cat) => ({
    slug: cat.slug,
    nameVi: cat.nameVi,
    subtitleVi: cat.subtitleVi,
    bannerUrl: cat.bannerUrl || '',
    sortOrder: cat.sortOrder || 0,
    items: (cat.items || []).map((row) => ({
      ...row,
      owned: owned.includes(row.skuId),
    })),
  }));
  return {
    gemBalance: ur?.gemBalance ?? 0,
    ownedDecorationSkus: owned,
    equippedDecorationSkuId: equippedSkuId,
    equippedOverlayUrl,
    catalog: catalogWithOwned,
    categories: categoriesWithOwned,
  };
}

async function purchaseDecoration(userId, skuId) {
  const sku = String(skuId || '').trim();
  if (!sku) {
    const e = new Error('Thiếu mã trang trí (skuId)');
    e.status = 400;
    throw e;
  }
  const item = await ShopItem.findOne({ skuId: sku, visible: true }).lean();
  if (!item || !isAvatarDecorationItem(item)) {
    const e = new Error('Không tìm thấy trang trí avatar trong cửa hàng');
    e.status = 404;
    throw e;
  }
  if (!getOverlayUrl(item.metadata)) {
    const e = new Error('Trang trí chưa có file overlay trên CDN');
    e.status = 400;
    throw e;
  }

  await ensureUserReward(userId);
  const ur = await UserReward.findOne({ userId }).lean();
  const owned = Array.isArray(ur?.ownedDecorationSkus) ? ur.ownedDecorationSkus : [];
  if (owned.includes(sku)) {
    return { alreadyOwned: true, gemBalance: ur?.gemBalance ?? 0, skuId: sku };
  }

  const cfg = await getOrCreateConfigDoc();
  const cost = effectiveGemPrice(item.basePriceGem, sku, cfg.itemPriceOverrides);
  if (cost > 0) {
    const updated = await UserReward.findOneAndUpdate(
      { userId, gemBalance: { $gte: cost } },
      {
        $inc: { gemBalance: -cost },
        $addToSet: { ownedDecorationSkus: sku },
      },
      { new: true },
    ).lean();
    if (!updated) {
      const e = new Error('Không đủ gem để mua trang trí này');
      e.status = 402;
      e.code = 'INSUFFICIENT_GEMS';
      throw e;
    }
    await GemTransaction.create({
      userId,
      delta: -cost,
      reason: 'shop_avatar_decoration',
      balanceAfter: updated.gemBalance,
      metadata: { skuId: sku, cost },
    });
    return {
      alreadyOwned: false,
      gemBalance: updated.gemBalance,
      skuId: sku,
      cost,
    };
  }

  const updated = await UserReward.findOneAndUpdate(
    { userId },
    { $addToSet: { ownedDecorationSkus: sku } },
    { new: true },
  ).lean();
  return { alreadyOwned: false, gemBalance: updated?.gemBalance ?? 0, skuId: sku, cost: 0 };
}

async function equipDecoration(userId, skuId) {
  await ensureUserReward(userId);
  const sku = skuId == null || skuId === '' ? null : String(skuId).trim();
  if (!sku) {
    await UserReward.updateOne({ userId }, { $set: { equippedDecorationSkuId: null } });
    return { equippedDecorationSkuId: null, equippedOverlayUrl: null };
  }
  const ur = await UserReward.findOne({ userId }).lean();
  const owned = Array.isArray(ur?.ownedDecorationSkus) ? ur.ownedDecorationSkus : [];
  if (!owned.includes(sku)) {
    const e = new Error('Bạn chưa sở hữu trang trí này');
    e.status = 403;
    e.code = 'DECORATION_NOT_OWNED';
    throw e;
  }
  const item = await ShopItem.findOne({ skuId: sku }).lean();
  if (!item || !isAvatarDecorationItem(item)) {
    const e = new Error('Trang trí không hợp lệ');
    e.status = 404;
    throw e;
  }
  const overlayUrl = getOverlayUrl(item.metadata);
  if (!overlayUrl) {
    const e = new Error('Trang trí thiếu file overlay');
    e.status = 400;
    throw e;
  }
  await UserReward.updateOne({ userId }, { $set: { equippedDecorationSkuId: sku } });
  return { equippedDecorationSkuId: sku, equippedOverlayUrl: overlayUrl };
}

module.exports = {
  listDecorationCatalogPublic,
  listDecorationCatalogGroupedPublic,
  getDecorationState,
  purchaseDecoration,
  equipDecoration,
  AVATAR_DECORATION_CATEGORY,
};
