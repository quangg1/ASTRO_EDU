const mongoose = require('mongoose');

const moderationWarningSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    issuedBy: { type: String, required: true },
    issuedByName: { type: String, default: '' },
    message: { type: String, required: true },
    relatedReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityReport', default: null },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  },
  { timestamps: true },
);

moderationWarningSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ModerationWarning', moderationWarningSchema);
