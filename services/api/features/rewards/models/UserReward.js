const mongoose = require('mongoose');

const userRewardSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    gemBalance: { type: Number, default: 0, min: 0 },
    /** Server-only progression; never exposed raw to client. */
    totalGemsEarned: { type: Number, default: 0, min: 0 },
    /** Cached derived level (recomputed on earn path). */
    level: { type: Number, default: 1, min: 1 },
    streakDays: { type: Number, default: 0, min: 0 },
    streakShields: { type: Number, default: 0, min: 0 },
    /** UTC calendar day string YYYY-MM-DD of last streak bump */
    lastStreakDay: { type: String, default: '' },
    /** SKU `avatar_decoration` đã mua (sở hữu vĩnh viễn). */
    ownedDecorationSkus: { type: [String], default: [] },
    /** SKU trang trí đang đeo quanh avatar (null = không đeo). */
    equippedDecorationSkuId: { type: String, default: null },
  },
  { timestamps: true, minimize: false },
);

module.exports = mongoose.model('UserReward', userRewardSchema);
