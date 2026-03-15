const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  targetType: { type: String, enum: ['post', 'comment'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  value: { type: Number, required: true },
}, { timestamps: true });

voteSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
