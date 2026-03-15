const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, default: '' },
  content: { type: String, required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  voteCount: { type: Number, default: 0 },
}, { timestamps: true });

commentSchema.index({ postId: 1, createdAt: 1 });
commentSchema.index({ authorId: 1 });

module.exports = mongoose.model('Comment', commentSchema);
