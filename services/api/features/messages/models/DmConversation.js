const mongoose = require('mongoose');

const dmConversationSchema = new mongoose.Schema(
  {
    /** Hai userId đã sort, nối bằng ":" — unique */
    participantsKey: { type: String, required: true, unique: true, index: true },
    participantIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length === 2,
        message: 'Conversation requires exactly 2 participants',
      },
    },
    lastMessageAt: { type: Date, default: null, index: true },
    lastMessagePreview: { type: String, trim: true, default: '', maxlength: 280 },
    lastSenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

dmConversationSchema.index({ participantIds: 1, lastMessageAt: -1 });

module.exports = mongoose.model('DmConversation', dmConversationSchema);
