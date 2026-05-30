const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, default: '' },
  content: { type: String, required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  voteCount: { type: Number, default: 0 },
  isHidden: { type: Boolean, default: false },
  hiddenAt: { type: Date, default: null },
  hiddenBy: { type: String, default: null },
  reportCount: { type: Number, default: 0 },
  isHelpful: { type: Boolean, default: false },
  helpfulMarkedBy: { type: String, default: null },
  helpfulMarkedAt: { type: Date, default: null },
}, { timestamps: true });

commentSchema.index({ postId: 1, createdAt: 1 });
commentSchema.index({ authorId: 1 });

module.exports = mongoose.model('Comment', commentSchema);
