const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  courseId: { type: String, required: true, index: true },
  courseSlug: { type: String, required: true },
  /** Lớp theo kỳ học viên chọn khi checkout — sau thanh toán tự gán + email mã. */
  cohortId: { type: String, default: null, index: true },
  /** Số tiền thu (sau giảm giá voucher gem). */
  amount: { type: Number, required: true },
  listPrice: { type: Number, default: 0 },
  discountPct: { type: Number, default: 0, min: 0, max: 15 },
  discountAmount: { type: Number, default: 0, min: 0 },
  voucherTierId: { type: String, default: null },
  promoCodeId: { type: String, default: null, index: true },
  promoCode: { type: String, default: null },
  learnerTierId: { type: String, default: null },
  /** promo | gem_voucher | learner_tier | none */
  discountSource: {
    type: String,
    enum: ['promo', 'gem_voucher', 'learner_tier', 'none'],
    default: 'none',
  },
  /** Gem sẽ trừ khi đơn completed (0 = không dùng voucher). */
  gemsCommitted: { type: Number, default: 0, min: 0 },
  gemsBurnedAt: { type: Date, default: null },
  currency: { type: String, default: 'VND' },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending', index: true },
  gateway: { type: String, enum: ['demo', 'card', 'vnpay', 'momo'], default: 'demo' },
  transactionId: { type: String, default: null },
  txnRef: { type: String, required: true, unique: true },
  returnUrl: { type: String, default: null },
  paidAt: { type: Date, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

orderSchema.index({ userId: 1, courseId: 1 });
module.exports = mongoose.model('Order', orderSchema);
