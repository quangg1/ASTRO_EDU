/**
 * API công khai ví gem cho feature khác (agent economy, checkout burn).
 */
const { userRewardRepository } = require('../repositories/userRewardRepository');
const gemTransactionRepository = require('../repositories/gemTransactionRepository');
const { getWalletLearnerMeta } = require('./learnerTierService');

/** Lịch sử ví chỉ để người học đối chiếu gần đây, không phải sổ cái đầy đủ. */
const WALLET_HISTORY_LIMIT = 40;

function toTransactionView(tx) {
  return {
    id: String(tx._id),
    amount: tx.delta,
    // `type` là tên cũ của `reason`; giữ cả hai cho client chưa cập nhật.
    reason: tx.reason,
    type: tx.reason,
    createdAt: tx.createdAt?.toISOString?.() || new Date().toISOString(),
    meta: {
      lessonId: tx.lessonId || undefined,
      entityId: tx.entityId || undefined,
      depth: tx.depth || undefined,
      postTitle: tx.metadata?.postTitle || undefined,
    },
  };
}

async function getWallet(userId) {
  const [reward, transactions] = await Promise.all([
    userRewardRepository.findForUser(userId),
    gemTransactionRepository.listForUser(userId, { limit: WALLET_HISTORY_LIMIT }),
  ]);

  const totalGemsEarned = reward?.totalGemsEarned ?? 0;
  return {
    balance: reward?.gemBalance ?? 0,
    level: reward?.level ?? 1,
    totalGemsEarned,
    learnerTier: getWalletLearnerMeta(totalGemsEarned),
    transactions: transactions.map(toTransactionView),
  };
}

/** Số dư + tổng gem đã kiếm (agent / checkout quote). */
async function getBalanceSummary(userId) {
  if (!userId) return { gemBalance: 0, totalGemsEarned: 0 };
  const reward = await userRewardRepository.findForUser(userId);
  return {
    gemBalance: reward?.gemBalance ?? 0,
    totalGemsEarned: reward?.totalGemsEarned ?? 0,
    equippedDecorationSkuId: reward?.equippedDecorationSkuId || null,
  };
}

/**
 * Đốt gem trong giao dịch Mongo (checkout voucher). Session-safe.
 * @returns {Promise<{ burned: number, gemBalance?: number }>}
 */
async function burnGemsForCheckout({ userId, gems, reason, metadata, session = null }) {
  const amount = Math.round(Number(gems) || 0);
  if (!userId || amount <= 0) return { burned: 0 };

  const updated = await userRewardRepository.debitIfAffordable(userId, amount, { session });
  if (!updated) {
    const err = new Error('INSUFFICIENT_GEMS_AT_FULFILL');
    err.code = 'INSUFFICIENT_GEMS_AT_FULFILL';
    throw err;
  }

  await gemTransactionRepository.recordSpend({
    userId,
    cost: amount,
    reason: reason || 'course_voucher_checkout',
    balanceAfter: updated.gemBalance,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    session,
  });

  return { burned: amount, gemBalance: updated.gemBalance };
}

module.exports = { getWallet, getBalanceSummary, burnGemsForCheckout };
