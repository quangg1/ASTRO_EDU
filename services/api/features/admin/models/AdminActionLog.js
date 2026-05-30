const mongoose = require('mongoose');

const adminActionLogSchema = new mongoose.Schema(
  {
    actorUserId: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    targetType: {
      type: String,
      enum: ['user', 'order', 'enrollment', 'cohort_enrollment', 'course', 'system', 'moderation'],
      required: true,
      index: true,
    },
    targetId: { type: String, default: null, index: true },
    reason: { type: String, required: true, maxlength: 2000 },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false },
);

adminActionLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminActionLog', adminActionLogSchema);
