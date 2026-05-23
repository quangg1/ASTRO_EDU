const mongoose = require('mongoose');

const overrideSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const gemRuntimeConfigSchema = new mongoose.Schema(
  {
    /** Singleton key */
    key: { type: String, required: true, unique: true, default: 'global', trim: true },
    seasonalMultiplier: { type: Number, default: 1, min: 1, max: 3 },
    seasonalEndsAt: { type: Date, default: null },
    weeklyDeepHistoryCap: { type: Number, default: 50 },
    /** SKU shop — giá trong [base * band] khi validate */
    itemPriceOverrides: { type: [overrideSchema], default: [] },
    voucherMaxDiscountPct: { type: Number, default: 20 },
    lastEditedByUserId: { type: String, default: null },
    lastEditedReason: { type: String, default: '' },
  },
  { timestamps: true, minimize: false },
);

module.exports = mongoose.model('GemRuntimeConfig', gemRuntimeConfigSchema);
