const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  forumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Forum', required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, default: '' },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  courseId: { type: String, default: null },
  courseSlug: { type: String, default: null },
  lessonSlug: { type: String, default: null },
  sourceUrl: { type: String, default: null },
  sourceName: { type: String, default: null },
  publishedAt: { type: Date, default: null },
  imageUrl: { type: String, default: null },
  isCrawled: { type: Boolean, default: false },
  /** Tin từ RSS: chỉ tóm tắt trong app; thẻ tin mở sourceUrl (bài gốc). */
  isExternalArticle: { type: Boolean, default: false },
  /** Từ RSS: thẻ &lt;category&gt;, dc:subject… — dùng filter trong app */
  rssCategories: { type: [String], default: [] },
  voteCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
}, { timestamps: true });

postSchema.index({ forumId: 1, createdAt: -1 });
postSchema.index({ authorId: 1 });
postSchema.index({ isCrawled: 1, publishedAt: -1 });
postSchema.index({ sourceUrl: 1 }, { unique: true, sparse: true });
postSchema.index({ forumId: 1, rssCategories: 1 });

module.exports = mongoose.model('Post', postSchema);
