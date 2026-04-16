const mongoose = require('mongoose');

const tutorialSectionSchema = new mongoose.Schema({
  type: { type: String, enum: ['richtext', 'text', 'image', 'video', 'code', 'callout', 'math', 'chart', 'divider'], default: 'text' },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  html: { type: String, default: '' },
  imageUrl: { type: String, default: null },
  videoUrl: { type: String, default: null },
  code: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
  calloutVariant: { type: String, enum: ['info', 'warning', 'tip', 'danger'], default: 'info' },
  caption: { type: String, default: '' },
  latex: { type: String, default: '' },
  chartType: { type: String, enum: ['line', 'bar', 'area', 'pie'], default: 'line' },
  chartData: { type: mongoose.Schema.Types.Mixed, default: [] },
}, { _id: false });

const tutorialCategorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '' },
  order: { type: Number, default: 0 },
}, { _id: true });

const tutorialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  summary: { type: String, default: '' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'TutorialCategory', default: null },
  readTime: { type: Number, default: 5 },
  tags: [{ type: String }],
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  prerequisites: [{ type: String }], // danh sách tutorialSlug cần học trước
  learningObjectives: [{ type: String }],
  sections: [tutorialSectionSchema],
  relatedSlugs: [{ type: String }],
  published: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  /** Giáo viên tạo tutorial */
  authorId: { type: String, default: null },
}, { timestamps: true });

tutorialSchema.index({ categoryId: 1 });
tutorialSchema.index({ published: 1 });
tutorialSchema.index({ authorId: 1 });

const TutorialCategory = mongoose.model('TutorialCategory', tutorialCategorySchema);
const Tutorial = mongoose.model('Tutorial', tutorialSchema);

module.exports = { Tutorial, TutorialCategory };
