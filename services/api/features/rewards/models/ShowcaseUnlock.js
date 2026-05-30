const mongoose = require('mongoose');

const showcaseUnlockSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    contentType: { type: String, required: true, enum: ['story', 'orbit'] },
    gemCost: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, minimize: false },
);

showcaseUnlockSchema.index({ userId: 1, entityId: 1, contentType: 1 }, { unique: true });

module.exports = mongoose.model('ShowcaseUnlock', showcaseUnlockSchema);
