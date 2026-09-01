const { BaseRepository } = require('../../../shared/db/BaseRepository');
const UserReward = require('../models/UserReward');

/** Ví mới luôn bắt đầu từ 0 gem, cấp 1, chưa có streak. */
const NEW_WALLET_DEFAULTS = {
  gemBalance: 0,
  totalGemsEarned: 0,
  level: 1,
  streakDays: 0,
  streakShields: 0,
  lastStreakDay: '',
};

class UserRewardRepository extends BaseRepository {
  constructor() {
    super(UserReward);
  }

  findForUser(userId) {
    return this.findOne({ userId });
  }

  ensureForUser(userId) {
    return this.model.updateOne(
      { userId },
      { $setOnInsert: { userId, ...NEW_WALLET_DEFAULTS } },
      { upsert: true },
    );
  }

  /**
   * Trừ gem có điều kiện đủ số dư: bộ lọc `$gte` khiến MongoDB tự loại bỏ
   * tình huống hai yêu cầu song song cùng tiêu một số dư.
   */
  debitIfAffordable(userId, cost, { session } = {}) {
    return this.updateOne(
      { userId, gemBalance: { $gte: cost } },
      { $inc: { gemBalance: -cost } },
      { runValidators: false, session: session || undefined },
    );
  }

  /** Trừ gem và ghi quyền sở hữu trong cùng một lệnh để không mất một trong hai. */
  debitAndGrantDecoration(userId, skuId, cost) {
    return this.updateOne(
      { userId, gemBalance: { $gte: cost } },
      { $inc: { gemBalance: -cost }, $addToSet: { ownedDecorationSkus: skuId } },
      { runValidators: false },
    );
  }

  grantDecoration(userId, skuId) {
    return this.updateOne(
      { userId },
      { $addToSet: { ownedDecorationSkus: skuId } },
      { runValidators: false },
    );
  }

  setEquippedDecoration(userId, skuId) {
    return this.model.updateOne({ userId }, { $set: { equippedDecorationSkuId: skuId } });
  }
}

module.exports = { userRewardRepository: new UserRewardRepository(), NEW_WALLET_DEFAULTS };
