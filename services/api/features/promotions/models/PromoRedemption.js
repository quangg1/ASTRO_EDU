const mongoose = require('mongoose');

const promoRedemptionSchema = new mongoose.Schema(
  {
    promoCodeId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    code: { type: String, required: true, uppercase: true },
    userId: { type: String, required: true, index: true },
    courseId: { type: String, required: true },
    orderId: { type: String, default: null },
    txnRef: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

promoRedemptionSchema.index({ promoCodeId: 1, userId: 1 });

module.exports = mongoose.model('PromoRedemption', promoRedemptionSchema);
