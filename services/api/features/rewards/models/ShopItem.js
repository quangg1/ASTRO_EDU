const mongoose = require('mongoose');

/**
 * Tier-3 catalog — cosmetic, LP convenience, seasonal, vouchers (SKU).
 * Visibility + seasonal windows; không thay GEM_EARN base.
 */
const shopItemSchema = new mongoose.Schema(
  {
    skuId: { type: String, required: true, unique: true, trim: true, index: true },
    nameVi: { type: String, default: '' },
    descriptionVi: { type: String, default: '' },
    /** cosmetic | lp_convenience | showcase_unlock | voucher | seasonal | coach_burst | agent (reserved) */
    category: { type: String, required: true, trim: true, index: true },
    basePriceGem: { type: Number, required: true, min: 0 },
    visible: { type: Boolean, default: true, index: true },
    seasonalStartsAt: { type: Date, default: null },
    seasonalEndsAt: { type: Date, default: null },
    /** Section F/E policy: chỉ passive data; enforce ở service khi grant */
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false },
);

shopItemSchema.index({ visible: 1, category: 1 });

module.exports = mongoose.model('ShopItem', shopItemSchema);
