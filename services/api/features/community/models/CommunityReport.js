const mongoose = require('mongoose');

const communityReportSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: ['post', 'comment'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    reporterId: { type: String, required: true },
    reporterName: { type: String, default: '' },
    reason: { type: String, required: true },
    details: { type: String, default: '' },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
    resolvedBy: { type: String, default: null },
    resolutionNote: { type: String, default: null },
  },
  { timestamps: true },
);

communityReportSchema.index({ status: 1, createdAt: -1 });
communityReportSchema.index({ targetType: 1, targetId: 1 });
communityReportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 });

module.exports = mongoose.model('CommunityReport', communityReportSchema);
