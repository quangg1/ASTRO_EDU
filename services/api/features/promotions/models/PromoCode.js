const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    labelVi: { type: String, default: '' },
    descriptionVi: { type: String, default: '' },
    discountType: { type: String, enum: ['percent', 'fixed'], required: true },
    /** percent: 1–100; fixed: số tiền theo currency khóa học */
    discountValue: { type: Number, required: true, min: 0 },
    /** Rỗng = áp dụng mọi khóa trả phí */
    courseIds: { type: [String], default: [] },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    maxRedemptions: { type: Number, default: null, min: 1 },
    redemptionCount: { type: Number, default: 0, min: 0 },
    maxPerUser: { type: Number, default: 1, min: 1 },
    active: { type: Boolean, default: true, index: true },
    /** Event / campaign — hiển thị banner khi có bannerTitleVi */
    eventKey: { type: String, default: null, trim: true },
    bannerTitleVi: { type: String, default: '' },
    bannerBodyVi: { type: String, default: '' },
    bannerAccentColor: { type: String, default: '#06b6d4' },
  },
  { timestamps: true },
);

promoCodeSchema.index({ active: 1, endsAt: 1, startsAt: 1 });

module.exports = mongoose.model('PromoCode', promoCodeSchema);
