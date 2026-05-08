const mongoose = require('mongoose');

const gemTransactionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    delta: { type: Number, required: true },
    reason: { type: String, required: true, index: true },
    balanceAfter: { type: Number, default: null },
    lessonId: { type: String, default: null, index: true },
    nodeId: { type: String, default: null },
    depth: { type: String, default: null },
    entityId: { type: String, default: null, index: true },
    contentType: { type: String, default: null },
    sessionId: { type: String, default: null, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false },
);

gemTransactionSchema.index({ userId: 1, reason: 1, lessonId: 1, createdAt: -1 });
gemTransactionSchema.index({ userId: 1, reason: 1, entityId: 1 });

module.exports = mongoose.model('GemTransaction', gemTransactionSchema);
