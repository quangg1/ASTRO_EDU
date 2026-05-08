const mongoose = require('mongoose');

const userAchievementSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    achievementSlug: { type: String, required: true, index: true },
    unlockedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, minimize: false },
);

userAchievementSchema.index({ userId: 1, achievementSlug: 1 }, { unique: true });

module.exports = mongoose.model('UserAchievement', userAchievementSchema);
