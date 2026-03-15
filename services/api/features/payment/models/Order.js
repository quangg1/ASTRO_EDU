const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  courseId: { type: String, required: true, index: true },
  courseSlug: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'VND' },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending', index: true },
  gateway: { type: String, enum: ['vnpay', 'momo'], default: 'vnpay' },
  transactionId: { type: String, default: null },
  txnRef: { type: String, required: true, unique: true },
  returnUrl: { type: String, default: null },
  paidAt: { type: Date, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

orderSchema.index({ userId: 1, courseId: 1 });
orderSchema.index({ txnRef: 1 });

module.exports = mongoose.model('Order', orderSchema);
