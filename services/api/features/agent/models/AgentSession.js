const mongoose = require('mongoose');

const agentMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    hasImage: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const agentSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    tier: { type: String, default: 'lp_free' },
    title: { type: String, default: '' },
    messageCount: { type: Number, default: 0 },
    messages: { type: [agentMessageSchema], default: [] },
    lastContext: { type: mongoose.Schema.Types.Mixed, default: null },
    summary: { type: String, default: '' },
  },
  { timestamps: true },
);

agentSessionSchema.index({ userId: 1, sessionId: 1 }, { unique: true });

module.exports =
  mongoose.models.AgentSession || mongoose.model('AgentSession', agentSessionSchema);
