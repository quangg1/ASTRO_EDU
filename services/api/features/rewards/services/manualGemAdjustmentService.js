const UserReward = require('../models/UserReward');
const GemTransaction = require('../models/GemTransaction');
const GemEconomyAuditLog = require('../models/GemEconomyAuditLog');
const { RUNTIME_CONFIG_BOUNDS } = require('../constants/gemEarn');

/** Trùng logic rewardEngine — tránh circular import */
function computeLevel(totalGemsEarned) {
  const t = Math.max(0, Number(totalGemsEarned) || 0);
  return Math.max(1, Math.min(50, Math.floor(Math.sqrt(t / 25)) + 1));
}

/**
 * Điều chỉnh gem thủ công (admin). Không tăng totalGemsEarned khi trừ.
 */
async function applyManualGemAdjustment({ actorUserId, targetUserId, delta, reason }) {
  const d = Math.trunc(Number(delta));
  if (!targetUserId || !Number.isFinite(d) || d === 0) {
    const err = new Error('targetUserId và delta (khác 0) là bắt buộc');
    err.status = 400;
    throw err;
  }
  const r = String(reason || '').trim();
  if (r.length < 3) {
    const err = new Error('reason bắt buộc (≥3 ký tự)');
    err.status = 400;
    throw err;
  }

  const cap = RUNTIME_CONFIG_BOUNDS.manualAdjustMaxGemPerAction;
  if (Math.abs(d) > cap) {
    const err = new Error(
      `Một lần điều chỉnh tối đa ±${cap} gem (vượt cần quy trình phê duyệt phụ)`,
    );
    err.status = 400;
    err.code = 'GEM_ADJUST_CAP';
    throw err;
  }

  await UserReward.updateOne(
    { userId: targetUserId },
    {
      $setOnInsert: {
        userId: targetUserId,
        streakShields: 0,
        lastStreakDay: '',
        streakDays: 0,
        level: 1,
        totalGemsEarned: 0,
        gemBalance: 0,
      },
    },
    { upsert: true },
  );

  const prev = await UserReward.findOne({ userId: targetUserId }).lean();
  const nextBalance = (prev?.gemBalance ?? 0) + d;
  if (nextBalance < 0) {
    const err = new Error('Số dư không đủ để trừ');
    err.status = 400;
    err.code = 'INSUFFICIENT_GEMS';
    throw err;
  }

  const inc = { gemBalance: d };
  if (d > 0) {
    inc.totalGemsEarned = d;
  }

  const updated = await UserReward.findOneAndUpdate(
    { userId: targetUserId },
    { $inc: inc },
    { new: true },
  ).lean();

  const nextLevel = computeLevel(updated.totalGemsEarned ?? 0);
  if (nextLevel !== (updated.level ?? 1)) {
    await UserReward.updateOne({ userId: targetUserId }, { $set: { level: nextLevel } });
  }

  await GemTransaction.create({
    userId: targetUserId,
    delta: d,
    reason: 'admin_manual_adjust',
    balanceAfter: updated.gemBalance,
    metadata: { actorUserId },
  });

  await GemEconomyAuditLog.create({
    actorUserId: String(actorUserId),
    action: 'manual_gem_adjust',
    targetUserId: String(targetUserId),
    delta: d,
    balanceAfter: updated.gemBalance,
    reason: r.slice(0, 2000),
    payload: { prevBalance: prev?.gemBalance ?? 0 },
  });

  return updated;
}

module.exports = {
  applyManualGemAdjustment,
};
