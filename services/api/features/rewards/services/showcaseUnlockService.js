const { AppError } = require('../../../shared/errors');
const showcaseContent = require('../../content3d/services/showcaseContentService');
const { userRewardRepository } = require('../repositories/userRewardRepository');
const { showcaseUnlockRepository } = require('../repositories/showcaseUnlockRepository');
const gemTransactionRepository = require('../repositories/gemTransactionRepository');
const { GEM_SPEND_SHOWCASE } = require('../constants/gemEarn');

const unlockKey = (entityId, contentType) => `${entityId}:${contentType}`;

/** Catalog kèm trạng thái mở khóa: đã mở thì hiển thị giá 0. */
async function getCatalogForUser(userId) {
  const bundle = await showcaseContent.getCatalogBundle();
  if (!bundle) return null;

  const unlocks = await showcaseUnlockRepository.listForUser(userId);
  const unlocked = new Set(unlocks.map((row) => unlockKey(row.entityId, row.contentType)));

  const catalog = bundle.catalog.map((entry) => {
    const id = String(entry.id || '').trim();
    const storyUnlocked = unlocked.has(unlockKey(id, 'story'));
    const orbitUnlocked = unlocked.has(unlockKey(id, 'orbit'));
    return {
      ...entry,
      storyUnlocked,
      orbitUnlocked,
      storyCost: storyUnlocked ? 0 : GEM_SPEND_SHOWCASE.story,
      orbitCost: orbitUnlocked ? 0 : GEM_SPEND_SHOWCASE.orbit,
    };
  });

  return {
    stories: bundle.stories,
    catalog,
    orbits: bundle.orbits,
    updatedAt: bundle.updatedAt || null,
  };
}

async function listUnlockKeys(userId) {
  const rows = await showcaseUnlockRepository.listForUser(userId);
  return { keys: rows.map((row) => unlockKey(row.entityId, row.contentType)) };
}

/** Có ít nhất một unlock (story/orbit/…) cho entity — agent showcase gate. */
async function hasUnlockForEntity(userId, entityId) {
  if (!userId || !entityId) return false;
  const id = String(entityId).trim();
  const rows = await showcaseUnlockRepository.findMany({ userId, entityId: id });
  return rows.length > 0;
}

/** Unlock rows cho một entity (agent economy nearby unlocks). */
function listUnlocksForEntity(userId, entityId) {
  if (!userId || !entityId) return Promise.resolve([]);
  return showcaseUnlockRepository.findMany({
    userId,
    entityId: String(entityId).trim(),
  });
}

async function unlock(userId, { entityId, contentType }) {
  const cost = GEM_SPEND_SHOWCASE[contentType];

  // Người học có thể chưa từng nhận gem nào, ví phải tồn tại trước khi trừ.
  await userRewardRepository.ensureForUser(userId);

  const existing = await showcaseUnlockRepository.findOneForUser({
    userId,
    entityId,
    contentType,
  });
  if (existing) {
    const [reward, content] = await Promise.all([
      userRewardRepository.findForUser(userId),
      showcaseContent.getEntityContent(entityId),
    ]);
    return {
      alreadyUnlocked: true,
      entityId,
      contentType,
      gemBalance: reward?.gemBalance ?? 0,
      content,
    };
  }

  const debited = await userRewardRepository.debitIfAffordable(userId, cost);
  if (!debited) {
    throw new AppError(402, 'INSUFFICIENT_GEMS', 'Không đủ gem để mở khóa');
  }

  await showcaseUnlockRepository.createUnlock({ userId, entityId, contentType, gemCost: cost });
  await gemTransactionRepository.recordSpend({
    userId,
    cost,
    reason: 'showcase_unlock',
    balanceAfter: debited.gemBalance,
    entityId,
    contentType,
  });

  return {
    entityId,
    contentType,
    gemBalance: debited.gemBalance,
    content: await showcaseContent.getEntityContent(entityId),
  };
}

module.exports = {
  getCatalogForUser,
  listUnlockKeys,
  hasUnlockForEntity,
  listUnlocksForEntity,
  unlock,
};
