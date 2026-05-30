const mongoose = require('mongoose');

const agentSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    tier: { type: String, default: 'lp_free' },
    messageCount: { type: Number, default: 0 },
    lastContext: { type: mongoose.Schema.Types.Mixed, default: null },
    summary: { type: String, default: '' },
  },
  { timestamps: true },
);

agentSessionSchema.index({ userId: 1, sessionId: 1 }, { unique: true });

module.exports =
  mongoose.models.AgentSession || mongoose.model('AgentSession', agentSessionSchema);
