const mongoose = require('mongoose');

const userAstronomyEventEngagementSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    eventId: { type: String, required: true, index: true },
    remindedAt: { type: Date, default: null },
    checkedInAt: { type: Date, default: null },
    gemAwardedAt: { type: Date, default: null },
    gemAmount: { type: Number, default: 0 },
    observationPhotoUrl: { type: String, default: null },
  },
  { timestamps: true },
);

userAstronomyEventEngagementSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('UserAstronomyEventEngagement', userAstronomyEventEngagementSchema);
