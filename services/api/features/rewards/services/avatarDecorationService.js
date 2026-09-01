const { AppError } = require('../../../shared/errors');
const { shopItemRepository } = require('../repositories/shopItemRepository');
const { userRewardRepository } = require('../repositories/userRewardRepository');
const gemTransactionRepository = require('../repositories/gemTransactionRepository');
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
  await userRewardRepository.ensureForUser(userId);
  return userRewardRepository.findForUser(userId);
}

const ownedSkus = (reward) =>
  Array.isArray(reward?.ownedDecorationSkus) ? reward.ownedDecorationSkus : [];

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
  const ur = await ensureUserReward(userId);
  const owned = ownedSkus(ur);
  const equippedSkuId = ur?.equippedDecorationSkuId || null;
  let equippedOverlayUrl = null;
  if (equippedSkuId) {
    const item = await shopItemRepository.findBySku(equippedSkuId);
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

/** Chỉ bán được trang trí đang hiển thị và đã có overlay trên CDN. */
async function loadPurchasableDecoration(sku) {
  const item = await shopItemRepository.findVisibleBySku(sku);
  if (!item || !isAvatarDecorationItem(item)) {
    throw AppError.notFound('Không tìm thấy trang trí avatar trong cửa hàng');
  }
  if (!getOverlayUrl(item.metadata)) {
    throw AppError.badRequest('Trang trí chưa có file overlay trên CDN');
  }
  return item;
}

async function purchaseDecoration(userId, skuId) {
  const sku = String(skuId || '').trim();
  if (!sku) throw AppError.badRequest('Thiếu mã trang trí (skuId)');

  const item = await loadPurchasableDecoration(sku);

  const ur = await ensureUserReward(userId);
  if (ownedSkus(ur).includes(sku)) {
    return { alreadyOwned: true, gemBalance: ur?.gemBalance ?? 0, skuId: sku };
  }

  const cfg = await getOrCreateConfigDoc();
  const cost = effectiveGemPrice(item.basePriceGem, sku, cfg.itemPriceOverrides);

  // Trang trí miễn phí (hoặc đang giảm về 0) thì chỉ cần ghi quyền sở hữu.
  if (cost <= 0) {
    const granted = await userRewardRepository.grantDecoration(userId, sku);
    return { alreadyOwned: false, gemBalance: granted?.gemBalance ?? 0, skuId: sku, cost: 0 };
  }

  const updated = await userRewardRepository.debitAndGrantDecoration(userId, sku, cost);
  if (!updated) {
    throw new AppError(402, 'INSUFFICIENT_GEMS', 'Không đủ gem để mua trang trí này');
  }

  await gemTransactionRepository.recordSpend({
    userId,
    cost,
    reason: 'shop_avatar_decoration',
    balanceAfter: updated.gemBalance,
    metadata: { skuId: sku, cost },
  });

  return { alreadyOwned: false, gemBalance: updated.gemBalance, skuId: sku, cost };
}

async function equipDecoration(userId, skuId) {
  const ur = await ensureUserReward(userId);
  const sku = skuId == null || skuId === '' ? null : String(skuId).trim();

  if (!sku) {
    await userRewardRepository.setEquippedDecoration(userId, null);
    return { equippedDecorationSkuId: null, equippedOverlayUrl: null };
  }

  if (!ownedSkus(ur).includes(sku)) {
    throw new AppError(403, 'DECORATION_NOT_OWNED', 'Bạn chưa sở hữu trang trí này');
  }

  const item = await shopItemRepository.findBySku(sku);
  if (!item || !isAvatarDecorationItem(item)) {
    throw AppError.notFound('Trang trí không hợp lệ');
  }
  const overlayUrl = getOverlayUrl(item.metadata);
  if (!overlayUrl) throw AppError.badRequest('Trang trí thiếu file overlay');

  await userRewardRepository.setEquippedDecoration(userId, sku);
  return { equippedDecorationSkuId: sku, equippedOverlayUrl: overlayUrl };
}

/**
 * Overlay + totalGemsEarned cho nhiều user (public profile / author snippets).
 */
async function resolveEquippedOverlaysForUsers(userIds) {
  const ids = [...new Set((userIds || []).map(String).filter(Boolean))];
  const rewards = ids.length
    ? await userRewardRepository.findMany(
        { userId: { $in: ids } },
        { projection: 'userId equippedDecorationSkuId totalGemsEarned' },
      )
    : [];
  const skuIds = [
    ...new Set(rewards.map((r) => r.equippedDecorationSkuId).filter(Boolean)),
  ];
  const items = skuIds.length
    ? await shopItemRepository.findMany({ skuId: { $in: skuIds } })
    : [];
  const overlayBySku = new Map();
  for (const item of items) {
    if (isAvatarDecorationItem(item)) {
      overlayBySku.set(item.skuId, getOverlayUrl(item.metadata));
    }
  }
  const rewardByUser = new Map(rewards.map((r) => [String(r.userId), r]));
  const overlayByUser = new Map();
  for (const uid of ids) {
    const r = rewardByUser.get(uid);
    const sku = r?.equippedDecorationSkuId;
    overlayByUser.set(uid, sku ? overlayBySku.get(sku) || null : null);
  }
  return { rewardByUser, overlayByUser };
}

async function getPublicRewardMeta(userId) {
  const reward = await userRewardRepository.findForUser(userId);
  let equippedOverlayUrl = null;
  const equippedSku = reward?.equippedDecorationSkuId;
  if (equippedSku) {
    const item = await shopItemRepository.findBySku(equippedSku);
    if (item && isAvatarDecorationItem(item)) {
      equippedOverlayUrl = getOverlayUrl(item.metadata);
    }
  }
  return {
    totalGemsEarned: reward?.totalGemsEarned ?? 0,
    equippedDecorationSkuId: equippedSku || null,
    equippedOverlayUrl,
  };
}

module.exports = {
  listDecorationCatalogPublic,
  listDecorationCatalogGroupedPublic,
  getDecorationState,
  purchaseDecoration,
  equipDecoration,
  resolveEquippedOverlaysForUsers,
  getPublicRewardMeta,
  AVATAR_DECORATION_CATEGORY,
};
