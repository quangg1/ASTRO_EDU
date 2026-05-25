const UserReward = require('../models/UserReward');
const ShopItem = require('../models/ShopItem');
const {
  LEARNER_TIERS,
  getLearnerTierByEarned,
  getLearnerTierProgress,
  compareTierOrder,
  formatTierPublic,
} = require('../constants/learnerTiers');
const { createNotification, pushNotificationRealtime } = require('../../notifications/services/notificationService');

async function grantDecorationSkus(userId, skuIds) {
  const skus = [...new Set((skuIds || []).map(String).filter(Boolean))];
  if (!skus.length) return [];
  const existing = await ShopItem.find({ skuId: { $in: skus }, visible: true }).lean();
  const found = new Set(existing.map((r) => r.skuId));
  const granted = [];
  for (const sku of skus) {
    if (!found.has(sku)) continue;
    await UserReward.updateOne(
      { userId },
      { $addToSet: { ownedDecorationSkus: sku } },
      { upsert: true },
    );
    granted.push(sku);
  }
  return granted;
}

/**
 * Unlock perk khi lên hạng (idempotent qua grantedLearnerTierPerks).
 */
async function grantLearnerTierPerks(userId, tierId) {
  const tierDef = LEARNER_TIERS.find((t) => t.id === tierId);
  if (!tierDef) return { granted: false };

  const ur = await UserReward.findOne({ userId }).select('grantedLearnerTierPerks').lean();
  const done = new Set(ur?.grantedLearnerTierPerks || []);
  if (done.has(tierId)) return { granted: false, reason: 'already' };

  const decorations = await grantDecorationSkus(userId, tierDef.decorationSkus);
  await UserReward.updateOne(
    { userId },
    { $addToSet: { grantedLearnerTierPerks: tierId } },
    { upsert: true },
  );

  return { granted: true, tierId, decorations };
}

async function notifyLearnerTierUp(userId, tierDef) {
  return createNotification({
    userId,
    type: 'system',
    titleVi: `Chúc mừng — bạn là ${tierDef.nameVi} ${tierDef.emoji}`,
    bodyVi: tierDef.taglineVi,
    href: '/gem/tiers',
    metadata: { learnerTierId: tierDef.id },
  });
}

/**
 * Sau khi totalGemsEarned tăng — grant perk + thông báo nếu lên hạng.
 */
async function handleLearnerTierProgression(userId, prevTotal, nextTotal) {
  const prevTier = getLearnerTierByEarned(prevTotal);
  const nextTier = getLearnerTierByEarned(nextTotal);
  if (prevTier.id === nextTier.id) return null;
  if (compareTierOrder(prevTier.id, nextTier.id) >= 0) return null;

  const results = [];
  for (const tier of LEARNER_TIERS) {
    if (compareTierOrder(tier.id, prevTier.id) <= 0) continue;
    if (compareTierOrder(tier.id, nextTier.id) > 0) break;
    results.push(await grantLearnerTierPerks(userId, tier.id));
  }

  const notif = await notifyLearnerTierUp(userId, nextTier);
  if (notif) pushNotificationRealtime(notif);

  return { newTier: formatTierPublic(nextTier), grants: results };
}

function getWalletLearnerMeta(totalGemsEarned) {
  return getLearnerTierProgress(totalGemsEarned);
}

module.exports = {
  grantDecorationSkus,
  grantLearnerTierPerks,
  handleLearnerTierProgression,
  getWalletLearnerMeta,
  getLearnerTierByEarned,
};
