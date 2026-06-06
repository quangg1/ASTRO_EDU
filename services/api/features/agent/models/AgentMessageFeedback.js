const mongoose = require('mongoose');

const agentMessageFeedbackSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, default: '', index: true },
    messageId: { type: String, default: '' },
    rating: { type: Number, enum: [-1, 1], required: true },
    comment: { type: String, trim: true, default: '', maxlength: 500 },
    surface: { type: String, default: '' },
    lessonId: { type: String, default: '' },
    cacheEntryId: { type: String, default: '' },
  },
  { timestamps: true },
);

agentMessageFeedbackSchema.index({ userId: 1, createdAt: -1 });

module.exports =
  mongoose.models.AgentMessageFeedback ||
  mongoose.model('AgentMessageFeedback', agentMessageFeedbackSchema);
