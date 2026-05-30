const mongoose = require('mongoose');

/**
 * Append-only audit cho thao tác economy (manual adjust, config change).
 */
const gemEconomyAuditSchema = new mongoose.Schema(
  {
    actorUserId: { type: String, required: true, index: true },
    action: {
      type: String,
      required: true,
      enum: [
        'manual_gem_adjust',
        'runtime_config_patch',
        'shop_item_create',
        'shop_item_update',
        'decoration_category_create',
        'decoration_category_update',
        'decoration_bulk_import',
      ],
      index: true,
    },
    targetUserId: { type: String, default: null, index: true },
    delta: { type: Number, default: null },
    balanceAfter: { type: Number, default: null },
    reason: { type: String, required: true, maxlength: 2000 },
    /** Chi tiết thêm — không chứa PII nhạy cảm */
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false },
);

gemEconomyAuditSchema.index({ createdAt: -1 });

module.exports = mongoose.model('GemEconomyAuditLog', gemEconomyAuditSchema);
