const UserReward = require('../models/UserReward');
const GemTransaction = require('../models/GemTransaction');

const RANGE_MS = {
  '7d': 7 * 86400_000,
  '30d': 30 * 86400_000,
};

async function aggregateSupply() {
  const row = await UserReward.aggregate([
    {
      $group: {
        _id: null,
        gemBalanceSum: { $sum: '$gemBalance' },
        totalGemsEarnedSum: { $sum: '$totalGemsEarned' },
        userCount: { $sum: 1 },
      },
    },
  ]);
  const r = row[0] || {};
  return {
    gemBalanceSum: Math.round(Number(r.gemBalanceSum) || 0),
    totalGemsEarnedLifetimeSum: Math.round(Number(r.totalGemsEarnedSum) || 0),
    userRewardRows: Number(r.userCount) || 0,
  };
}

/**
 * Velocity từ GemTransaction trong cửa sổ milliseconds.
 */
async function velocityWindows(rangeKey = '7d') {
  const windowMs = RANGE_MS[rangeKey] || RANGE_MS['7d'];
  const since = new Date(Date.now() - windowMs);

  const [earnAgg, spendAgg] = await Promise.all([
    GemTransaction.aggregate([
      { $match: { createdAt: { $gte: since }, delta: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalEarn: { $sum: '$delta' },
          count: { $sum: 1 },
        },
      },
    ]),
    GemTransaction.aggregate([
      { $match: { createdAt: { $gte: since }, delta: { $lt: 0 } } },
      {
        $group: {
          _id: null,
          totalSpend: { $sum: { $multiply: ['$delta', -1] } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const days = Math.max(1, windowMs / 86400_000);
  const earned = Number(earnAgg[0]?.totalEarn) || 0;
  const spent = Number(spendAgg[0]?.totalSpend) || 0;

  return {
    range: rangeKey,
    windowSince: since.toISOString(),
    earnTotal: Math.round(earned),
    earnPerDayAvg: Math.round((earned / days) * 100) / 100,
    spendTotal: Math.round(spent),
    spendPerDayAvg: Math.round((spent / days) * 100) / 100,
    earnTxCount: earnAgg[0]?.count || 0,
    spendTxCount: spendAgg[0]?.count || 0,
    earnToSpendRatio: spent > 0 ? Math.round((earned / spent) * 1000) / 1000 : null,
  };
}

/** Top reasons earn/spend (debug balance) */
async function topReasons(rangeKey = '7d', limit = 12) {
  const windowMs = RANGE_MS[rangeKey] || RANGE_MS['7d'];
  const since = new Date(Date.now() - windowMs);
  return GemTransaction.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { reason: '$reason', sign: { $cond: [{ $gt: ['$delta', 0] }, 'earn', 'spend'] } },
        total: { $sum: '$delta' },
        n: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: limit },
  ]);
}

module.exports = {
  aggregateSupply,
  velocityWindows,
  topReasons,
};
